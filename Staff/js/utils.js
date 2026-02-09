/* ============================================================
   ELDEROS STAFF PANEL - UTILITIES
   ============================================================ */
console.log('[Utils] Loading utils.js...');

const Utils = {
    /**
     * Format a number with commas
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Format a number as compact (1.2k, 1.5M, etc.)
     */
    formatCompact(num) {
        if (num === null || num === undefined) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    },

    /**
     * Format a date to relative time (2 hours ago, etc.)
     */
    formatRelativeTime(date) {
        if (!date) return 'Never';

        const now = new Date();
        const then = new Date(date);
        const diff = now - then;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        if (weeks < 4) return `${weeks}w ago`;
        if (months < 12) return `${months}mo ago`;
        return `${years}y ago`;
    },

    /**
     * Format a date to full string
     */
    formatDate(date, options = {}) {
        if (!date) return 'N/A';

        const d = new Date(date);
        const defaults = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        return d.toLocaleDateString('en-US', { ...defaults, ...options });
    },

    /**
     * Format duration in minutes to human readable
     */
    formatDuration(minutes) {
        if (minutes === -1 || minutes === null) return 'Permanent';
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`;

        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''}`;

        const months = Math.floor(days / 30);
        return `${months} month${months !== 1 ? 's' : ''}`;
    },

    /**
     * Format remaining time from expiry date
     */
    formatTimeRemaining(expiryDate) {
        if (!expiryDate) return 'Permanent';

        const now = new Date();
        const expiry = new Date(expiryDate);
        const diff = expiry - now;

        if (diff <= 0) return 'Expired';

        const minutes = Math.floor(diff / (1000 * 60));
        return this.formatDuration(minutes);
    },

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Truncate string with ellipsis
     */
    truncate(str, maxLength = 50) {
        if (!str || str.length <= maxLength) return str || '';
        return str.slice(0, maxLength - 3) + '...';
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Generate a unique ID
     */
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },

    /**
     * Get query parameters from URL
     */
    getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    /**
     * Set query parameter in URL
     */
    setQueryParam(key, value) {
        const url = new URL(window.location);
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
        window.history.replaceState({}, '', url);
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    },

    /**
     * Create an element with attributes
     */
    createElement(tag, attributes = {}, children = []) {
        const el = document.createElement(tag);

        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'innerHTML') {
                el.innerHTML = value;
            } else if (key === 'textContent') {
                el.textContent = value;
            } else if (key.startsWith('on')) {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
            } else if (key === 'dataset') {
                Object.assign(el.dataset, value);
            } else {
                el.setAttribute(key, value);
            }
        }

        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                el.appendChild(child);
            }
        });

        return el;
    },

    /**
     * Simple templating function
     */
    template(str, data) {
        return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data.hasOwnProperty(key) ? this.escapeHtml(data[key]) : match;
        });
    },

    /**
     * Get role badge HTML (legacy)
     */
    getRoleBadge(role) {
        const config = CONFIG.ROLES[role];
        if (!config) return '';

        const colorClass = `badge-${role.toLowerCase()}`;
        return `<span class="badge ${colorClass}">${config.label}</span>`;
    },

    /**
     * Staff rank icon mapping
     */
    STAFF_RANK_ICONS: {
        'OWNER': 'OWNER.png',
        'DEVELOPER': 'DEVELOPER.png',
        'MANAGER': 'MANAGER.png',
        'ADMINISTRATOR': 'ADMIN.png',
        'HEAD_MODERATOR': 'MOD.png',
        'MODERATOR': 'MOD.png',
        'SUPPORT': 'SUPPORT.png',
        'YOUTUBER': 'YOUTUBER.png'
    },

    /**
     * Staff rank badge CSS classes
     */
    STAFF_RANK_CLASSES: {
        'OWNER': 'owner',
        'DEVELOPER': 'developer',
        'ADMINISTRATOR': 'admin',
        'MODERATOR': 'mod',
        'SUPPORT': 'support',
        'PLAYER': 'member'
    },

    /**
     * Donator rank badge CSS classes
     */
    DONATOR_RANK_CLASSES: {
        'ASCENDANT': 'ascendant',
        'ONYX': 'onyx',
        'DIAMOND': 'diamond',
        'RUBY': 'ruby',
        'EMERALD': 'emerald',
        'SAPPHIRE': 'sapphire',
        'NONE': 'member'
    },

    /**
     * Render a staff rank badge with icon
     * @param {string} staffRole - OWNER, DEVELOPER, ADMINISTRATOR, etc.
     * @param {boolean} showIcon - Whether to show the icon
     * @returns {string} HTML for the badge
     */
    renderStaffBadge(staffRole, showIcon = true) {
        if (!staffRole || staffRole === 'NONE' || staffRole === 'PLAYER') {
            return '';
        }

        const roleUpper = staffRole.toUpperCase();
        const badgeClass = this.STAFF_RANK_CLASSES[roleUpper] || 'member';
        const label = this.capitalize(staffRole.replace('_', ' '));
        const iconFile = this.STAFF_RANK_ICONS[roleUpper];

        let iconHtml = '';
        if (showIcon && iconFile) {
            iconHtml = `<img src="assets/staff-ranks/${iconFile}" alt="${label}" class="rank-badge-icon">`;
        }

        return `<span class="rank-badge rank-badge-${badgeClass}">${iconHtml}${label}</span>`;
    },

    /**
     * Render a donator rank badge with icon
     * @param {string} donatorRank - ASCENDANT, ONYX, DIAMOND, etc.
     * @param {boolean} showIcon - Whether to show the icon
     * @returns {string} HTML for the badge
     */
    renderDonatorBadge(donatorRank, showIcon = true) {
        if (!donatorRank || donatorRank === 'NONE') {
            return '';
        }

        const rankUpper = donatorRank.toUpperCase();
        const badgeClass = this.DONATOR_RANK_CLASSES[rankUpper] || 'member';
        const label = this.capitalize(donatorRank);

        let iconHtml = '';
        if (showIcon) {
            iconHtml = `<img src="assets/donator-ranks/${rankUpper}.png" alt="${label}" class="rank-badge-icon">`;
        }

        return `<span class="rank-badge rank-badge-${badgeClass}">${iconHtml}${label}</span>`;
    },

    /**
     * Render both staff and donator badges for a player
     * @param {string} staffRole - Staff role or null
     * @param {string} donatorRank - Donator rank or null
     * @param {boolean} showIcons - Whether to show icons
     * @returns {string} HTML for both badges
     */
    renderPlayerBadges(staffRole, donatorRank, showIcons = true) {
        let html = '';

        // Staff badge first (if staff)
        if (staffRole && staffRole !== 'NONE' && staffRole !== 'PLAYER') {
            html += this.renderStaffBadge(staffRole, showIcons);
        }

        // Donator badge (if donator)
        if (donatorRank && donatorRank !== 'NONE') {
            html += this.renderDonatorBadge(donatorRank, showIcons);
        }

        // If neither, show member
        if (!html) {
            html = `<span class="rank-badge rank-badge-member">Member</span>`;
        }

        return html;
    },

    /**
     * Get status badge HTML
     */
    getStatusBadge(status, online = false) {
        if (online) {
            return `<span class="badge badge-success">Online</span>`;
        }

        const statusMap = {
            ACTIVE: { class: 'badge-success', label: 'Active' },
            BANNED: { class: 'badge-error', label: 'Banned' },
            MUTED: { class: 'badge-warning', label: 'Muted' },
            JAILED: { class: 'badge-info', label: 'Jailed' }
        };

        const config = statusMap[status] || { class: '', label: status || 'Unknown' };
        return `<span class="badge ${config.class}">${config.label}</span>`;
    },

    /**
     * Get punishment type badge HTML
     */
    getPunishmentBadge(type) {
        const config = CONFIG.PUNISHMENT_TYPES[type];
        if (!config) return `<span class="badge">${type}</span>`;

        const style = `background-color: ${config.color}20; color: ${config.color}`;
        return `<span class="badge" style="${style}">${config.label}</span>`;
    },

    /**
     * Simple local storage cache
     */
    cache: {
        get(key) {
            try {
                const item = localStorage.getItem(`cache_${key}`);
                if (!item) return null;

                const { value, expiry } = JSON.parse(item);
                if (expiry && Date.now() > expiry) {
                    this.remove(key);
                    return null;
                }

                return value;
            } catch (e) {
                return null;
            }
        },

        set(key, value, ttl = 0) {
            try {
                const item = {
                    value,
                    expiry: ttl > 0 ? Date.now() + ttl : null
                };
                localStorage.setItem(`cache_${key}`, JSON.stringify(item));
            } catch (e) {
                console.warn('Cache set failed:', e);
            }
        },

        remove(key) {
            localStorage.removeItem(`cache_${key}`);
        },

        clear() {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
            keys.forEach(k => localStorage.removeItem(k));
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
