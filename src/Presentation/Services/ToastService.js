/**
 * ToastService.js
 * Service for displaying toast notifications
 * Manages toast queue and lifecycle
 */

export class ToastService {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.nextId = 1;
        this.defaultDuration = 3000; // 3 seconds
    }

    /**
     * Initialize the toast container
     */
    init() {
        if (this.container) {
            return;
        }

        this.container = document.getElementById('toast-container');
        if (!this.container) {
            console.warn('Toast container not found in DOM');
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (0 for persistent)
     * @returns {number} Toast ID
     */
    show(message, type = 'info', duration = this.defaultDuration) {
        this.init();

        if (!this.container) {
            console.warn('Cannot show toast: container not found');
            return -1;
        }

        const id = this.nextId++;
        const toast = this.createToast(id, message, type);

        this.container.appendChild(toast);
        this.toasts.push({ id, element: toast });

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast--show');
        });

        // Auto-dismiss if duration > 0
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, duration);
        }

        return id;
    }

    /**
     * Create a toast element
     * @param {number} id - Toast ID
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @returns {HTMLElement} Toast element
     */
    createToast(id, message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.dataset.toastId = id;

        toast.innerHTML = `
            <div class="toast__content">
                <span class="toast__message">${this.escapeHtml(message)}</span>
                <button class="toast__close" aria-label="Close">×</button>
            </div>
        `;

        // Add close button handler
        const closeBtn = toast.querySelector('.toast__close');
        closeBtn.addEventListener('click', () => {
            this.dismiss(id);
        });

        return toast;
    }

    /**
     * Dismiss a toast
     * @param {number} id - Toast ID
     */
    dismiss(id) {
        const toastIndex = this.toasts.findIndex(t => t.id === id);
        if (toastIndex === -1) {
            return;
        }

        const toast = this.toasts[toastIndex];
        toast.element.classList.remove('toast--show');

        // Remove from DOM after animation
        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.toasts.splice(toastIndex, 1);
        }, 300); // Match CSS transition duration
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        const toastIds = this.toasts.map(t => t.id);
        toastIds.forEach(id => this.dismiss(id));
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Convenience methods
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}
