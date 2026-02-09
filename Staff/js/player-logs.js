/* ============================================================
   ELDEROS STAFF PANEL - PLAYER LOGS
   ============================================================ */
console.log('[PlayerLogs] Loading player-logs.js...');

const PlayerLogs = {
    _logs: [],
    _total: 0,
    _page: 1,
    _limit: 25,
    _filters: {},
    _isLoading: false,

    ACTIVITY_TYPES: ['LOGIN', 'LOGOUT', 'WORLD_CHANGE', 'DEATH', 'TRADE', 'DROP', 'PICKUP', 'LEVEL_UP'],

    init() {},

    onPageLoad() {
        this._page = 1;
        this._filters = {};
        this._parseUrlFilters();
        this.render();
        this.load();
    },

    onPageLeave() {},

    _parseUrlFilters() {
        const hash = window.location.hash;
        const queryIdx = hash.indexOf('?');
        if (queryIdx === -1) return;

        const params = new URLSearchParams(hash.substring(queryIdx));
        if (params.has('account_id')) this._filters.account_id = params.get('account_id');
        if (params.has('activity_type')) this._filters.activity_type = params.get('activity_type');
        if (params.has('world_id')) this._filters.world_id = params.get('world_id');
    },

    render() {
        const container = document.getElementById('page-player-logs');
        if (!container) return;

        container.innerHTML = `
            <div class="player-logs-page">
                <div class="player-logs-filters" id="playerLogsFilters">
                    ${this._renderFilters()}
                </div>
                <div class="player-logs-table-wrapper">
                    <div class="player-logs-table" id="playerLogsTable">
                        <div class="player-logs-loading">Loading...</div>
                    </div>
                    <div class="player-logs-pagination" id="playerLogsPagination"></div>
                </div>
            </div>
        `;

        this._bindEvents();
    },

    _renderFilters() {
        return `
            <div class="player-logs-filter-row">
                <div class="player-logs-filter-group">
                    <label>Activity Type</label>
                    <select id="plFilterType" class="player-logs-select">
                        <option value="">All Types</option>
                        ${this.ACTIVITY_TYPES.map(t => `<option value="${t}" ${this._filters.activity_type === t ? 'selected' : ''}>${this._formatType(t)}</option>`).join('')}
                    </select>
                </div>
                <div class="player-logs-filter-group">
                    <label>Player</label>
                    <input type="text" id="plFilterSearch" class="player-logs-input" placeholder="Username or details..." value="${this._escapeHtml(this._filters.search || '')}">
                </div>
                <div class="player-logs-filter-group">
                    <label>World</label>
                    <input type="number" id="plFilterWorld" class="player-logs-input player-logs-input-small" placeholder="ID" value="${this._filters.world_id || ''}">
                </div>
                <div class="player-logs-filter-group">
                    <label>From</label>
                    <input type="date" id="plFilterStart" class="player-logs-input">
                </div>
                <div class="player-logs-filter-group">
                    <label>To</label>
                    <input type="date" id="plFilterEnd" class="player-logs-input">
                </div>
                <div class="player-logs-filter-actions">
                    <button class="player-logs-filter-btn" id="plFilterApply">Apply</button>
                    <button class="player-logs-filter-clear" id="plFilterClear">Clear</button>
                </div>
            </div>
        `;
    },

    _bindEvents() {
        document.getElementById('plFilterApply')?.addEventListener('click', () => this._applyFilters());
        document.getElementById('plFilterClear')?.addEventListener('click', () => {
            this._filters = {};
            this._page = 1;
            this.render();
            this.load();
        });

        document.querySelectorAll('#playerLogsFilters .player-logs-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._applyFilters();
            });
        });
    },

    _applyFilters() {
        const activityType = document.getElementById('plFilterType')?.value;
        const search = document.getElementById('plFilterSearch')?.value?.trim();
        const worldId = document.getElementById('plFilterWorld')?.value?.trim();
        const startDate = document.getElementById('plFilterStart')?.value;
        const endDate = document.getElementById('plFilterEnd')?.value;

        this._filters = {};
        if (activityType) this._filters.activity_type = activityType;
        if (search) this._filters.search = search;
        if (worldId) this._filters.world_id = worldId;
        if (startDate) this._filters.start_date = new Date(startDate).getTime();
        if (endDate) this._filters.end_date = new Date(endDate + 'T23:59:59').getTime();

        this._page = 1;
        this.load();
    },

    async load() {
        if (this._isLoading) return;
        this._isLoading = true;

        const tableEl = document.getElementById('playerLogsTable');
        if (tableEl) tableEl.innerHTML = '<div class="player-logs-loading">Loading...</div>';

        try {
            const data = await API.logs.getPlayerActivityLogs(this._page, this._limit, this._filters);
            this._logs = data.logs || [];
            this._total = data.total || 0;
            this._renderTable();
            this._renderPagination();
        } catch (error) {
            console.error('[PlayerLogs] Load error:', error);
            if (tableEl) {
                tableEl.innerHTML = `
                    <div class="player-logs-empty">
                        <div class="player-logs-empty-text">Failed to load logs: ${this._escapeHtml(error.message)}</div>
                    </div>
                `;
            }
        } finally {
            this._isLoading = false;
        }
    },

    _renderTable() {
        const tableEl = document.getElementById('playerLogsTable');
        if (!tableEl) return;

        if (this._logs.length === 0) {
            tableEl.innerHTML = `
                <div class="player-logs-empty">
                    <div class="player-logs-empty-text">No activity logs found</div>
                </div>
            `;
            return;
        }

        tableEl.innerHTML = `
            <table class="data-table player-logs-data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Player</th>
                        <th>Activity</th>
                        <th>World</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${this._logs.map(log => `
                        <tr>
                            <td class="log-time">${this._formatTime(log.createdAt)}</td>
                            <td>
                                <a href="#" class="log-player-link" data-account-id="${log.accountId}">${this._escapeHtml(log.username)}</a>
                            </td>
                            <td><span class="activity-badge ${this._getActivityClass(log.activityType)}">${this._formatType(log.activityType)}</span></td>
                            <td>${log.worldId != null ? '<span class="log-detail-tag">W' + log.worldId + '</span>' : '<span class="log-muted">\u2014</span>'}</td>
                            <td class="log-details-cell" title="${this._escapeHtml(log.details || '')}">${this._formatDetails(log.details)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this._bindTableLinks(tableEl);
    },

    _bindTableLinks(el) {
        el.querySelectorAll('.log-player-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const accountId = link.dataset.accountId;
                if (accountId && typeof PlayerView !== 'undefined') {
                    PlayerView.open(accountId);
                }
            });
        });
    },

    _renderPagination() {
        const el = document.getElementById('playerLogsPagination');
        if (!el) return;

        const totalPages = Math.max(1, Math.ceil(this._total / this._limit));

        el.innerHTML = `
            <div class="player-logs-page-info">
                Showing ${this._logs.length} of ${this._total} entries
            </div>
            <div class="player-logs-page-controls">
                <button class="player-logs-page-btn" ${this._page <= 1 ? 'disabled' : ''} data-page="${this._page - 1}">Prev</button>
                <span class="player-logs-page-label">Page ${this._page} of ${totalPages}</span>
                <button class="player-logs-page-btn" ${this._page >= totalPages ? 'disabled' : ''} data-page="${this._page + 1}">Next</button>
            </div>
        `;

        el.querySelectorAll('.player-logs-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= totalPages) {
                    this._page = page;
                    this.load();
                }
            });
        });
    },

    // === Helpers ===

    _formatTime(ts) {
        if (!ts) return '\u2014';
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        if (isToday) return time;
        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${date} ${time}`;
    },

    _formatType(type) {
        if (!type) return '\u2014';
        return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },

    _getActivityClass(type) {
        const map = {
            'LOGIN': 'success', 'LOGOUT': 'info', 'WORLD_CHANGE': 'info',
            'DEATH': 'danger', 'TRADE': 'warning', 'DROP': 'warning',
            'PICKUP': 'neutral', 'LEVEL_UP': 'success'
        };
        return map[type] || 'neutral';
    },

    _formatDetails(details) {
        if (!details) return '<span class="log-muted">\u2014</span>';
        const escaped = this._escapeHtml(details);
        if (details.length > 60) {
            return `<span title="${escaped}">${this._escapeHtml(details.substring(0, 60))}...</span>`;
        }
        return escaped;
    },

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerLogs;
}
