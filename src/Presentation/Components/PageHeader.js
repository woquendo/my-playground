/**
 * PageHeader.js
 * Reusable modern page header component
 * Follows SOLID principles with consistent styling
 */

export class PageHeader {
    /**
     * Render the page header
     * @param {Object} options - Component configuration
     * @param {string} options.title - Page title
     * @param {string} options.subtitle - Page subtitle
     * @param {string} options.icon - Page icon emoji
     * @param {Array} options.actions - Optional action buttons/filters
     * @returns {string} HTML string
     */
    render({ title, subtitle, icon, actions = [] }) {
        return `
            <div class="page-header">
                <div class="page-header__main">
                    ${icon ? `<div class="page-header__icon" aria-hidden="true">${icon}</div>` : ''}
                    <div class="page-header__text">
                        <h1 class="page-header__title">${this._escapeHtml(title)}</h1>
                        ${subtitle ? `<p class="page-header__subtitle">${this._escapeHtml(subtitle)}</p>` : ''}
                    </div>
                </div>
                ${actions.length > 0 ? this._renderActions(actions) : ''}
            </div>
        `;
    }

    /**
     * Render action items
     * @param {Array} actions - Array of action configurations
     * @returns {string} HTML string
     * @private
     */
    _renderActions(actions) {
        return `
            <div class="page-header__actions">
                ${actions.map(action => this._renderAction(action)).join('')}
            </div>
        `;
    }

    /**
     * Render a single action
     * @param {Object} action - Action configuration
     * @returns {string} HTML string
     * @private
     */
    _renderAction(action) {
        if (action.type === 'search') {
            return `
                <div class="page-header__search">
                    <input 
                        type="text" 
                        class="page-header__search-input" 
                        id="${action.id}"
                        placeholder="${action.placeholder || 'Search...'}"
                        aria-label="${action.ariaLabel || 'Search'}"
                    />
                    <span class="page-header__search-icon" aria-hidden="true">🔍</span>
                </div>
            `;
        }

        if (action.type === 'select') {
            return `
                <div class="page-header__filter">
                    <label class="page-header__filter-label" for="${action.id}">
                        ${action.label ? this._escapeHtml(action.label) : ''}
                    </label>
                    <select class="page-header__select" id="${action.id}" aria-label="${action.ariaLabel || action.label}">
                        ${action.options.map(opt => `
                            <option value="${opt.value}" ${opt.selected ? 'selected' : ''}>
                                ${this._escapeHtml(opt.label)}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }

        if (action.type === 'button') {
            return `
                <button 
                    class="page-header__button ${action.primary ? 'page-header__button--primary' : ''}" 
                    id="${action.id}"
                    aria-label="${action.ariaLabel || action.label}"
                >
                    ${action.icon ? `<span aria-hidden="true">${action.icon}</span>` : ''}
                    ${this._escapeHtml(action.label)}
                </button>
            `;
        }

        return '';
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
