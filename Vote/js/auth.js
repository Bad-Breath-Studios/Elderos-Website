/**
 * Elderos Vote Page — Authentication
 * JWT auth via /api/auth/login (username + password) with optional 2FA step.
 */
const Auth = {
    _tempToken: null,
    _pendingUsername: null,

    getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    },

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        } catch {
            return false;
        }
    },

    async login(username, password) {
        const res = await fetch(`${CONFIG.API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success && data.token) {
            localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
            return { success: true };
        }

        // 2FA required — store temp token for verification step
        if (data.requires2FA && data.tempToken) {
            this._tempToken = data.tempToken;
            this._pendingUsername = username;
            return { success: false, requires2FA: true };
        }

        return { success: false, message: data.message || 'Invalid credentials' };
    },

    async verify2FA(code) {
        if (!this._tempToken) {
            return { success: false, message: 'No pending 2FA session. Please log in again.' };
        }

        const res = await fetch(`${CONFIG.API_BASE}/api/auth/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken: this._tempToken, code }),
        });
        const data = await res.json();

        if (data.success && data.token) {
            localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
            this._tempToken = null;
            this._pendingUsername = null;
            return { success: true };
        }

        return { success: false, message: data.message || 'Invalid 2FA code' };
    },

    logout() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        this._tempToken = null;
        this._pendingUsername = null;
        window.location.reload();
    },

    getUsername() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.username || payload.sub || null;
        } catch {
            return null;
        }
    },
};
