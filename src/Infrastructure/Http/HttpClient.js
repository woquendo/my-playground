/**
 * HTTP Client
 * Reusable HTTP client with error handling, retry logic, and JSON parsing
 */
import { NetworkError } from '../../Core/Errors/ApplicationErrors.js';

export class HttpClient {
    /**
     * Create an HTTP client
     * @param {object} options - Configuration options
     * @param {string} options.baseUrl - Base URL for all requests
     * @param {number} options.timeout - Request timeout in milliseconds
     * @param {number} options.retries - Number of retry attempts
     * @param {object} options.headers - Default headers
     */
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || '';
        this.timeout = options.timeout || 30000;
        this.retries = options.retries || 3;
        this.defaultHeaders = options.headers || {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Perform a GET request
     * @param {string} url - Request URL (relative to baseUrl or absolute)
     * @param {object} options - Request options
     * @returns {Promise<any>} Parsed response data
     */
    async get(url, options = {}) {
        return this._request('GET', url, null, options);
    }

    /**
     * Perform a POST request
     * @param {string} url - Request URL
     * @param {any} data - Request body data
     * @param {object} options - Request options
     * @returns {Promise<any>} Parsed response data
     */
    async post(url, data, options = {}) {
        return this._request('POST', url, data, options);
    }

    /**
     * Perform a PUT request
     * @param {string} url - Request URL
     * @param {any} data - Request body data
     * @param {object} options - Request options
     * @returns {Promise<any>} Parsed response data
     */
    async put(url, data, options = {}) {
        return this._request('PUT', url, data, options);
    }

    /**
     * Perform a DELETE request
     * @param {string} url - Request URL
     * @param {object} options - Request options
     * @returns {Promise<any>} Parsed response data
     */
    async delete(url, options = {}) {
        return this._request('DELETE', url, null, options);
    }

    /**
     * Perform an HTTP request with retry logic
     * @private
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {any} data - Request body data
     * @param {object} options - Request options
     * @returns {Promise<any>} Parsed response data
     */
    async _request(method, url, data, options = {}) {
        const fullUrl = this._buildUrl(url);
        const headers = { ...this.defaultHeaders, ...(options.headers || {}) };

        let lastError;
        const maxAttempts = options.retries !== undefined ? options.retries : this.retries;

        for (let attempt = 0; attempt <= maxAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const fetchOptions = {
                    method,
                    headers,
                    signal: controller.signal
                };

                if (data && method !== 'GET') {
                    fetchOptions.body = JSON.stringify(data);
                }

                const response = await fetch(fullUrl, fetchOptions);
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`, {
                        context: {
                            status: response.status,
                            statusText: response.statusText,
                            url: fullUrl,
                            method
                        }
                    });
                }

                // Handle empty responses
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return null;
                }

                return await response.json();

            } catch (error) {
                lastError = error;

                // Don't retry on client errors (4xx)
                if (error instanceof NetworkError && error.context?.status >= 400 && error.context?.status < 500) {
                    throw error;
                }

                // Don't retry if explicitly disabled
                if (attempt === maxAttempts) {
                    break;
                }

                // Wait before retrying (exponential backoff)
                await this._wait(Math.pow(2, attempt) * 1000);
            }
        }

        // All retries failed
        throw new NetworkError(`Request failed after ${maxAttempts + 1} attempts: ${lastError.message}`, {
            url: fullUrl,
            method,
            attempts: maxAttempts + 1,
            originalError: lastError
        });
    }

    /**
     * Build full URL from relative path
     * @private
     * @param {string} url - URL path
     * @returns {string} Full URL
     */
    _buildUrl(url) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `${this.baseUrl}${url}`;
    }

    /**
     * Wait for specified milliseconds
     * @private
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set default header
     * @param {string} name - Header name
     * @param {string} value - Header value
     */
    setHeader(name, value) {
        this.defaultHeaders[name] = value;
    }

    /**
     * Remove default header
     * @param {string} name - Header name
     */
    removeHeader(name) {
        delete this.defaultHeaders[name];
    }

    /**
     * Get current configuration
     * @returns {object} Configuration object
     */
    getConfig() {
        return {
            baseUrl: this.baseUrl,
            timeout: this.timeout,
            retries: this.retries,
            headers: { ...this.defaultHeaders }
        };
    }
}
