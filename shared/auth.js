/**
 * Elderos — Shared Authentication
 * Unified JWT auth used across all public pages (Home, Play, Hiscores, Vote).
 * Stores both the JWT token and the account object from the login response.
 */
const Auth = (() => {
    const TOKEN_KEY = 'elderos_token';
    const USER_KEY = 'elderos_user';

    // Vote page used a different key — migrate it
    const OLD_VOTE_KEY = 'elderos_vote_token';
    if (localStorage.getItem(OLD_VOTE_KEY) && !localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(TOKEN_KEY, localStorage.getItem(OLD_VOTE_KEY));
        localStorage.removeItem(OLD_VOTE_KEY);
    }

    const API_BASE = (() => {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:')
            return 'http://localhost:8084';
        return 'https://api.elderos.io';
    })();

    function decodePayload(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    }

    function getToken() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        const payload = decodePayload(token);
        if (!payload || payload.exp * 1000 <= Date.now()) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            return null;
        }
        return token;
    }

    function getUser() {
        if (!getToken()) return null;
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function isLoggedIn() {
        return getToken() !== null;
    }

    function storeLogin(token, account) {
        localStorage.setItem(TOKEN_KEY, token);
        if (account) localStorage.setItem(USER_KEY, JSON.stringify(account));
        // Clean up old Vote key
        localStorage.removeItem(OLD_VOTE_KEY);
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(OLD_VOTE_KEY);
        window.location.reload();
    }

    function getAuthHeader() {
        const token = getToken();
        return token ? { Authorization: 'Bearer ' + token } : {};
    }

    function getUsername() {
        const user = getUser();
        if (user && user.username) return user.username;
        const token = getToken();
        if (!token) return null;
        const payload = decodePayload(token);
        return payload ? (payload.username || payload.sub || null) : null;
    }

    // Temp state for 2FA flow
    let _tempToken = null;

    async function login(username, password) {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();

        if (data.success && data.token) {
            storeLogin(data.token, data.account);
            return { success: true };
        }

        if (data.requires2FA && data.tempToken) {
            _tempToken = data.tempToken;
            return { success: false, requires2FA: true };
        }

        if (data.locked) {
            return { success: false, message: data.message || 'Account locked. Try again later.' };
        }

        return { success: false, message: data.message || 'Invalid credentials' };
    }

    async function verify2FA(code) {
        if (!_tempToken) {
            return { success: false, message: 'No pending 2FA session. Please log in again.' };
        }

        const res = await fetch(`${API_BASE}/api/auth/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken: _tempToken, code }),
        });
        const data = await res.json();

        if (data.success && data.token) {
            storeLogin(data.token, data.account);
            _tempToken = null;
            return { success: true };
        }

        return { success: false, message: data.message || 'Invalid 2FA code' };
    }

    function reset2FA() {
        _tempToken = null;
    }

    return {
        TOKEN_KEY,
        USER_KEY,
        API_BASE,
        getToken,
        getUser,
        isLoggedIn,
        storeLogin,
        logout,
        getAuthHeader,
        getUsername,
        login,
        verify2FA,
        reset2FA,
        decodePayload,
    };
})();
