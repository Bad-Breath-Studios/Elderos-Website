/**
 * Elderos Vote Page — API Client
 */
const API = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };

        const token = Auth.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, { ...options, headers });

        if (res.status === 401) {
            Auth.logout();
            throw new Error('Session expired');
        }

        return res.json();
    },

    vote: {
        async getStatus() {
            return API.request('/api/v1/vote/status');
        },

        async getSites() {
            return API.request('/api/v1/vote/sites');
        },

        async getSitesPublic() {
            return API.request('/api/v1/vote/sites/public');
        },

        async getRewardsPreview() {
            return API.request('/api/v1/vote/rewards/preview');
        },

        async getWeeklyLeaderboard() {
            return fetch(`${CONFIG.API_BASE}/api/v1/vote/leaderboard/weekly`)
                .then(r => r.json());
        },

        async getHistory(page = 1, limit = 20) {
            return API.request(`/api/v1/vote/history?page=${page}&limit=${limit}`);
        },
    },
};
