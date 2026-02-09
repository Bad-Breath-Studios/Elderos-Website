/**
 * Elderos Vote Page — Authentication
 * Simple JWT auth via /api/auth/login (username + password).
 */
const Auth = {
    getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    },

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        // Check expiry from JWT payload
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

        // 2FA required
        if (data.requires2FA) {
            return { success: false, requires2FA: true, message: 'Two-factor authentication is not supported on the vote page. Please disable 2FA or use the launcher.' };
        }

        return { success: false, message: data.message || 'Invalid credentials' };
    },

    logout() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
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
