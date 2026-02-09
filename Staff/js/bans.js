/* ============================================================
   ELDEROS STAFF PANEL - BANS MANAGEMENT
   ============================================================ */
console.log('[Bans] Loading bans.js...');

const Bans = {
    _activeTab: 'active',    // 'active' | 'history' | 'ip'
    _punishments: [],
    _total: 0,
    _page: 1,
    _limit: 25,
    _filters: {},
    _isLoading: false,

    init() {},

    onPageLoad() {
        this._page = 1;
        this._filters = {};
        this._parseUrlFilters();
        this.render();
        this.load();
    },

    _parseUrlFilters() {
        const hash = window.location.hash.slice(1);
        const queryIdx = hash.indexOf('?');
        if (queryIdx === -1) return;
        try {
            const params = new URLSearchParams(hash.substring(queryIdx));
            if (params.has('search')) this._filters.search = params.get('search');
            if (params.has('tab')) this._activeTab = params.get('tab');
        } catch (e) { /* ignore */ }
    },

    onPageLeave() {},

    render() {
        const container = document.getElementById('page-bans');
        if (!container) return;

        container.innerHTML = `
            <div class="punishment-page">
                <div class="punishment-tabs">
                    <button class="punishment-tab ${this._activeTab === 'active' ? 'active' : ''}" data-tab="active">
                        Active Bans
                    </button>
                    <button class="punishment-tab ${this._activeTab === 'history' ? 'active' : ''}" data-tab="history">
                        Ban History
                    </button>
                    <button class="punishment-tab ${this._activeTab === 'ip' ? 'active' : ''}" data-tab="ip">
                        IP Bans
                    </button>
                </div>
                <div class="punishment-filters" id="bansFilters">
                    ${this._renderFilters()}
                </div>
                <div class="punishment-table-wrapper">
                    <div class="punishment-table" id="bansTable">
                        <div class="punishment-loading">Loading...</div>
                    </div>
                    <div class="punishment-pagination" id="bansPagination"></div>
                </div>
            </div>
        `;

        this._bindEvents();
    },

    _renderFilters() {
        return `
            <div class="punishment-filter-row">
                <div class="punishment-filter-group">
                    <label>Search</label>
                    <input type="text" id="bansFilterSearch" class="punishment-input" placeholder="Username, reason, IP..." value="${this._escapeHtml(this._filters.search || '')}">
                </div>
                <div class="punishment-filter-group">
                    <label>Date From</label>
                    <input type="date" id="bansFilterStartDate" class="punishment-input" value="${this._filters._startDateVal || ''}">
                </div>
                <div class="punishment-filter-group">
                    <label>Date To</label>
                    <input type="date" id="bansFilterEndDate" class="punishment-input" value="${this._filters._endDateVal || ''}">
                </div>
                <div class="punishment-filter-actions">
                    <button class="punishment-filter-btn" id="bansFilterApplyBtn">Apply</button>
                    <button class="punishment-filter-clear" id="bansFilterClearBtn">Clear</button>
                </div>
            </div>
        `;
    },

    _bindEvents() {
        // Tab switching
        document.querySelectorAll('#page-bans .punishment-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._activeTab = tab.dataset.tab;
                this._page = 1;
                this._filters = {};
                this.render();
                this.load();
            });
        });

        // Apply filters
        document.getElementById('bansFilterApplyBtn')?.addEventListener('click', () => this._applyFilters());

        // Clear filters
        document.getElementById('bansFilterClearBtn')?.addEventListener('click', () => {
            this._filters = {};
            this._page = 1;
            this.render();
            this.load();
        });

        // Enter key
        document.querySelectorAll('#page-bans .punishment-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._applyFilters();
            });
        });
    },

    _applyFilters() {
        const search = document.getElementById('bansFilterSearch')?.value?.trim();
        const startDateVal = document.getElementById('bansFilterStartDate')?.value;
        const endDateVal = document.getElementById('bansFilterEndDate')?.value;

        this._filters = {};
        if (search) this._filters.search = search;
        if (startDateVal) {
            this._filters.start_date = new Date(startDateVal).getTime();
            this._filters._startDateVal = startDateVal;
        }
        if (endDateVal) {
            this._filters.end_date = new Date(endDateVal + 'T23:59:59').getTime();
            this._filters._endDateVal = endDateVal;
        }

        this._page = 1;
        this.load();
    },

    _getTypesForTab() {
        switch (this._activeTab) {
            case 'active': return ['TEMP_BAN', 'PERM_BAN'];
            case 'history': return ['TEMP_BAN', 'PERM_BAN'];
            case 'ip': return ['IP_BAN'];
            default: return ['TEMP_BAN', 'PERM_BAN'];
        }
    },

    _getActiveFilter() {
        switch (this._activeTab) {
            case 'active': return 'true';
            case 'history': return 'false';
            case 'ip': return undefined; // show all IP bans
            default: return undefined;
        }
    },

    async load() {
        if (this._isLoading) return;
        this._isLoading = true;

        const tableEl = document.getElementById('bansTable');
        if (tableEl) tableEl.innerHTML = '<div class="punishment-loading">Loading...</div>';

        try {
            const types = this._getTypesForTab();
            const activeFilter = this._getActiveFilter();

            const params = {
                page: this._page,
                limit: this._limit
            };
            if (activeFilter !== undefined) params.active = activeFilter;

            // Merge search filters (strip internal-only keys)
            const filters = { ...this._filters };
            delete filters._startDateVal;
            delete filters._endDateVal;
            Object.assign(params, filters);

            const data = await API.punishments.search(types, params);

            this._punishments = data.punishments || [];
            this._total = data.total || 0;
            this._renderTable();
            this._renderPagination();
        } catch (error) {
            console.error('[Bans] Load error:', error);
            if (tableEl) {
                tableEl.innerHTML = `
                    <div class="punishment-empty">
                        <div class="punishment-empty-text">Failed to load bans: ${this._escapeHtml(error.message)}</div>
                    </div>
                `;
            }
        } finally {
            this._isLoading = false;
        }
    },

    _renderTable() {
        const tableEl = document.getElementById('bansTable');
        if (!tableEl) return;

        if (this._punishments.length === 0) {
            const label = this._activeTab === 'ip' ? 'IP bans' : 'bans';
            tableEl.innerHTML = `
                <div class="punishment-empty">
                    <div class="punishment-empty-text">No ${label} found</div>
                </div>
            `;
            return;
        }

        const showRevoke = this._activeTab !== 'history' && this._canRevoke();
        const isHistory = this._activeTab === 'history';
        const isIp = this._activeTab === 'ip';

        tableEl.innerHTML = `
            <table class="punishment-data-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Type</th>
                        <th>Reason</th>
                        <th>Issued By</th>
                        <th>Duration</th>
                        <th class="punishment-expiry-col">Expires</th>
                        ${isIp ? '<th class="punishment-ip-col">IP</th>' : ''}
                        <th>Created</th>
                        ${isHistory ? '<th>Revoked</th>' : ''}
                        ${showRevoke ? '<th>Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${this._punishments.map(p => this._renderBanRow(p, showRevoke, isHistory, isIp)).join('')}
                </tbody>
            </table>
        `;

        this._bindTableLinks(tableEl);
        if (showRevoke) this._bindRevokeButtons(tableEl);
    },

    _renderBanRow(p, showRevoke, isHistory, isIp) {
        const isActive = p.isActive;

        return `
            <tr>
                <td>
                    <a href="#players" class="punishment-player-link" data-account-id="${p.accountId}">${this._escapeHtml(p.playerUsername || 'Unknown')}</a>
                </td>
                <td>${this._typeBadge(p.punishmentType)}</td>
                <td class="punishment-reason" title="${this._escapeHtml(p.reason || '')}">${this._escapeHtml(p.reason || '—')}</td>
                <td>${this._renderStaffCell(p.issuedByStaffId, p.issuedByUsername)}</td>
                <td class="punishment-duration">${this._formatDuration(p.durationMinutes)}</td>
                <td class="punishment-expiry-col"><span class="punishment-expiry ${this._expiryClass(p.expiresAt, isActive)}">${this._formatExpiry(p.expiresAt, p.punishmentType)}</span></td>
                ${isIp ? `<td class="punishment-ip">${this._escapeHtml(p.ipAddress || '—')}</td>` : ''}
                <td class="punishment-time">${this._formatTime(p.createdAt)}</td>
                ${isHistory ? `<td>${this._renderRevokeInfo(p)}</td>` : ''}
                ${showRevoke && isActive ? `<td><button class="punishment-revoke-btn" data-punishment-id="${p.id}">Revoke</button></td>` : showRevoke ? '<td></td>' : ''}
            </tr>
        `;
    },

    _renderStaffCell(staffId, username) {
        const name = this._escapeHtml(username || '—');
        if (staffId) {
            return `<a href="#players" class="punishment-staff-link" data-staff-id="${staffId}">${name}</a>`;
        }
        return `<span class="punishment-muted">${name}</span>`;
    },

    _renderRevokeInfo(p) {
        if (p.revokedByUsername) {
            return `
                <div class="punishment-revoke-info">
                    <span class="revoke-by">by ${this._escapeHtml(p.revokedByUsername)}</span>
                    ${p.revokeReason ? `<br><span class="revoke-reason">${this._escapeHtml(p.revokeReason)}</span>` : ''}
                </div>
            `;
        }
        // Check if it expired naturally
        if (p.expiresAt && p.expiresAt < Date.now()) {
            return '<span class="punishment-muted">Expired</span>';
        }
        return '<span class="punishment-muted">—</span>';
    },

    _canRevoke() {
        return typeof Auth !== 'undefined' && Auth.hasPermission(CONFIG.PERMISSIONS.UNBAN);
    },

    _bindTableLinks(el) {
        el.querySelectorAll('.punishment-player-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const accountId = link.dataset.accountId;
                if (accountId && typeof PlayerView !== 'undefined') {
                    PlayerView.open(accountId);
                }
            });
        });

        el.querySelectorAll('.punishment-staff-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const staffId = link.dataset.staffId;
                if (staffId && typeof PlayerView !== 'undefined') {
                    PlayerView.open(staffId);
                }
            });
        });
    },

    _bindRevokeButtons(el) {
        el.querySelectorAll('.punishment-revoke-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.punishmentId;
                if (id) this._showRevokeModal(id);
            });
        });
    },

    _showRevokeModal(punishmentId) {
        // Remove existing modal if any
        document.querySelector('.punishment-revoke-modal')?.remove();

        const modal = document.createElement('div');
        modal.className = 'punishment-revoke-modal';
        modal.innerHTML = `
            <div class="punishment-revoke-modal-content">
                <div class="punishment-revoke-modal-title">Revoke Ban</div>
                <div class="punishment-revoke-modal-subtitle">Provide a reason for revoking this ban (min 10 characters)</div>
                <textarea id="revokeReasonInput" placeholder="Reason for revoking..."></textarea>
                <div class="punishment-revoke-modal-hint">
                    <span id="revokeCharCount">0</span>/10 characters minimum
                </div>
                <div class="punishment-revoke-modal-actions">
                    <button class="punishment-revoke-modal-cancel" id="revokeCancelBtn">Cancel</button>
                    <button class="punishment-revoke-modal-confirm" id="revokeConfirmBtn" disabled>Revoke Ban</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const textarea = document.getElementById('revokeReasonInput');
        const confirmBtn = document.getElementById('revokeConfirmBtn');
        const charCount = document.getElementById('revokeCharCount');

        textarea.focus();

        textarea.addEventListener('input', () => {
            const len = textarea.value.trim().length;
            charCount.textContent = len;
            confirmBtn.disabled = len < 10;
        });

        document.getElementById('revokeCancelBtn').addEventListener('click', () => modal.remove());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        confirmBtn.addEventListener('click', async () => {
            const reason = textarea.value.trim();
            if (reason.length < 10) return;

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Revoking...';

            try {
                await API.punishments.revoke(punishmentId, reason);
                modal.remove();
                if (typeof Toast !== 'undefined') {
                    Toast.success('Ban revoked successfully');
                }
                this.load();
            } catch (error) {
                console.error('[Bans] Revoke error:', error);
                if (typeof Toast !== 'undefined') {
                    Toast.error('Failed to revoke ban: ' + error.message);
                }
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Revoke Ban';
            }
        });
    },

    _renderPagination() {
        const el = document.getElementById('bansPagination');
        if (!el) return;

        const totalPages = Math.max(1, Math.ceil(this._total / this._limit));

        el.innerHTML = `
            <div class="punishment-page-info">
                Showing ${this._punishments.length} of ${this._total} entries
            </div>
            <div class="punishment-page-controls">
                <button class="punishment-page-btn" ${this._page <= 1 ? 'disabled' : ''} data-page="${this._page - 1}">Prev</button>
                <span class="punishment-page-label">Page ${this._page} of ${totalPages}</span>
                <button class="punishment-page-btn" ${this._page >= totalPages ? 'disabled' : ''} data-page="${this._page + 1}">Next</button>
            </div>
        `;

        el.querySelectorAll('.punishment-page-btn').forEach(btn => {
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

    _typeBadge(type) {
        const map = {
            'TEMP_BAN': { cls: 'temp-ban', label: 'Temp Ban' },
            'PERM_BAN': { cls: 'perm-ban', label: 'Perm Ban' },
            'IP_BAN': { cls: 'ip-ban', label: 'IP Ban' }
        };
        const info = map[type] || { cls: '', label: type };
        return `<span class="punishment-type-badge ${info.cls}">${info.label}</span>`;
    },

    _formatDuration(minutes) {
        if (!minutes) return 'Permanent';
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
        if (minutes < 10080) return `${Math.round(minutes / 1440)}d`;
        return `${Math.round(minutes / 10080)}w`;
    },

    _formatExpiry(expiresAt, type) {
        if (!expiresAt) return 'Never';
        if (type === 'PERM_BAN') return 'Never';

        const now = Date.now();
        const diff = expiresAt - now;

        if (diff <= 0) return 'Expired';

        // Relative time
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    },

    _expiryClass(expiresAt, isActive) {
        if (!expiresAt) return 'never';
        if (!isActive) return 'expired';

        const diff = expiresAt - Date.now();
        if (diff <= 0) return 'expired';
        if (diff < 86400000) return 'soon'; // < 24h
        return 'far';
    },

    _formatTime(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${date} ${time}`;
    },

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Bans;
}
