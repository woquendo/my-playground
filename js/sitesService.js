/**
 * Sites Service
 * Manages anime streaming site data
 */

let cachedSites = null;

/**
 * Load sites from sites.json
 * @returns {Promise<Array>} Array of site objects
 */
export async function loadSites() {
    if (cachedSites) {
        return cachedSites;
    }

    try {
        const response = await fetch('data/sites.json');
        if (!response.ok) {
            throw new Error(`Failed to load sites: ${response.statusText}`);
        }

        const data = await response.json();
        cachedSites = data.sites || [];
        return cachedSites;
    } catch (error) {
        console.error('Error loading sites:', error);
        return [];
    }
}

/**
 * Get all streaming sites
 * @returns {Promise<Array>} Array of site objects
 */
export async function getSites() {
    return await loadSites();
}

/**
 * Normalize anime title for URL construction
 * Removes special characters, converts to lowercase, replaces spaces with hyphens
 * @param {string} title - Anime title
 * @returns {string} Normalized title
 */
export function normalizeAnimeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
}

/**
 * Construct search URL for a specific site using searchPattern from site config
 * @param {string} siteName - Site name
 * @param {string} siteUrl - Base site URL
 * @param {string} animeTitle - Anime title to search for
 * @param {string|null} [searchPattern] - Optional search pattern with placeholders (from site config)
 *                                        Set to null or empty string to return base URL only
 * @returns {string} Constructed URL
 */
export function constructSiteUrl(siteName, siteUrl, animeTitle, searchPattern = null) {
    const normalized = normalizeAnimeTitle(animeTitle);
    const encoded = encodeURIComponent(animeTitle);
    const baseUrl = siteUrl.replace(/\/$/, '');

    // If searchPattern is explicitly null or empty, return base URL only
    // This is useful for sites with complex search (POST requests, GraphQL, etc.)
    if (searchPattern === null || searchPattern === '') {
        return baseUrl;
    }

    // If searchPattern is provided (and not null/empty), use it
    if (searchPattern) {
        const pattern = searchPattern
            .replace('{encoded}', encoded)
            .replace('{normalized}', normalized)
            .replace('{query}', encoded)
            .replace('{title}', encoded);

        return `${baseUrl}${pattern}`;
    }

    // Legacy fallback for sites without searchPattern (backwards compatibility)
    switch (siteName.toLowerCase()) {
        case 'aniwave':
            return `https://aniwave.at/catalog?search=${encoded}&type=anime`;

        case 'hianime':
            return `https://hianime.to/search?keyword=${encoded}`;

        case 'crunchyroll':
            return `${baseUrl}/search?q=${encoded}`;

        case 'hidive':
            return `${baseUrl}/search?q=${encoded}`;

        default:
            // Smart fallback: try common anime site patterns
            return tryCommonSearchPatterns(baseUrl, encoded);
    }
}

/**
 * Try common anime streaming site search patterns
 * @param {string} baseUrl - Base URL without trailing slash
 * @param {string} encodedTitle - URL-encoded anime title
 * @returns {string} URL with most common pattern
 * @private
 */
function tryCommonSearchPatterns(baseUrl, encodedTitle) {
    // Most common patterns in order of popularity:
    // 1. /search?q=title (most common)
    // 2. /search?keyword=title
    // 3. /catalog?search=title
    // For now, default to most common pattern
    return `${baseUrl}/search?q=${encodedTitle}`;
}

/**
 * Clear cached sites (useful for testing or forcing reload)
 */
export function clearCache() {
    cachedSites = null;
}

// ============================================
// Site Availability Tracking (localStorage)
// ============================================

const STORAGE_KEY = 'anime_site_availability';

/**
 * Get site availability data from localStorage
 * @returns {Object} Map of showId -> array of available site names
 */
function getSiteAvailability() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Error reading site availability from localStorage:', error);
        return {};
    }
}

/**
 * Save site availability data to localStorage
 * @param {Object} data - Map of showId -> array of available site names
 */
function saveSiteAvailability(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving site availability to localStorage:', error);
    }
}

/**
 * Get available sites for a specific show
 * @param {string} showId - Show ID
 * @returns {Array<string>} Array of site names where show is available
 */
export function getAvailableSitesForShow(showId) {
    const availability = getSiteAvailability();
    const storedSites = availability[showId] || [];

    // Filter out sites that are no longer in sites.json
    // This prevents showing stale site references
    if (cachedSites && storedSites.length > 0) {
        const validSiteNames = cachedSites.map(site => site.name.toLowerCase());
        return storedSites.filter(siteName => validSiteNames.includes(siteName));
    }

    return storedSites;
}

/**
 * Check if a show is available on a specific site
 * @param {string} showId - Show ID
 * @param {string} siteName - Site name
 * @returns {boolean} True if show is marked as available on site
 */
export function isShowAvailableOnSite(showId, siteName) {
    const availableSites = getAvailableSitesForShow(showId);
    return availableSites.includes(siteName.toLowerCase());
}

/**
 * Toggle site availability for a show
 * @param {string} showId - Show ID
 * @param {string} siteName - Site name
 * @returns {boolean} New availability state
 */
export function toggleSiteAvailability(showId, siteName) {
    const availability = getSiteAvailability();
    const normalizedSite = siteName.toLowerCase();

    if (!availability[showId]) {
        availability[showId] = [];
    }

    const index = availability[showId].indexOf(normalizedSite);

    if (index > -1) {
        // Remove site
        availability[showId].splice(index, 1);
    } else {
        // Add site
        availability[showId].push(normalizedSite);
    }

    saveSiteAvailability(availability);
    return index === -1; // Return true if now available, false if removed
}

/**
 * Set available sites for a show
 * @param {string} showId - Show ID
 * @param {Array<string>} siteNames - Array of site names
 */
export function setAvailableSites(showId, siteNames) {
    const availability = getSiteAvailability();
    availability[showId] = siteNames.map(s => s.toLowerCase());
    saveSiteAvailability(availability);
}

/**
 * Clear all site availability data (for testing)
 */
export function clearSiteAvailability() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clean up localStorage by removing references to sites that no longer exist in sites.json
 * Call this after loading sites to ensure data integrity
 * @returns {Promise<number>} Number of stale references removed
 */
export async function cleanupStaleSiteReferences() {
    const sites = await getSites();
    const validSiteNames = sites.map(site => site.name.toLowerCase());
    const availability = getSiteAvailability();

    let removedCount = 0;

    // Iterate through all shows and filter their site lists
    for (const showId in availability) {
        const originalSites = availability[showId];
        const filteredSites = originalSites.filter(siteName => {
            const isValid = validSiteNames.includes(siteName);
            if (!isValid) removedCount++;
            return isValid;
        });

        availability[showId] = filteredSites;
    }

    // Save cleaned data
    if (removedCount > 0) {
        saveSiteAvailability(availability);
        console.log(`Cleaned up ${removedCount} stale site references from localStorage`);
    }

    return removedCount;
}
