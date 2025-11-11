/**
 * Sites Service
 * Manages anime streaming site data and availability tracking
 * Modern architecture implementation with proper error handling and caching
 */

export class SitesService {
    /**
     * @param {StorageService} storage - Storage service for site availability
     * @param {HttpClient} httpClient - HTTP client for loading sites data
     * @param {Logger} logger - Logger instance
     */
    constructor({ storage, httpClient, logger }) {
        this.storage = storage;
        this.httpClient = httpClient;
        this.logger = logger;
        this.cachedSites = null;
        this.STORAGE_KEY = 'anime_site_availability';
    }

    /**
     * Load sites from sites.json
     * @returns {Promise<Array>} Array of site objects
     */
    async loadSites() {
        if (this.cachedSites) {
            return this.cachedSites;
        }

        try {
            const data = await this.httpClient.get('data/sites.json');
            this.cachedSites = data.sites || [];
            this.logger.info(`Loaded ${this.cachedSites.length} streaming sites`);
            return this.cachedSites;
        } catch (error) {
            this.logger.error('Failed to load sites:', error);
            return [];
        }
    }

    /**
     * Get all streaming sites
     * @returns {Promise<Array>} Array of site objects
     */
    async getSites() {
        return await this.loadSites();
    }

    /**
     * Normalize anime title for URL construction
     * Removes special characters, converts to lowercase, replaces spaces with hyphens
     * @param {string} title - Anime title
     * @returns {string} Normalized title
     */
    normalizeAnimeTitle(title) {
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
    constructSiteUrl(siteName, siteUrl, animeTitle, searchPattern = null) {
        const normalized = this.normalizeAnimeTitle(animeTitle);
        const encoded = encodeURIComponent(animeTitle);
        const baseUrl = siteUrl.replace(/\/$/, '');

        // If searchPattern is explicitly null or empty, return base URL only
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

        // Legacy fallback for sites without searchPattern
        return this._tryCommonSearchPatterns(baseUrl, encoded, siteName);
    }

    /**
     * Try common anime streaming site search patterns
     * @param {string} baseUrl - Base URL without trailing slash
     * @param {string} encodedTitle - URL-encoded anime title
     * @param {string} siteName - Site name for pattern matching
     * @returns {string} URL with most common pattern
     * @private
     */
    _tryCommonSearchPatterns(baseUrl, encodedTitle, siteName) {
        switch (siteName.toLowerCase()) {
            case 'aniwave':
                return `https://aniwave.at/catalog?search=${encodedTitle}&type=anime`;
            case 'hianime':
                return `https://hianime.to/search?keyword=${encodedTitle}`;
            case 'crunchyroll':
            case 'hidive':
                return `${baseUrl}/search?q=${encodedTitle}`;
            default:
                // Most common pattern
                return `${baseUrl}/search?q=${encodedTitle}`;
        }
    }

    /**
     * Clear cached sites (useful for testing or forcing reload)
     */
    clearCache() {
        this.cachedSites = null;
        this.logger.info('Cleared sites cache');
    }

    // ============================================
    // Site Availability Tracking
    // ============================================

    /**
     * Get site availability data from storage
     * @returns {Object} Map of showId -> array of available site names
     * @private
     */
    _getSiteAvailability() {
        const data = this.storage.get(this.STORAGE_KEY);
        return data || {};
    }

    /**
     * Save site availability data to storage
     * @param {Object} data - Map of showId -> array of available site names
     * @private
     */
    _saveSiteAvailability(data) {
        this.storage.set(this.STORAGE_KEY, data);
    }

    /**
     * Get available sites for a specific show
     * @param {string} showId - Show ID
     * @returns {Array<string>} Array of site names where show is available
     */
    getAvailableSitesForShow(showId) {
        const availability = this._getSiteAvailability();
        const storedSites = availability[showId] || [];

        // Filter out sites that are no longer in sites.json
        if (this.cachedSites && storedSites.length > 0) {
            const validSiteNames = this.cachedSites.map(site => site.name.toLowerCase());
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
    isShowAvailableOnSite(showId, siteName) {
        const availableSites = this.getAvailableSitesForShow(showId);
        return availableSites.includes(siteName.toLowerCase());
    }

    /**
     * Toggle site availability for a show
     * @param {string} showId - Show ID
     * @param {string} siteName - Site name
     * @returns {boolean} New availability state
     */
    toggleSiteAvailability(showId, siteName) {
        const availability = this._getSiteAvailability();
        const normalizedSite = siteName.toLowerCase();

        if (!availability[showId]) {
            availability[showId] = [];
        }

        const index = availability[showId].indexOf(normalizedSite);

        if (index > -1) {
            // Remove site
            availability[showId].splice(index, 1);
            this.logger.info(`Removed site "${siteName}" for show ${showId}`);
        } else {
            // Add site
            availability[showId].push(normalizedSite);
            this.logger.info(`Added site "${siteName}" for show ${showId}`);
        }

        this._saveSiteAvailability(availability);
        return index === -1; // Return true if now available, false if removed
    }

    /**
     * Set available sites for a show
     * @param {string} showId - Show ID
     * @param {Array<string>} siteNames - Array of site names
     */
    setAvailableSites(showId, siteNames) {
        const availability = this._getSiteAvailability();
        availability[showId] = siteNames.map(s => s.toLowerCase());
        this._saveSiteAvailability(availability);
        this.logger.info(`Set ${siteNames.length} available sites for show ${showId}`);
    }

    /**
     * Clear all site availability data
     */
    clearSiteAvailability() {
        this.storage.remove(this.STORAGE_KEY);
        this.logger.info('Cleared all site availability data');
    }

    /**
     * Clean up storage by removing references to sites that no longer exist
     * Call this after loading sites to ensure data integrity
     * @returns {Promise<number>} Number of stale references removed
     */
    async cleanupStaleSiteReferences() {
        const sites = await this.getSites();
        const validSiteNames = sites.map(site => site.name.toLowerCase());
        const availability = this._getSiteAvailability();

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
            this._saveSiteAvailability(availability);
            this.logger.info(`Cleaned up ${removedCount} stale site references`);
        }

        return removedCount;
    }
}

// ============================================
// Standalone Helper Functions (for compatibility)
// ============================================

/**
 * Get sites service instance from global container
 * @returns {SitesService|null} Sites service instance or null if not available
 * @private
 */
function _getSitesServiceInstance() {
    if (typeof window !== 'undefined' && window._container) {
        try {
            return window._container.get('sitesService');
        } catch (error) {
            console.error('Failed to get sitesService from container:', error);
            return null;
        }
    }
    return null;
}

/**
 * Get all streaming sites (standalone function for compatibility)
 * @returns {Promise<Array>} Array of site objects
 */
export async function getSites() {
    const service = _getSitesServiceInstance();
    if (service) {
        return await service.getSites();
    }
    console.warn('SitesService not available, returning empty array');
    return [];
}

/**
 * Construct site URL (standalone function for compatibility)
 * @param {string} siteName - Site name
 * @param {string} siteUrl - Base site URL
 * @param {string} animeTitle - Anime title
 * @param {string|null} searchPattern - Search pattern
 * @returns {string} Constructed URL
 */
export function constructSiteUrl(siteName, siteUrl, animeTitle, searchPattern = null) {
    const service = _getSitesServiceInstance();
    if (service) {
        return service.constructSiteUrl(siteName, siteUrl, animeTitle, searchPattern);
    }
    console.warn('SitesService not available, returning base URL');
    return siteUrl;
}

/**
 * Get available sites for show (standalone function for compatibility)
 * @param {string} showId - Show ID
 * @returns {Array<string>} Array of available site names
 */
export function getAvailableSitesForShow(showId) {
    const service = _getSitesServiceInstance();
    if (service) {
        return service.getAvailableSitesForShow(showId);
    }
    console.warn('SitesService not available, returning empty array');
    return [];
}

/**
 * Toggle site availability (standalone function for compatibility)
 * @param {string} showId - Show ID
 * @param {string} siteName - Site name
 * @returns {boolean} New availability state
 */
export function toggleSiteAvailability(showId, siteName) {
    const service = _getSitesServiceInstance();
    if (service) {
        return service.toggleSiteAvailability(showId, siteName);
    }
    console.warn('SitesService not available, cannot toggle');
    return false;
}

/**
 * Clean up stale site references (standalone function for compatibility)
 * @returns {Promise<number>} Number of stale references removed
 */
export async function cleanupStaleSiteReferences() {
    const service = _getSitesServiceInstance();
    if (service) {
        return await service.cleanupStaleSiteReferences();
    }
    console.warn('SitesService not available, skipping cleanup');
    return 0;
}
