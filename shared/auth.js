/**
 * Elderos — Shared Authentication
 * Unified JWT auth used across all public pages (Home, Play, Hiscores, Vote).
 * Token stored in a cookie (domain=.elderos.io) so login/logout is shared
 * across all subdomains. Account object cached in localStorage per-subdomain.
 */
const Auth = (() => {
    const TOKEN_KEY = 'elderos_token';
    const USER_KEY = 'elderos_user';
    const COOKIE_NAME = 'elderos_token';

    const API_BASE = (() => {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:')
            return 'http://localhost:8084';
        return 'https://api.elderos.io';
    })();

    // True if running on a real elderos.io subdomain (not localhost/dev)
    const IS_PRODUCTION = window.location.hostname.endsWith('elderos.io');

    // === Cookie Helpers ===

    function setCookie(name, value, days) {
        let expires = '';
        if (days) {
            const d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            expires = '; expires=' + d.toUTCString();
        }
        let cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
        if (IS_PRODUCTION) {
            cookie += '; domain=.elderos.io; Secure';
        }
        document.cookie = cookie;
    }

    function getCookie(name) {
        const prefix = name + '=';
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let c = cookies[i].trim();
            if (c.indexOf(prefix) === 0) {
                return decodeURIComponent(c.substring(prefix.length));
            }
        }
        return null;
    }

    function deleteCookie(name) {
        // Clear with domain for production
        if (IS_PRODUCTION) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.elderos.io; Secure; SameSite=Lax';
        }
        // Also clear without domain (covers localhost and any stale cookies)
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    }

    // === Migration: move token from localStorage to cookie on first load ===

    (function migrate() {
        // Migrate old vote key
        const OLD_VOTE_KEY = 'elderos_vote_token';
        const oldVote = localStorage.getItem(OLD_VOTE_KEY);
        if (oldVote) {
            localStorage.removeItem(OLD_VOTE_KEY);
        }

        // If token exists in localStorage but not in cookie, migrate it
        const lsToken = localStorage.getItem(TOKEN_KEY);
        const cookieToken = getCookie(COOKIE_NAME);
        if (lsToken && !cookieToken) {
            const payload = decodePayload(lsToken);
            if (payload && payload.exp * 1000 > Date.now()) {
                setCookie(COOKIE_NAME, lsToken, 7);
            }
        }
        // Clean up localStorage token (cookie is now the source of truth)
        if (lsToken) {
            localStorage.removeItem(TOKEN_KEY);
        }
    })();

    function decodePayload(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    }

    function getToken() {
        const token = getCookie(COOKIE_NAME);
        if (!token) {
            localStorage.removeItem(USER_KEY);
            return null;
        }
        const payload = decodePayload(token);
        if (!payload || payload.exp * 1000 <= Date.now()) {
            deleteCookie(COOKIE_NAME);
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
        setCookie(COOKIE_NAME, token, 7);
        if (account) localStorage.setItem(USER_KEY, JSON.stringify(account));
    }

    function logout() {
        deleteCookie(COOKIE_NAME);
        localStorage.removeItem(USER_KEY);
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
