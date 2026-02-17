/* ============================================================
   ELDEROS STAFF PANEL - AUTHENTICATION
   ============================================================ */
console.log('[Auth] Loading auth.js...');

const Auth = {
    // Current session data
    _session: null,
    _validationInterval: null,

    // Device token storage key
    DEVICE_TOKEN_KEY: 'elderos_staff_device_token',

    /**
     * Initialize auth state from storage
     */
    init() {
        const stored = localStorage.getItem(CONFIG.SESSION_KEY);
        if (stored) {
            try {
                this._session = JSON.parse(stored);
            } catch (e) {
                this.clearSession();
            }
        }
    },

    /**
     * Get stored device token
     */
    getDeviceToken() {
        return localStorage.getItem(this.DEVICE_TOKEN_KEY);
    },

    /**
     * Save device token
     */
    saveDeviceToken(token) {
        if (token) {
            localStorage.setItem(this.DEVICE_TOKEN_KEY, token);
        }
    },

    /**
     * Clear device token (on logout or IP change)
     */
    clearDeviceToken() {
        localStorage.removeItem(this.DEVICE_TOKEN_KEY);
    },

    /**
     * Check if device is remembered
     * @returns {Promise<{remembered: boolean, rememberCredentials: boolean, remember2fa: boolean, username?: string}>}
     */
    async checkRemembered() {
        const deviceToken = this.getDeviceToken();
        if (!deviceToken) {
            return { remembered: false, rememberCredentials: false, remember2fa: false };
        }

        try {
            const response = await API.auth.checkRemembered(deviceToken);
            return response;
        } catch (error) {
            // If check fails, assume not remembered
            return { remembered: false, rememberCredentials: false, remember2fa: false };
        }
    },

    /**
     * Get current token
     */
    getToken() {
        return this._session?.token || localStorage.getItem(CONFIG.TOKEN_KEY);
    },

    /**
     * Get current session
     */
    getSession() {
        return this._session;
    },

    /**
     * Get current user
     */
    getUser() {
        return this._session?.user || null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Check if user has a specific permission
     */
    hasPermission(permission) {
        const user = this.getUser();
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
    },

    /**
     * Check if user has any of the given permissions
     */
    hasAnyPermission(permissions) {
        return permissions.some(p => this.hasPermission(p));
    },

    /**
     * Check if user has all of the given permissions
     */
    hasAllPermissions(permissions) {
        return permissions.every(p => this.hasPermission(p));
    },

    /**
     * Aggregate: can manage bans (any ban-related permission)
     */
    canManageBans() {
        return this.hasAnyPermission([
            CONFIG.PERMISSIONS.TEMP_BAN,
            CONFIG.PERMISSIONS.PERM_BAN,
            CONFIG.PERMISSIONS.IP_BAN,
            CONFIG.PERMISSIONS.UNBAN
        ]);
    },

    /**
     * Aggregate: can manage mutes
     */
    canManageMutes() {
        return this.hasAnyPermission([
            CONFIG.PERMISSIONS.MUTE_PLAYER,
            CONFIG.PERMISSIONS.UNMUTE_PLAYER
        ]);
    },

    /**
     * Aggregate: can manage notes
     */
    canManageNotes() {
        return this.hasAnyPermission([
            CONFIG.PERMISSIONS.ADD_NOTE,
            CONFIG.PERMISSIONS.DELETE_NOTE
        ]);
    },

    /**
     * Check if logged-in user is Ashpire (owner account)
     */
    isAshpire() {
        const user = this.getUser();
        return user && user.accountId === CONFIG.ASHPIRE_ACCOUNT_ID;
    },

    /**
     * Check if user has a role at or above the specified level
     */
    hasRoleLevel(minLevel) {
        const user = this.getUser();
        if (!user || !user.role) return false;
        const roleConfig = CONFIG.ROLES[user.role];
        return roleConfig && roleConfig.level >= minLevel;
    },

    /**
     * Get user's role color
     */
    getRoleColor() {
        const user = this.getUser();
        if (!user || !user.role) return '#6b7280';
        return CONFIG.ROLES[user.role]?.color || '#6b7280';
    },

    /**
     * Get user's Discord avatar URL
     */
    getAvatarUrl() {
        const user = this.getUser();
        if (!user) return null;

        // Use pre-built avatar URL if available
        if (user.avatarUrl) {
            return user.avatarUrl;
        }

        // Fall back to constructing from discordAvatarHash
        if (user.discordId && user.discordAvatarHash) {
            const ext = user.discordAvatarHash.startsWith('a_') ? 'gif' : 'png';
            return `${CONFIG.DISCORD_CDN}/avatars/${user.discordId}/${user.discordAvatarHash}.${ext}?size=${CONFIG.DISCORD_AVATAR_SIZE}`;
        }

        // Default avatar
        if (user.discordId) {
            const index = (BigInt(user.discordId) >> 22n) % 6n;
            return `${CONFIG.DISCORD_CDN}/embed/avatars/${index}.png`;
        }

        return null;
    },

    /**
     * Save session to storage
     */
    saveSession(session) {
        this._session = session;
        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
        if (session.token) {
            localStorage.setItem(CONFIG.TOKEN_KEY, session.token);
        }
    },

    /**
     * Clear session from storage
     */
    clearSession() {
        this._session = null;
        localStorage.removeItem(CONFIG.SESSION_KEY);
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        this.stopValidation();
        if (typeof SessionManager !== 'undefined') SessionManager.destroy();
    },

    /**
     * Start periodic session validation
     */
    startValidation() {
        if (this._validationInterval) return;

        this._validationInterval = setInterval(async () => {
            try {
                await API.auth.validate();
            } catch (error) {
                if (error.status === 401) {
                    this.clearSession();
                    window.location.href = 'index.html';
                }
            }
        }, CONFIG.SESSION_CHECK_INTERVAL);
    },

    /**
     * Stop periodic session validation
     */
    stopValidation() {
        if (this._validationInterval) {
            clearInterval(this._validationInterval);
            this._validationInterval = null;
        }
    },

    /**
     * Perform login (Step 1)
     * @param {string} username
     * @param {string} password
     * @param {boolean} rememberCredentials - Remember credentials for 30 days
     * @returns {Promise<{success: boolean, username: string, step: 'session_key'|'2fa', skip2fa: boolean}>}
     */
    async login(username, password, rememberCredentials = false) {
        const deviceToken = this.getDeviceToken();
        const response = await API.auth.login(username, password, rememberCredentials, deviceToken);
        return response;
    },

    /**
     * Verify 2FA (Step 2)
     * @param {string} username - Username from step 1
     * @param {string} code - 6-digit 2FA code
     * @param {boolean} remember2fa - Remember 2FA for 30 days
     * @returns {Promise<{success: boolean, step: 'session_key'}>}
     */
    async verify2FA(username, code, remember2fa = false) {
        const response = await API.auth.verify2FA(username, code, remember2fa);
        return response;
    },

    /**
     * Verify daily session key (Step 3)
     * @param {string} username - Username from earlier steps
     * @param {string} sessionKey - Daily session key
     * @returns {Promise<{success: boolean, token: string, user: object, deviceToken?: string}>}
     */
    async verifySessionKey(username, sessionKey) {
        const response = await API.auth.verifySessionKey(username, sessionKey);

        // Save device token if returned (for remember me)
        if (response.deviceToken) {
            this.saveDeviceToken(response.deviceToken);
        }

        // Final step - save the session
        this.saveSession({
            token: response.token,
            user: response.user
        });

        this.startValidation();
        return response;
    },

    /**
     * Logout
     */
    async logout() {
        try {
            await API.auth.logout();
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }
        this.clearSession();
        window.location.href = 'index.html';
    },

    /**
     * Validate current session on page load
     */
    async validateSession() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            const response = await API.auth.validate();

            // Update user data if returned
            if (response.user) {
                this._session.user = response.user;
                this.saveSession(this._session);
            }

            this.startValidation();
            return true;
        } catch (error) {
            // Only clear session on explicit auth failures (401/403)
            // Network errors, timeouts, and server errors should not destroy a potentially valid session
            if (error.status === 401 || error.status === 403) {
                this.clearSession();
                return false;
            }

            // For non-auth errors (network, timeout, 5xx), keep session — periodic validation will retry
            this.startValidation();
            return true;
        }
    },

    /**
     * Require authentication - redirect to login if not authenticated
     */
    async requireAuth() {
        const isValid = await this.validateSession();
        if (!isValid) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    /**
     * Require specific permission
     */
    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            Toast.error('Access Denied', 'You do not have permission to perform this action.');
            return false;
        }
        return true;
    }
};

// Initialize on load
Auth.init();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
