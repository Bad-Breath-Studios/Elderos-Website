/* ============================================================
   ELDEROS STAFF PANEL - SESSION MANAGER
   Handles idle timeout, warning modal, and draft protection.
   ============================================================ */
console.log('[SessionManager] Loading session-manager.js...');

const SessionManager = {
    // Internal state
    _lastActivity: Date.now(),
    _checkInterval: null,
    _countdownInterval: null,
    _warningShown: false,
    _warningTimeout: null,
    _activityThrottled: false,
    _initialized: false,
    _drafts: new Map(), // key -> { module, dataFn }
    _boundOnActivity: null,

    // ==================== LIFECYCLE ====================

    /**
     * Initialize session manager. Call after auth succeeds.
     */
    init() {
        if (this._initialized) return;
        this._initialized = true;
        this._lastActivity = Date.now();

        this._setupActivityListeners();
        this._startChecking();

        console.log('[SessionManager] Initialized — idle timeout:', CONFIG.SESSION_IDLE_TIMEOUT_MS / 60000, 'min');
    },

    /**
     * Cleanup all intervals and listeners.
     */
    destroy() {
        this._stopChecking();
        this._removeActivityListeners();
        this._dismissWarning();
        this._drafts.clear();
        this._initialized = false;
        console.log('[SessionManager] Destroyed');
    },

    // ==================== ACTIVITY TRACKING ====================

    _setupActivityListeners() {
        this._boundOnActivity = this._onActivity.bind(this);
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(evt => document.addEventListener(evt, this._boundOnActivity, { passive: true }));
    },

    _removeActivityListeners() {
        if (!this._boundOnActivity) return;
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(evt => document.removeEventListener(evt, this._boundOnActivity));
        this._boundOnActivity = null;
    },

    /**
     * Throttled activity handler — updates _lastActivity at most every THROTTLE_MS.
     */
    _onActivity() {
        if (this._activityThrottled) return;
        this._activityThrottled = true;
        this._lastActivity = Date.now();

        setTimeout(() => {
            this._activityThrottled = false;
        }, CONFIG.SESSION_ACTIVITY_THROTTLE_MS);
    },

    // ==================== TIMEOUT CHECKING ====================

    _startChecking() {
        if (this._checkInterval) return;
        // Check every 60 seconds
        this._checkInterval = setInterval(() => this._checkTimeout(), 60000);
    },

    _stopChecking() {
        if (this._checkInterval) {
            clearInterval(this._checkInterval);
            this._checkInterval = null;
        }
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
    },

    _checkTimeout() {
        const idle = Date.now() - this._lastActivity;
        const timeoutMs = CONFIG.SESSION_IDLE_TIMEOUT_MS;
        const warningMs = timeoutMs - CONFIG.SESSION_WARNING_BEFORE_MS;

        if (idle >= timeoutMs) {
            // Timed out
            this._handleTimeout();
        } else if (idle >= warningMs && !this._warningShown) {
            // Show warning
            this._showWarning();
        }
    },

    // ==================== WARNING MODAL ====================

    _showWarning() {
        if (this._warningShown) return;
        this._warningShown = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'sessionWarningOverlay';
        overlay.className = 'session-warning-overlay';

        const hasDrafts = this.hasDrafts();
        const draftNotice = hasDrafts
            ? `<div class="session-warning-drafts">Unsaved drafts will be preserved if you are logged out.</div>`
            : '';

        overlay.innerHTML = `
            <div class="session-warning-card">
                <div class="session-warning-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                </div>
                <div class="session-warning-title">Session Expiring</div>
                <div class="session-warning-message">
                    Your session will expire due to inactivity.
                </div>
                <div class="session-warning-countdown" id="sessionCountdown">--:--</div>
                ${draftNotice}
                <div class="session-warning-actions">
                    <button class="btn btn-primary" id="sessionStayBtn">Stay Logged In</button>
                    <button class="btn btn-secondary" id="sessionLogoutBtn">Logout</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Activate with animation frame for transition
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // Button handlers
        document.getElementById('sessionStayBtn').addEventListener('click', () => {
            this.extendSession();
        });
        document.getElementById('sessionLogoutBtn').addEventListener('click', () => {
            this._handleTimeout();
        });

        // Start countdown
        this._startCountdown();
    },

    _startCountdown() {
        const updateCountdown = () => {
            const remaining = CONFIG.SESSION_IDLE_TIMEOUT_MS - (Date.now() - this._lastActivity);
            const el = document.getElementById('sessionCountdown');
            if (!el) return;

            if (remaining <= 0) {
                el.textContent = '0:00';
                this._handleTimeout();
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        updateCountdown();
        this._countdownInterval = setInterval(updateCountdown, 1000);
    },

    _dismissWarning() {
        this._warningShown = false;
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
        const overlay = document.getElementById('sessionWarningOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    },

    // ==================== TIMEOUT HANDLER ====================

    _handleTimeout() {
        console.log('[SessionManager] Session timed out');
        this._saveDraftsToStorage();
        this._stopChecking();
        this._dismissWarning();
        // Use Auth.logout() which will redirect
        Auth.logout();
    },

    // ==================== EXTEND SESSION ====================

    /**
     * User clicked "Stay Logged In" — reset activity timer and dismiss warning.
     */
    extendSession() {
        this._lastActivity = Date.now();
        this._dismissWarning();
        console.log('[SessionManager] Session extended by user');
    },

    // ==================== DRAFT PROTECTION ====================

    /**
     * Register a draft source. The dataFn should return current draft data or null if no draft.
     * @param {string} key - Unique key (e.g., 'player_edit_123')
     * @param {Function} dataFn - Returns serializable data or null
     */
    registerDraft(key, dataFn) {
        this._drafts.set(key, dataFn);
    },

    /**
     * Remove a draft registration (on save/cancel).
     * Also clears any stored draft for this key.
     */
    clearDraft(key) {
        this._drafts.delete(key);
        this.clearStoredDraft(key);
    },

    /**
     * Check if there are any registered draft sources with actual data.
     */
    hasDrafts() {
        for (const [key, dataFn] of this._drafts) {
            try {
                const data = dataFn();
                if (data !== null && data !== undefined) return true;
            } catch (e) {
                // ignore
            }
        }
        return false;
    },

    /**
     * Save all draft data to sessionStorage before logout.
     */
    _saveDraftsToStorage() {
        for (const [key, dataFn] of this._drafts) {
            try {
                const data = dataFn();
                if (data !== null && data !== undefined) {
                    sessionStorage.setItem('elderos_draft_' + key, JSON.stringify(data));
                    console.log('[SessionManager] Draft saved:', key);
                }
            } catch (e) {
                console.warn('[SessionManager] Failed to save draft:', key, e);
            }
        }
    },

    /**
     * Get stored draft data (call on module init to check for restored drafts).
     * @param {string} key
     * @returns {object|null} Parsed draft data or null
     */
    getDraftData(key) {
        try {
            const raw = sessionStorage.getItem('elderos_draft_' + key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    },

    /**
     * Clear a stored draft after it has been restored or discarded.
     * @param {string} key
     */
    clearStoredDraft(key) {
        sessionStorage.removeItem('elderos_draft_' + key);
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}
