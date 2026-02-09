/* ============================================================
   ELDEROS STAFF PANEL - TIMEOUTS MANAGEMENT
   Timeouts are in-game jails for minor offences. The player
   can still log in but is sent to a jail location until the
   timeout expires.
   ============================================================ */
console.log('[Timeouts] Loading timeouts.js...');

const Timeouts = {
    _activeTab: 'active',    // 'active' | 'history'
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
        this.render();
        this.load();
    },

    onPageLeave() {},

    render() {
        const container = document.getElementById('page-timeouts');
        if (!container) return;

        container.innerHTML = `
            <div class="punishment-page">
                <div class="punishment-tabs">
                    <button class="punishment-tab ${this._activeTab === 'active' ? 'active' : ''}" data-tab="active">
                        Active Timeouts
                    </button>
                    <button class="punishment-tab ${this._activeTab === 'history' ? 'active' : ''}" data-tab="history">
                        Timeout History
                    </button>
                </div>
                <div class="punishment-filters" id="timeoutsFilters">
                    ${this._renderFilters()}
                </div>
                <div class="punishment-table-wrapper">
                    <div class="punishment-table" id="timeoutsTable">
                        <div class="punishment-loading">Loading...</div>
                    </div>
                    <div class="punishment-pagination" id="timeoutsPagination"></div>
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
                    <input type="text" id="timeoutsFilterSearch" class="punishment-input" placeholder="Username, reason..." value="${this._escapeHtml(this._filters.search || '')}">
                </div>
                <div class="punishment-filter-group">
                    <label>Date From</label>
                    <input type="date" id="timeoutsFilterStartDate" class="punishment-input" value="${this._filters._startDateVal || ''}">
                </div>
                <div class="punishment-filter-group">
                    <label>Date To</label>
                    <input type="date" id="timeoutsFilterEndDate" class="punishment-input" value="${this._filters._endDateVal || ''}">
                </div>
                <div class="punishment-filter-actions">
                    <button class="punishment-filter-btn" id="timeoutsFilterApplyBtn">Apply</button>
                    <button class="punishment-filter-clear" id="timeoutsFilterClearBtn">Clear</button>
                </div>
            </div>
        `;
    },

    _bindEvents() {
        // Tab switching
        document.querySelectorAll('#page-timeouts .punishment-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._activeTab = tab.dataset.tab;
                this._page = 1;
                this._filters = {};
                this.render();
                this.load();
            });
        });

        // Apply filters
        document.getElementById('timeoutsFilterApplyBtn')?.addEventListener('click', () => this._applyFilters());

        // Clear filters
        document.getElementById('timeoutsFilterClearBtn')?.addEventListener('click', () => {
            this._filters = {};
            this._page = 1;
            this.render();
            this.load();
        });

        // Enter key
        document.querySelectorAll('#page-timeouts .punishment-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._applyFilters();
            });
        });
    },

    _applyFilters() {
        const search = document.getElementById('timeoutsFilterSearch')?.value?.trim();
        const startDateVal = document.getElementById('timeoutsFilterStartDate')?.value;
        const endDateVal = document.getElementById('timeoutsFilterEndDate')?.value;

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

    async load() {
        if (this._isLoading) return;
        this._isLoading = true;

        const tableEl = document.getElementById('timeoutsTable');
        if (tableEl) tableEl.innerHTML = '<div class="punishment-loading">Loading...</div>';

        try {
            const types = ['TIMEOUT'];
            const activeFilter = this._activeTab === 'active' ? 'true' : 'false';

            const params = {
                page: this._page,
                limit: this._limit,
                active: activeFilter
            };

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
            console.error('[Timeouts] Load error:', error);
            if (tableEl) {
                tableEl.innerHTML = `
                    <div class="punishment-empty">
                        <div class="punishment-empty-text">Failed to load timeouts: ${this._escapeHtml(error.message)}</div>
                    </div>
                `;
            }
        } finally {
            this._isLoading = false;
        }
    },

    _renderTable() {
        const tableEl = document.getElementById('timeoutsTable');
        if (!tableEl) return;

        if (this._punishments.length === 0) {
            tableEl.innerHTML = `
                <div class="punishment-empty">
                    <div class="punishment-empty-text">No timeouts found</div>
                </div>
            `;
            return;
        }

        const showRevoke = this._activeTab === 'active' && this._canRevoke();
        const isHistory = this._activeTab === 'history';

        tableEl.innerHTML = `
            <table class="punishment-data-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Reason</th>
                        <th>Issued By</th>
                        <th>Duration</th>
                        <th class="punishment-expiry-col">Remaining</th>
                        <th>Created</th>
                        ${isHistory ? '<th>Released</th>' : ''}
                        ${showRevoke ? '<th>Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${this._punishments.map(p => this._renderRow(p, showRevoke, isHistory)).join('')}
                </tbody>
            </table>
        `;

        this._bindTableLinks(tableEl);
        if (showRevoke) this._bindRevokeButtons(tableEl);
    },

    _renderRow(p, showRevoke, isHistory) {
        const isActive = p.isActive;

        return `
            <tr>
                <td>
                    <a href="#players" class="punishment-player-link" data-account-id="${p.accountId}">${this._escapeHtml(p.playerUsername || 'Unknown')}</a>
                </td>
                <td class="punishment-reason" title="${this._escapeHtml(p.reason || '')}">${this._escapeHtml(p.reason || '—')}</td>
                <td>${this._renderStaffCell(p.issuedByStaffId, p.issuedByUsername)}</td>
                <td class="punishment-duration">${this._formatDuration(p.durationMinutes)}</td>
                <td class="punishment-expiry-col"><span class="punishment-expiry ${this._expiryClass(p.expiresAt, isActive)}">${this._formatExpiry(p.expiresAt)}</span></td>
                <td class="punishment-time">${this._formatTime(p.createdAt)}</td>
                ${isHistory ? `<td>${this._renderReleaseInfo(p)}</td>` : ''}
                ${showRevoke && isActive ? `<td><button class="punishment-revoke-btn" data-punishment-id="${p.id}">Release</button></td>` : showRevoke ? '<td></td>' : ''}
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

    _renderReleaseInfo(p) {
        if (p.revokedByUsername) {
            return `
                <div class="punishment-revoke-info">
                    <span class="revoke-by">by ${this._escapeHtml(p.revokedByUsername)}</span>
                    ${p.revokeReason ? `<br><span class="revoke-reason">${this._escapeHtml(p.revokeReason)}</span>` : ''}
                </div>
            `;
        }
        if (p.expiresAt && p.expiresAt < Date.now()) {
            return '<span class="punishment-muted">Time served</span>';
        }
        return '<span class="punishment-muted">—</span>';
    },

    _canRevoke() {
        return typeof Auth !== 'undefined' && Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_TIMEOUTS);
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
                if (id) this._showReleaseModal(id);
            });
        });
    },

    _showReleaseModal(punishmentId) {
        // Remove existing modal if any
        document.querySelector('.punishment-revoke-modal')?.remove();

        const modal = document.createElement('div');
        modal.className = 'punishment-revoke-modal';
        modal.innerHTML = `
            <div class="punishment-revoke-modal-content">
                <div class="punishment-revoke-modal-title">Release from Timeout</div>
                <div class="punishment-revoke-modal-subtitle">Provide a reason for releasing this player early (min 10 characters)</div>
                <textarea id="revokeReasonInput" placeholder="Reason for early release..."></textarea>
                <div class="punishment-revoke-modal-hint">
                    <span id="revokeCharCount">0</span>/10 characters minimum
                </div>
                <div class="punishment-revoke-modal-actions">
                    <button class="punishment-revoke-modal-cancel" id="revokeCancelBtn">Cancel</button>
                    <button class="punishment-revoke-modal-confirm" id="revokeConfirmBtn" disabled>Release Player</button>
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
            confirmBtn.textContent = 'Releasing...';

            try {
                await API.punishments.revoke(punishmentId, reason);
                modal.remove();
                if (typeof Toast !== 'undefined') {
                    Toast.success('Player released from timeout');
                }
                this.load();
            } catch (error) {
                console.error('[Timeouts] Release error:', error);
                if (typeof Toast !== 'undefined') {
                    Toast.error('Failed to release: ' + error.message);
                }
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Release Player';
            }
        });
    },

    _renderPagination() {
        const el = document.getElementById('timeoutsPagination');
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

    _formatDuration(minutes) {
        if (!minutes) return '—';
        if (minutes < 60) return `${minutes}m`;
        if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
        if (minutes < 10080) return `${Math.round(minutes / 1440)}d`;
        return `${Math.round(minutes / 10080)}w`;
    },

    _formatExpiry(expiresAt) {
        if (!expiresAt) return '—';

        const now = Date.now();
        const diff = expiresAt - now;

        if (diff <= 0) return 'Served';

        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m left`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h left`;
        const days = Math.floor(hours / 24);
        return `${days}d left`;
    },

    _expiryClass(expiresAt, isActive) {
        if (!expiresAt) return 'never';
        if (!isActive) return 'expired';

        const diff = expiresAt - Date.now();
        if (diff <= 0) return 'expired';
        if (diff < 86400000) return 'soon';
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
    module.exports = Timeouts;
}
