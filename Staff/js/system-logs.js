/* ============================================================
   ELDEROS STAFF PANEL - SYSTEM LOGS
   ============================================================ */
console.log('[SystemLogs] Loading system-logs.js...');

const SystemLogs = {
    _logs: [],
    _total: 0,
    _page: 1,
    _limit: 25,
    _filters: {},
    _isLoading: false,

    LOG_LEVELS: ['INFO', 'WARN', 'ERROR'],
    SOURCES: ['SERVICE', 'AUTH', 'STORE', 'DISCORD', 'AGENT', 'CONFIG', 'DEPLOY', 'SECURITY'],

    init() {},

    onPageLoad() {
        this._page = 1;
        this._filters = {};
        this.render();
        this.load();
    },

    onPageLeave() {},

    render() {
        const container = document.getElementById('page-system-logs');
        if (!container) return;

        container.innerHTML = `
            <div class="system-logs-page">
                <div class="system-logs-filters" id="systemLogsFilters">
                    ${this._renderFilters()}
                </div>
                <div class="system-logs-table-wrapper">
                    <div class="system-logs-table" id="systemLogsTable">
                        <div class="system-logs-loading">Loading...</div>
                    </div>
                    <div class="system-logs-pagination" id="systemLogsPagination"></div>
                </div>
            </div>
        `;

        this._bindEvents();
    },

    _renderFilters() {
        return `
            <div class="system-logs-filter-row">
                <div class="system-logs-filter-group">
                    <label>Level</label>
                    <select id="slFilterLevel" class="system-logs-select">
                        <option value="">All Levels</option>
                        ${this.LOG_LEVELS.map(l => `<option value="${l}" ${this._filters.log_level === l ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="system-logs-filter-group">
                    <label>Source</label>
                    <select id="slFilterSource" class="system-logs-select">
                        <option value="">All Sources</option>
                        ${this.SOURCES.map(s => `<option value="${s}" ${this._filters.source === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="system-logs-filter-group">
                    <label>Search</label>
                    <input type="text" id="slFilterSearch" class="system-logs-input" placeholder="Message or details..." value="${this._escapeHtml(this._filters.search || '')}">
                </div>
                <div class="system-logs-filter-group">
                    <label>From</label>
                    <input type="date" id="slFilterStart" class="system-logs-input">
                </div>
                <div class="system-logs-filter-group">
                    <label>To</label>
                    <input type="date" id="slFilterEnd" class="system-logs-input">
                </div>
                <div class="system-logs-filter-actions">
                    <button class="system-logs-filter-btn" id="slFilterApply">Apply</button>
                    <button class="system-logs-filter-clear" id="slFilterClear">Clear</button>
                </div>
            </div>
        `;
    },

    _bindEvents() {
        document.getElementById('slFilterApply')?.addEventListener('click', () => this._applyFilters());
        document.getElementById('slFilterClear')?.addEventListener('click', () => {
            this._filters = {};
            this._page = 1;
            this.render();
            this.load();
        });

        document.querySelectorAll('#systemLogsFilters .system-logs-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._applyFilters();
            });
        });
    },

    _applyFilters() {
        const logLevel = document.getElementById('slFilterLevel')?.value;
        const source = document.getElementById('slFilterSource')?.value;
        const search = document.getElementById('slFilterSearch')?.value?.trim();
        const startDate = document.getElementById('slFilterStart')?.value;
        const endDate = document.getElementById('slFilterEnd')?.value;

        this._filters = {};
        if (logLevel) this._filters.log_level = logLevel;
        if (source) this._filters.source = source;
        if (search) this._filters.search = search;
        if (startDate) this._filters.start_date = new Date(startDate).getTime();
        if (endDate) this._filters.end_date = new Date(endDate + 'T23:59:59').getTime();

        this._page = 1;
        this.load();
    },

    async load() {
        if (this._isLoading) return;
        this._isLoading = true;

        const tableEl = document.getElementById('systemLogsTable');
        if (tableEl) tableEl.innerHTML = '<div class="system-logs-loading">Loading...</div>';

        try {
            const data = await API.logs.getSystemLogs(this._page, this._limit, this._filters);
            this._logs = data.logs || [];
            this._total = data.total || 0;
            this._renderTable();
            this._renderPagination();
        } catch (error) {
            console.error('[SystemLogs] Load error:', error);
            if (tableEl) {
                tableEl.innerHTML = `
                    <div class="system-logs-empty">
                        <div class="system-logs-empty-text">Failed to load logs: ${this._escapeHtml(error.message)}</div>
                    </div>
                `;
            }
        } finally {
            this._isLoading = false;
        }
    },

    _renderTable() {
        const tableEl = document.getElementById('systemLogsTable');
        if (!tableEl) return;

        if (this._logs.length === 0) {
            tableEl.innerHTML = `
                <div class="system-logs-empty">
                    <div class="system-logs-empty-text">No system logs found</div>
                </div>
            `;
            return;
        }

        tableEl.innerHTML = `
            <table class="data-table system-logs-data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Level</th>
                        <th>Source</th>
                        <th>Message</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${this._logs.map(log => `
                        <tr class="system-log-row ${this._getLevelRowClass(log.logLevel)}">
                            <td class="log-time">${this._formatTime(log.createdAt)}</td>
                            <td><span class="level-badge ${this._getLevelClass(log.logLevel)}">${this._escapeHtml(log.logLevel)}</span></td>
                            <td><span class="source-badge">${this._escapeHtml(log.source)}</span></td>
                            <td class="system-message-cell" title="${this._escapeHtml(log.message || '')}">${this._truncate(log.message, 80)}</td>
                            <td class="system-details-cell" title="${this._escapeHtml(log.details || '')}">${this._truncate(log.details, 50)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    _renderPagination() {
        const el = document.getElementById('systemLogsPagination');
        if (!el) return;

        const totalPages = Math.max(1, Math.ceil(this._total / this._limit));

        el.innerHTML = `
            <div class="system-logs-page-info">
                Showing ${this._logs.length} of ${this._total} entries
            </div>
            <div class="system-logs-page-controls">
                <button class="system-logs-page-btn" ${this._page <= 1 ? 'disabled' : ''} data-page="${this._page - 1}">Prev</button>
                <span class="system-logs-page-label">Page ${this._page} of ${totalPages}</span>
                <button class="system-logs-page-btn" ${this._page >= totalPages ? 'disabled' : ''} data-page="${this._page + 1}">Next</button>
            </div>
        `;

        el.querySelectorAll('.system-logs-page-btn').forEach(btn => {
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

    _getLevelClass(level) {
        const map = { 'INFO': 'info', 'WARN': 'warn', 'ERROR': 'error' };
        return map[level] || 'info';
    },

    _getLevelRowClass(level) {
        if (level === 'ERROR') return 'row-error';
        if (level === 'WARN') return 'row-warn';
        return '';
    },

    _truncate(str, max) {
        if (!str) return '<span class="log-muted">\u2014</span>';
        const escaped = this._escapeHtml(str);
        if (str.length <= max) return escaped;
        return `<span title="${escaped}">${this._escapeHtml(str.substring(0, max))}...</span>`;
    },

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemLogs;
}
