/* ============================================================
   ELDEROS STAFF PANEL - API CLIENT
   ============================================================ */
console.log('[API] Loading api.js...');

const API = {
    /**
     * Make an authenticated API request
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {object} options - Fetch options
     * @returns {Promise<object>} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        const token = Auth.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeout);

            // Handle 401 Unauthorized (but not for auth endpoints - they handle their own errors)
            if (response.status === 401 && !endpoint.startsWith('/auth/')) {
                Auth.clearSession();
                window.location.href = 'index.html';
                throw new APIError('Session expired', 401);
            }

            // Handle other errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(
                    errorData.message || `Request failed with status ${response.status}`,
                    response.status,
                    errorData
                );
            }

            // Handle empty responses
            const text = await response.text();
            if (!text) return null;

            return JSON.parse(text);
        } catch (error) {
            clearTimeout(timeout);

            if (error.name === 'AbortError') {
                throw new APIError('Request timeout', 408);
            }

            if (error instanceof APIError) {
                throw error;
            }

            throw new APIError(error.message || 'Network error', 0);
        }
    },

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    },

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * DELETE request
     */
    async delete(endpoint, data = null) {
        const options = { method: 'DELETE' };
        if (data) options.body = JSON.stringify(data);
        return this.request(endpoint, options);
    },

    /**
     * PATCH request
     */
    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    // ==================== ENUM ENDPOINTS ====================

    enums: {
        /**
         * Get all enum definitions
         */
        async getAll() {
            return API.get('/enums');
        }
    },

    // ==================== AUTH ENDPOINTS ====================

    auth: {
        /**
         * Check if device is remembered
         */
        async checkRemembered(deviceToken, username = null) {
            return API.request('/auth/check-remembered', {
                method: 'POST',
                body: JSON.stringify({ deviceToken, username })
            });
        },

        /**
         * Step 1: Login with game credentials
         * @param {string} username
         * @param {string} password
         * @param {boolean} rememberCredentials - Remember username/password for 30 days
         * @param {string} deviceToken - Existing device token (for remembered logins)
         */
        async login(username, password, rememberCredentials = false, deviceToken = null) {
            return API.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password, rememberCredentials, deviceToken })
            });
        },

        /**
         * Step 2: Verify 2FA code
         * @param {string} username
         * @param {string} code
         * @param {boolean} remember2fa - Remember 2FA for 30 days
         */
        async verify2FA(username, code, remember2fa = false) {
            return API.request('/auth/verify-2fa', {
                method: 'POST',
                body: JSON.stringify({ username, code, remember2fa })
            });
        },

        /**
         * Step 3: Verify daily session key
         */
        async verifySessionKey(username, sessionKey) {
            return API.request('/auth/verify-session-key', {
                method: 'POST',
                body: JSON.stringify({ username, sessionKey })
            });
        },

        /**
         * Validate current session
         */
        async validate() {
            return API.post('/auth/validate');
        },

        /**
         * Logout
         */
        async logout() {
            return API.post('/auth/logout');
        }
    },

    // ==================== PLAYER ENDPOINTS ====================

    players: {
        /**
         * Search players
         */
        async search(query, mode = 'player', page = 1, limit = CONFIG.DEFAULT_PAGE_SIZE) {
            return API.get('/players/search', { query, mode, page, limit });
        },

        /**
         * Get player details
         */
        async get(playerId) {
            return API.get(`/players/${playerId}`);
        },

        /**
         * Get player's linked accounts
         */
        async getLinkedAccounts(playerId) {
            return API.get(`/players/${playerId}/linked`);
        },

        /**
         * Get player's punishment history
         */
        async getPunishments(playerId) {
            return API.get(`/players/${playerId}/punishments`);
        },

        /**
         * Get player's action logs
         */
        async getLogs(playerId, page = 1, limit = 50) {
            return API.get(`/players/${playerId}/logs`, { page, limit });
        },

        /**
         * Update player data (legacy PUT)
         */
        async update(playerId, data) {
            return API.put(`/players/${playerId}`, data);
        },

        /**
         * Update player fields with reason (PATCH for player view)
         * @param {string|number} playerId - Player ID
         * @param {Array} changes - Array of change objects with scope, key, oldValue, newValue, worldType (for profile)
         * @param {string} reason - Reason for the changes (required for audit)
         */
        async patch(playerId, changes, reason) {
            return API.patch(`/players/${playerId}`, { changes, reason });
        },

        /**
         * Save a single field (PUT per-field save)
         * @param {string|number} playerId - Player ID
         * @param {object} data - { field, value, scope, worldType?, reason? }
         */
        async saveField(playerId, data) {
            return API.put(`/players/${playerId}/fields`, data);
        },

        /**
         * Apply punishment
         */
        async punish(playerId, punishment) {
            return API.post(`/players/${playerId}/punish`, punishment);
        },

        /**
         * Revoke punishment
         */
        async revokePunishment(playerId, punishmentId, reason) {
            return API.post(`/players/${playerId}/punishments/${punishmentId}/revoke`, { reason });
        },

        /**
         * Force logout player
         */
        async forceLogout(playerId, reason) {
            return API.post(`/players/${playerId}/force-logout`, { reason });
        },

        /**
         * Create a new player account (Admin+)
         * @param {string} username - 3-12 chars, alphanumeric + underscore + space
         * @param {string} email - Valid email address
         * @param {string} password - Min 6 characters
         */
        async create(username, email, password) {
            return API.post('/players/create', { username, email, password });
        },

        /**
         * Update a player's adventurer profile bio (Ashpire only)
         * @param {number} playerId
         * @param {string} bio - Max 200 characters
         */
        async updateBio(playerId, bio) {
            return API.patch(`/players/${playerId}/bio`, { bio });
        }
    },

    // ==================== WORLDS ENDPOINTS ====================

    worlds: {
        /**
         * Get all world telemetry
         */
        async getAll() {
            return API.get('/stats/worlds');
        },

        /**
         * Get command schema (agent + game commands)
         */
        async getCommands() {
            return API.get('/commands');
        },

        /**
         * Execute a command on a world (or all worlds)
         * @param {number|string} worldId - World ID or 'all'
         * @param {string} type - 'agent' or 'game'
         * @param {string} command - Command name
         * @param {Array} args - Typed args array [{type, value}]
         */
        async executeCommand(worldId, type, command, args = []) {
            const endpoint = worldId === 'all'
                ? '/worlds/command'
                : `/worlds/${worldId}/command`;
            return API.post(endpoint, { type, command, args, confirm: true });
        }
    },

    // ==================== PUNISHMENT ENDPOINTS ====================

    punishments: {
        /**
         * Search punishments with filters
         * @param {string[]} types - Punishment types (e.g. ['TEMP_BAN', 'PERM_BAN'])
         * @param {object} params - page, limit, active, search, staff_id, start_date, end_date
         */
        async search(types, params = {}) {
            return API.get('/punishments', { types: types.join(','), ...params });
        },

        /**
         * Revoke a punishment
         * @param {number} punishmentId
         * @param {string} reason
         */
        async revoke(punishmentId, reason) {
            return API.post(`/punishments/revoke/${punishmentId}`, { reason });
        },

        /**
         * Create a punishment
         * @param {number} targetId - Account ID
         * @param {string} type - KICK, MUTE, TIMEOUT, TEMP_BAN, PERM_BAN, IP_BAN
         * @param {string} reason
         * @param {number|null} durationMinutes - Required for MUTE, TIMEOUT, TEMP_BAN
         */
        async create(targetId, type, reason, durationMinutes) {
            return API.post('/punishments/create', { targetId, type, reason, durationMinutes });
        }
    },

    // ==================== NOTES ENDPOINTS ====================

    notes: {
        /**
         * Get notes for a player
         */
        async getForPlayer(playerId) {
            return API.get('/notes', { player_id: playerId });
        },

        /**
         * Create a note on a player
         */
        async create(playerId, note) {
            return API.post('/notes/create', { playerId, note });
        },

        /**
         * Delete a note
         */
        async delete(noteId) {
            return API.post(`/notes/delete/${noteId}`);
        },

        /**
         * Toggle pin on a note
         */
        async togglePin(noteId) {
            return API.post(`/notes/pin/${noteId}`);
        }
    },

    // ==================== TAGS ENDPOINTS ====================

    tags: {
        /**
         * Get tags for a player
         */
        async getForPlayer(playerId) {
            return API.get('/tags', { player_id: playerId });
        },

        /**
         * Add a tag to a player
         */
        async add(playerId, tag) {
            return API.post('/tags/add', { playerId, tag });
        },

        /**
         * Remove a tag by ID
         */
        async remove(tagId) {
            return API.post(`/tags/remove/${tagId}`);
        }
    },

    // ==================== CONTAINER ENDPOINTS ====================

    containers: {
        /**
         * Get container data for a player
         * @param {number} playerId
         * @param {string} type - inventory, equipment, or bank
         */
        async get(playerId, type) {
            return API.get(`/containers/${playerId}/${type}`);
        },

        /**
         * Update a container slot
         * @param {number} playerId
         * @param {string} type - inventory, equipment, or bank
         * @param {object} action - {action:'set'|'delete'|'swap'|'clear', ...}
         */
        async update(playerId, type, action) {
            return API.post(`/containers/${playerId}/${type}/update`, action);
        }
    },

    // ==================== SKILL ENDPOINTS ====================

    skills: {
        /**
         * Get skill data for a player
         * @param {number} playerId
         * @param {string} profileType - e.g. economy_profiles, pvp_profiles
         */
        async get(playerId, profileType) {
            return API.get(`/skills/${playerId}/${profileType}`);
        },

        /**
         * Update a player's skills
         * @param {number} playerId
         * @param {string} profileType
         * @param {object} action - {action:'set'|'max_all'|'reset_all', ...}
         */
        async update(playerId, profileType, action) {
            return API.post(`/skills/${playerId}/${profileType}/update`, action);
        }
    },

    // ==================== STATS ENDPOINTS ====================

    stats: {
        /**
         * Get dashboard statistics
         */
        async getDashboard() {
            return API.get('/stats/dashboard');
        },

        /**
         * Get online player count
         */
        async getOnlineCount() {
            return API.get('/stats/online');
        },

        /**
         * Get hub service status (Developer+)
         */
        async getServices() {
            return API.get('/stats/services');
        },

        /**
         * Get per-world telemetry (Developer+)
         */
        async getWorlds() {
            return API.get('/stats/worlds');
        }
    },

    // ==================== NEWS ENDPOINTS ====================

    news: {
        /**
         * Get all news posts
         */
        async getAll(page = 1, limit = 20) {
            return API.get('/news', { page, limit });
        },

        /**
         * Get single news post
         */
        async get(newsId) {
            return API.get(`/news/${newsId}`);
        },

        /**
         * Create news post
         */
        async create(data) {
            return API.post('/news', data);
        },

        /**
         * Update news post
         */
        async update(newsId, data) {
            return API.put(`/news/${newsId}`, data);
        },

        /**
         * Delete news post
         */
        async delete(newsId) {
            return API.delete(`/news/${newsId}`);
        },

        /**
         * Publish a news post
         */
        async publish(newsId) {
            return API.post(`/news/${newsId}/publish`);
        },

        /**
         * Unpublish a news post
         */
        async unpublish(newsId) {
            return API.post(`/news/${newsId}/unpublish`);
        },

        /**
         * Toggle pin on a news post
         */
        async pin(newsId) {
            return API.post(`/news/${newsId}/pin`);
        },

        /**
         * Upload images for news posts (multipart)
         * @param {FileList|File[]} files - Image files to upload
         * @returns {Promise<{success: boolean, images: Array}>}
         */
        async uploadImages(files) {
            const formData = new FormData();
            for (const file of files) {
                formData.append('images', file, file.name);
            }
            const url = `${CONFIG.API_BASE}/news/images`;
            const token = Auth.getToken();
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(errorData.message || 'Upload failed', response.status);
            }
            return response.json();
        },

        /**
         * Delete an uploaded image
         */
        async deleteImage(imageId) {
            return API.delete(`/news/images/${imageId}`);
        }
    },

    // ==================== REPORTS ENDPOINTS ====================

    reports: {
        /**
         * Get all reports
         */
        async getAll(status = 'OPEN', page = 1, limit = 20) {
            return API.get('/reports', { status, page, limit });
        },

        /**
         * Get report details
         */
        async get(reportId) {
            return API.get(`/reports/${reportId}`);
        },

        /**
         * Claim report
         */
        async claim(reportId) {
            return API.post(`/reports/${reportId}/claim`);
        },

        /**
         * Resolve report
         */
        async resolve(reportId, resolution) {
            return API.post(`/reports/${reportId}/resolve`, { resolution });
        },

        /**
         * Add note to report
         */
        async addNote(reportId, note) {
            return API.post(`/reports/${reportId}/notes`, { note });
        }
    },

    // ==================== LOGS ENDPOINTS ====================

    logs: {
        /**
         * Get staff action logs
         * @param {number} page
         * @param {number} limit
         * @param {object} filters - action_type, staff_id, account_id, start_date, end_date
         */
        async getStaffLogs(page = 1, limit = 50, filters = {}) {
            return API.get('/logs/staff', { page, limit, ...filters });
        },

        /**
         * Get audit trail logs
         * @param {number} page
         * @param {number} limit
         * @param {object} filters - action_type, staff_id, account_id, start_date, end_date, search
         */
        async getAuditLogs(page = 1, limit = 50, filters = {}) {
            return API.get('/logs/audit', { page, limit, ...filters });
        },

        /**
         * Get game logs
         */
        async getGameLogs(page = 1, limit = 50, filters = {}) {
            return API.get('/logs/game', { page, limit, ...filters });
        },

        /**
         * Delete a staff action log (Ashpire-only)
         */
        async deleteStaffLog(logId) {
            return API.delete(`/logs/staff/${logId}`);
        },

        /**
         * Delete an audit log (Ashpire-only)
         */
        async deleteAuditLog(logId) {
            return API.delete(`/logs/audit/${logId}`);
        },

        /**
         * Get player activity logs
         * @param {number} page
         * @param {number} limit
         * @param {object} filters - account_id, activity_type, world_id, start_date, end_date, search
         */
        async getPlayerActivityLogs(page = 1, limit = 50, filters = {}) {
            return API.get('/logs/player-activity', { page, limit, ...filters });
        },

        /**
         * Get chat logs
         * @param {number} page
         * @param {number} limit
         * @param {object} filters - account_id, chat_type, world_id, zone_id, start_date, end_date, search, search_mode
         */
        async getChatLogs(page = 1, limit = 50, filters = {}) {
            return API.get('/logs/chat', { page, limit, ...filters });
        },

        /**
         * Get chat context (surrounding messages for a conversation)
         * @param {object} params - mode, world_id, zone_id, player_a, player_b, from, to, limit
         */
        async getChatContext(params = {}) {
            return API.get('/logs/chat/context', params);
        },

        /**
         * Get system logs
         * @param {number} page
         * @param {number} limit
         * @param {object} filters - log_level, source, start_date, end_date, search
         */
        async getSystemLogs(page = 1, limit = 50, filters = {}) {
            return API.get('/logs/system', { page, limit, ...filters });
        }
    },

    // ==================== TELEMETRY ENDPOINTS ====================

    telemetry: {
        /**
         * Get telemetry history for a world
         * @param {number} worldId
         * @param {string} range - 1h|6h|24h|7d|30d
         */
        async getHistory(worldId, range = '1h') {
            return API.get(`/telemetry/${worldId}`, { range });
        },

        /**
         * Get latest telemetry snapshot per world (from memory, no DB hit)
         */
        async getLatestAll() {
            return API.get('/telemetry/all/latest');
        }
    },

    // ==================== CONFIG LOCK ENDPOINTS ====================

    config: {
        async acquireLock(configId) {
            return API.post('/config/lock', { configId });
        },

        async releaseLock(configId) {
            return API.delete('/config/lock', { configId });
        },

        async forceReleaseLock(configId) {
            return API.delete('/config/lock', { configId, force: true });
        },

        async heartbeat(configId) {
            return API.put('/config/lock/heartbeat', { configId });
        },

        async getLockStatus(configId) {
            return API.get('/config/lock/status', { configId });
        },

        // --- Vote Config (Developer+) ---

        async getVoteConfig() {
            return API.get('/config/vote');
        },

        async saveVoteConfig(yaml, basedOnHash = null) {
            const body = { yaml };
            if (basedOnHash) body.basedOnHash = basedOnHash;
            return API.post('/config/vote', body);
        },

        // --- Hub Config (Developer+) ---

        async getHubConfig() {
            return API.get('/config/hub');
        },

        async saveHubConfig(yaml, basedOnHash = null) {
            const body = { yaml };
            if (basedOnHash) body.basedOnHash = basedOnHash;
            return API.post('/config/hub', body);
        },

        // --- Worlds Config (Developer+) ---

        async getWorldsConfig() {
            return API.get('/config/worlds');
        },

        async saveWorldsConfig(yaml, basedOnHash = null) {
            const body = { yaml };
            if (basedOnHash) body.basedOnHash = basedOnHash;
            return API.post('/config/worlds', body);
        }
    },

    // ==================== ASHPIRE ENDPOINTS ====================

    ashpire: {
        /**
         * Get Ashpire auth bypass settings
         */
        async getAuthSettings() {
            return API.get('/ashpire/auth-settings');
        },

        /**
         * Update Ashpire auth bypass settings
         * @param {object} settings - { skip2fa: bool, skipDiscordKey: bool }
         */
        async updateAuthSettings(settings) {
            return API.post('/ashpire/auth-settings', settings);
        },

        // --- Store Config ---

        async getStoreConfig() {
            return API.get('/ashpire/config/store');
        },

        async saveStoreConfig(yaml, basedOnHash = null) {
            const body = { yaml };
            if (basedOnHash) body.basedOnHash = basedOnHash;
            return API.post('/ashpire/config/store', body);
        },

        // --- Hub Config ---

        async getHubConfig() {
            return API.get('/ashpire/config/hub');
        },

        async saveHubConfig(yaml, basedOnHash = null) {
            const body = { yaml };
            if (basedOnHash) body.basedOnHash = basedOnHash;
            return API.post('/ashpire/config/hub', body);
        },

        // --- Worlds Config ---

        async getWorldsConfig() {
            return API.get('/ashpire/config/worlds');
        },

        async saveWorldsConfig(yaml, basedOnHash = null) {
            const body = { yaml };
            if (basedOnHash) body.basedOnHash = basedOnHash;
            return API.post('/ashpire/config/worlds', body);
        },

        // --- Revenue ---

        async getRevenueSummary() {
            return API.get('/ashpire/revenue/summary');
        },

        async getRevenueChart(period = 'daily', days = 30) {
            return API.get('/ashpire/revenue/chart', { period, days });
        },

        async getRecentPurchases(page = 1, limit = 25) {
            return API.get('/ashpire/revenue/recent', { page, limit });
        },

        async getTopSpenders(limit = 10) {
            return API.get('/ashpire/revenue/top-spenders', { limit });
        },

        // --- Services ---

        async restartService(serviceKey) {
            return API.post(`/ashpire/services/${serviceKey}/restart`);
        },

        // --- Sessions ---

        async getSessions() {
            return API.get('/ashpire/sessions');
        },

        async revokeSession(accountId) {
            return API.post(`/ashpire/sessions/${accountId}/revoke`);
        },

        async kickSession(accountId) {
            return API.post(`/ashpire/sessions/${accountId}/revoke`);
        }
    },

    // ==================== SEARCH ENDPOINTS ====================

    search: {
        /**
         * Autocomplete item names
         * @param {string} query - Search text
         * @param {number} limit - Max results
         */
        async itemSuggest(query, limit = 20) {
            return API.get('/search/items/suggest', { q: query, limit });
        },

        /**
         * Search items across all players
         * @param {number} itemId
         * @param {object} params - minQty, location, page, limit
         */
        async items(itemId, params = {}) {
            return API.get('/search/items', { itemId, ...params });
        },

        /**
         * Search players by skill conditions
         * @param {Array} conditions - [{skillId, op, value, minValue, maxValue}]
         * @param {object} params - sortSkill, sortDir, page, limit
         */
        async hiscores(conditions, params = {}) {
            return API.get('/search/hiscores', {
                conditions: JSON.stringify(conditions),
                ...params
            });
        }
    },

    // ==================== EVENTS ENDPOINTS ====================

    events: {
        async getAll(params = {}) {
            return API.get('/events', params);
        },

        async getActive() {
            return API.get('/events/active');
        },

        async get(id) {
            return API.get(`/events/${id}`);
        },

        async create(data) {
            return API.post('/events', data);
        },

        async update(id, data) {
            return API.patch(`/events/${id}`, data);
        },

        async delete(id) {
            return API.delete(`/events/${id}`);
        },

        async start(id) {
            return API.post(`/events/${id}/start`);
        },

        async stop(id) {
            return API.post(`/events/${id}/stop`);
        },

        async cancel(id) {
            return API.post(`/events/${id}/cancel`);
        },

        async getTemplates() {
            return API.get('/events/templates');
        },

        async createTemplate(data) {
            return API.post('/events/templates', data);
        },

        async deleteTemplate(id) {
            return API.delete(`/events/templates/${id}`);
        },

        async createFromTemplate(templateId, data) {
            return API.post(`/events/from-template/${templateId}`, data);
        },

        async getHistory(params = {}) {
            return API.get('/events/history', params);
        }
    },

    // ==================== CLIPS ADMIN ENDPOINTS ====================

    clips: {
        async getSubmissions(params = {}) {
            return API.get('/clips/submissions', params);
        },

        async approveSubmission(id) {
            return API.post(`/clips/submissions/${id}/approve`);
        },

        async removeSubmission(id) {
            return API.post(`/clips/submissions/${id}/remove`);
        },

        async searchUsers(query) {
            return API.get('/clips/users/search', { q: query });
        },

        async blockUser(userId, banType, reason) {
            return API.post(`/clips/users/${userId}/block`, { banType, reason });
        },

        async unblockUser(userId) {
            return API.post(`/clips/users/${userId}/unblock`);
        },

        async clearUserSubmissions(userId) {
            return API.post(`/clips/users/${userId}/clear-submissions`);
        },

        async getPeriods(params = {}) {
            return API.get('/clips/periods', params);
        },

        async createPeriod(data) {
            return API.post('/clips/periods', data);
        },

        async finalizePeriod(periodId) {
            return API.post(`/clips/periods/${periodId}/finalize`);
        },

        async archivePeriod(periodId) {
            return API.post(`/clips/periods/${periodId}/archive`);
        },

        async getBlacklist() {
            return API.get('/clips/ip-blacklist');
        },

        async addToBlacklist(ipAddress, reason) {
            return API.post('/clips/ip-blacklist', { ipAddress, reason });
        },

        async removeFromBlacklist(id) {
            return API.post(`/clips/ip-blacklist/${id}/remove`);
        },

        async getAuditLog(params = {}) {
            return API.get('/clips/audit-log', params);
        },

        async getPayouts(periodId) {
            return API.get('/clips/payouts', { period: periodId });
        },

        async markPaid(resultId) {
            return API.post(`/clips/payouts/${resultId}/mark-paid`);
        }
    },

    // ==================== ADMIN ENDPOINTS ====================

    admin: {
        /**
         * Get database schema (tables and columns)
         */
        async getSchema() {
            return API.get('/admin/schema');
        },

        /**
         * Get field configuration for a table
         */
        async getFieldConfig(tableName) {
            return API.get('/admin/field-config', { table: tableName });
        },

        /**
         * Update field configuration
         */
        async updateFieldConfig(tableName, columnName, config) {
            return API.put(`/admin/field-config/${tableName}/${columnName}`, config);
        },

        /**
         * Delete field configuration (reset to convention)
         */
        async deleteFieldConfig(tableName, columnName) {
            return API.delete(`/admin/field-config/${tableName}/${columnName}`);
        },

        /**
         * Refresh field discovery cache
         */
        async refreshCache() {
            return API.post('/admin/refresh-cache');
        }
    }
};

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, APIError };
}
