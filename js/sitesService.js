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
 * Construct search URL for a specific site
 * @param {string} siteName - Site name (Aniwave, hianime, Crunchyroll, hidive)
 * @param {string} siteUrl - Base site URL
 * @param {string} animeTitle - Anime title to search for
 * @returns {string} Constructed URL
 */
export function constructSiteUrl(siteName, siteUrl, animeTitle) {
    const normalized = normalizeAnimeTitle(animeTitle);
    const encoded = encodeURIComponent(animeTitle);

    // Site-specific URL patterns (based on actual site URLs)
    switch (siteName.toLowerCase()) {
        case 'aniwave':
            // Aniwave search pattern: /catalog?search=title&type=anime
            return `https://aniwave.at/catalog?search=${encoded}&type=anime`;

        case 'hianime':
            // hianime search pattern: /search?keyword=title
            return `https://hianime.to/search?keyword=${encoded}`;

        case 'crunchyroll':
            // Crunchyroll search pattern: /search?q=title
            return `${siteUrl.replace(/\/$/, '')}/search?q=${encoded}`;

        case 'hidive':
            // hidive uses DCE search API: search.dce-prod.dicelaboratory.com/search?query=title&timezone=...
            // Note: timezone is America/New_York (URL encoded as America%2FNew_York)
            return `https://search.dce-prod.dicelaboratory.com/search?query=${encoded}&timezone=America%2FNew_York`;

        default:
            // Fallback: just return the base URL
            return siteUrl;
    }
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
    return availability[showId] || [];
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
