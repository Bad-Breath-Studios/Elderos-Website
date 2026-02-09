/* ============================================================
   ELDEROS STAFF PANEL - STAFF LOGS
   ============================================================ */
console.log('[StaffLogs] Loading staff-logs.js...');

const StaffLogs = {
    _activeTab: 'actions',
    _logs: [],
    _total: 0,
    _page: 1,
    _limit: 25,
    _filters: {},
    _isLoading: false,

    ACTION_TYPES: [
        'MESSAGE', 'WARNING', 'MUTE', 'UNMUTE', 'KICK',
        'TEMP_BAN', 'PERM_BAN', 'IP_BAN', 'UNBAN', 'TELEPORT',
        'MODIFY_PLAYER_DATA', 'COMMAND_EXECUTE'
    ],

    AUDIT_ACTION_TYPES: [
        'MODIFY_FIELD', 'COMMAND_EXECUTE'
    ],

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
        if (params.has('staff_id')) this._filters.staff_id = params.get('staff_id');
        if (params.has('action_type')) this._filters.action_type = params.get('action_type');
        if (params.has('tab')) this._activeTab = params.get('tab') === 'audit' ? 'audit' : 'actions';
    },

    render() {
        const container = document.getElementById('page-staff-logs');
        if (!container) return;

        container.innerHTML = `
            <div class="staff-logs-page">
                <div class="staff-logs-tabs">
                    <button class="staff-logs-tab ${this._activeTab === 'actions' ? 'active' : ''}" data-tab="actions">
                        Staff Actions
                    </button>
                    <button class="staff-logs-tab ${this._activeTab === 'audit' ? 'active' : ''}" data-tab="audit">
                        Audit Trail
                    </button>
                </div>
                <div class="staff-logs-filters" id="staffLogsFilters">
                    ${this._renderFilters()}
                </div>
                <div class="staff-logs-table-wrapper">
                    <div class="staff-logs-table" id="staffLogsTable">
                        <div class="staff-logs-loading">Loading...</div>
                    </div>
                    <div class="staff-logs-pagination" id="staffLogsPagination"></div>
                </div>
            </div>
        `;

        this._bindEvents();
    },

    _renderFilters() {
        const types = this._activeTab === 'actions' ? this.ACTION_TYPES : this.AUDIT_ACTION_TYPES;

        return `
            <div class="staff-logs-filter-row">
                <div class="staff-logs-filter-group">
                    <label>Action Type</label>
                    <select id="filterActionType" class="staff-logs-select">
                        <option value="">All Types</option>
                        ${types.map(t => `<option value="${t}" ${this._filters.action_type === t ? 'selected' : ''}>${this._formatActionType(t)}</option>`).join('')}
                    </select>
                </div>
                <div class="staff-logs-filter-group">
                    <label>Staff Member</label>
                    <input type="text" id="filterStaffName" class="staff-logs-input" placeholder="Staff username..." value="${this._escapeHtml(this._filters._staffName || '')}">
                </div>
                <div class="staff-logs-filter-group">
                    <label>Target Player</label>
                    <input type="text" id="filterTargetName" class="staff-logs-input" placeholder="Player username..." value="${this._escapeHtml(this._filters._targetName || '')}">
                </div>
                ${this._activeTab === 'audit' ? `
                <div class="staff-logs-filter-group">
                    <label>Search</label>
                    <input type="text" id="filterSearch" class="staff-logs-input" placeholder="Field, reason..." value="${this._escapeHtml(this._filters.search || '')}">
                </div>
                ` : ''}
                <div class="staff-logs-filter-actions">
                    <button class="staff-logs-filter-btn" id="filterApplyBtn">Apply</button>
                    <button class="staff-logs-filter-clear" id="filterClearBtn">Clear</button>
                </div>
            </div>
        `;
    },

    _bindEvents() {
        // Tab switching
        document.querySelectorAll('.staff-logs-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._activeTab = tab.dataset.tab;
                this._page = 1;
                this._filters = {};
                this.render();
                this.load();
            });
        });

        // Apply filters
        document.getElementById('filterApplyBtn')?.addEventListener('click', () => this._applyFilters());

        // Clear filters
        document.getElementById('filterClearBtn')?.addEventListener('click', () => {
            this._filters = {};
            this._page = 1;
            this.render();
            this.load();
        });

        // Enter key on inputs
        document.querySelectorAll('.staff-logs-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._applyFilters();
            });
        });
    },

    _applyFilters() {
        const actionType = document.getElementById('filterActionType')?.value;
        const staffName = document.getElementById('filterStaffName')?.value?.trim();
        const targetName = document.getElementById('filterTargetName')?.value?.trim();
        const search = document.getElementById('filterSearch')?.value?.trim();

        this._filters = {};
        if (actionType) this._filters.action_type = actionType;
        if (staffName) this._filters._staffName = staffName;
        if (targetName) this._filters._targetName = targetName;
        if (search) this._filters.search = search;

        this._page = 1;
        this.load();
    },

    async load() {
        if (this._isLoading) return;
        this._isLoading = true;

        const tableEl = document.getElementById('staffLogsTable');
        if (tableEl) tableEl.innerHTML = '<div class="staff-logs-loading">Loading...</div>';

        try {
            const filters = { ...this._filters };
            // Remove internal-only keys
            delete filters._staffName;
            delete filters._targetName;

            let data;
            if (this._activeTab === 'actions') {
                data = await API.logs.getStaffLogs(this._page, this._limit, filters);
            } else {
                data = await API.logs.getAuditLogs(this._page, this._limit, filters);
            }

            this._logs = data.logs || [];
            this._total = data.total || 0;
            this._renderTable();
            this._renderPagination();
        } catch (error) {
            console.error('[StaffLogs] Load error:', error);
            if (tableEl) {
                tableEl.innerHTML = `
                    <div class="staff-logs-empty">
                        <div class="staff-logs-empty-text">Failed to load logs: ${this._escapeHtml(error.message)}</div>
                    </div>
                `;
            }
        } finally {
            this._isLoading = false;
        }
    },

    _renderTable() {
        const tableEl = document.getElementById('staffLogsTable');
        if (!tableEl) return;

        if (this._logs.length === 0) {
            tableEl.innerHTML = `
                <div class="staff-logs-empty">
                    <div class="staff-logs-empty-text">No log entries found</div>
                </div>
            `;
            return;
        }

        if (this._activeTab === 'actions') {
            this._renderActionsTable(tableEl);
        } else {
            this._renderAuditTable(tableEl);
        }
    },

    _renderStaffCell(log) {
        const name = this._escapeHtml(log.staffUsername || '—');
        const role = log.staffRole ? log.staffRole.toLowerCase() : '';
        const hasLink = log.staffId;

        let html = '';
        if (hasLink) {
            html += `<a href="#players" class="log-staff-link" data-staff-id="${log.staffId}">${name}</a>`;
        } else {
            html += `<span class="log-staff">${name}</span>`;
        }
        if (role) {
            html += ` <span class="log-role-badge ${role}">${log.staffRole}</span>`;
        }
        return html;
    },

    _renderTargetCell(log) {
        // For COMMAND_EXECUTE, parse the world from the reason field
        if (log.actionType === 'COMMAND_EXECUTE' && !log.targetUsername && log.reason) {
            const worldMatch = log.reason.match(/^World\s+(\d+)$/i);
            if (worldMatch) {
                return `<span class="log-detail-tag">World ${this._escapeHtml(worldMatch[1])}</span>`;
            }
        }
        if (log.targetUsername) {
            return `<a href="#players" class="log-player-link" data-account-id="${log.targetAccountId || ''}">${this._escapeHtml(log.targetUsername)}</a>`;
        }
        return '<span class="log-muted">—</span>';
    },

    _isAshpire() {
        return typeof Auth !== 'undefined' && Auth.isAshpire();
    },

    _renderDeleteBtn(logId) {
        if (!this._isAshpire()) return '';
        return `<button class="log-delete-btn" data-log-id="${logId}" title="Delete log entry">&times;</button>`;
    },

    _renderActionsTable(el) {
        const showDelete = this._isAshpire();

        el.innerHTML = `
            <table class="data-table staff-logs-data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Staff</th>
                        <th>Action</th>
                        <th>Target</th>
                        <th>Reason</th>
                        <th>Details</th>
                        ${showDelete ? '<th class="log-delete-col"></th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${this._logs.map(log => `
                        <tr>
                            <td class="log-time">${this._formatTime(log.createdAt)}</td>
                            <td>${this._renderStaffCell(log)}</td>
                            <td><span class="log-action-badge ${this._getActionClass(log.actionType)}">${this._formatActionType(log.actionType)}</span></td>
                            <td>${this._renderTargetCell(log)}</td>
                            <td class="log-reason">${this._escapeHtml(log.reason || '—')}</td>
                            <td class="log-details">
                                ${log.worldType ? `<span class="log-detail-tag">${log.worldType}</span>` : ''}
                                ${log.durationMinutes ? `<span class="log-detail-tag">${log.durationMinutes}m</span>` : ''}
                            </td>
                            ${showDelete ? `<td class="log-delete-col">${this._renderDeleteBtn(log.id)}</td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this._bindTableLinks(el);
        if (showDelete) this._bindDeleteButtons(el, 'staff');
    },

    _renderAuditTable(el) {
        const showDelete = this._isAshpire();

        el.innerHTML = `
            <table class="data-table staff-logs-data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Staff</th>
                        <th>Target</th>
                        <th>Action</th>
                        <th>Field</th>
                        <th>Change</th>
                        <th>Reason</th>
                        ${showDelete ? '<th class="log-delete-col"></th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${this._logs.map(log => {
                        // For COMMAND_EXECUTE, show world in target, command details in reason
                        const isCmd = log.actionType === 'COMMAND_EXECUTE';
                        const reasonDisplay = isCmd ? this._formatCommandReason(log) : this._escapeHtml(log.reason || '—');

                        return `
                        <tr>
                            <td class="log-time">${this._formatTime(log.createdAt)}</td>
                            <td>${this._renderStaffCell(log)}</td>
                            <td>${this._renderTargetCell(log)}</td>
                            <td><span class="log-action-badge ${isCmd ? this._getActionClass('COMMAND_EXECUTE') : 'audit'}">${this._formatActionType(log.actionType)}</span></td>
                            <td class="log-field">
                                ${log.fieldName ? `<code>${this._escapeHtml(log.fieldName)}</code>` : '—'}
                                ${log.scope ? `<span class="log-detail-tag">${log.scope}</span>` : ''}
                            </td>
                            <td class="log-change">
                                ${log.oldValue != null || log.newValue != null ? `
                                    <div class="log-change-diff">
                                        <span class="log-old-value" title="Old value">${this._truncate(log.oldValue, 30)}</span>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" class="log-arrow">
                                            <line x1="5" y1="12" x2="19" y2="12"/>
                                            <polyline points="12 5 19 12 12 19"/>
                                        </svg>
                                        <span class="log-new-value" title="New value">${this._truncate(log.newValue, 30)}</span>
                                    </div>
                                ` : '—'}
                            </td>
                            <td class="log-reason">${reasonDisplay}</td>
                            ${showDelete ? `<td class="log-delete-col">${this._renderDeleteBtn(log.id)}</td>` : ''}
                        </tr>
                    `;}).join('')}
                </tbody>
            </table>
        `;

        this._bindTableLinks(el);
        if (showDelete) this._bindDeleteButtons(el, 'audit');
    },

    _formatCommandReason(log) {
        // For COMMAND_EXECUTE, the "reason" contains "World X" which we moved to Target
        // So show nothing redundant — if reason is just "World X", show "—"
        if (!log.reason) return '—';
        if (/^World\s+\d+$/i.test(log.reason)) return '—';
        return this._escapeHtml(log.reason);
    },

    _bindTableLinks(el) {
        // Player target links
        el.querySelectorAll('.log-player-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const accountId = link.dataset.accountId;
                if (accountId && typeof PlayerView !== 'undefined') {
                    PlayerView.open(accountId);
                }
            });
        });

        // Staff name links
        el.querySelectorAll('.log-staff-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const staffId = link.dataset.staffId;
                if (staffId && typeof PlayerView !== 'undefined') {
                    PlayerView.open(staffId);
                }
            });
        });
    },

    _bindDeleteButtons(el, logType) {
        el.querySelectorAll('.log-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const logId = btn.dataset.logId;
                if (!logId) return;

                if (!confirm('Delete this log entry permanently?')) return;

                btn.disabled = true;
                btn.textContent = '...';

                try {
                    if (logType === 'staff') {
                        await API.logs.deleteStaffLog(logId);
                    } else {
                        await API.logs.deleteAuditLog(logId);
                    }

                    // Remove the row with animation
                    const row = btn.closest('tr');
                    if (row) {
                        row.style.opacity = '0';
                        row.style.transition = 'opacity 0.2s ease';
                        setTimeout(() => {
                            row.remove();
                            this._total = Math.max(0, this._total - 1);
                            // Update pagination info
                            const info = document.querySelector('.staff-logs-page-info');
                            if (info) {
                                const remaining = document.querySelectorAll('.staff-logs-data-table tbody tr').length;
                                info.textContent = `Showing ${remaining} of ${this._total} entries`;
                            }
                        }, 200);
                    }
                } catch (error) {
                    console.error('[StaffLogs] Delete error:', error);
                    btn.disabled = false;
                    btn.textContent = '\u00d7';
                    if (typeof Toast !== 'undefined') {
                        Toast.error('Failed to delete log entry');
                    }
                }
            });
        });
    },

    _renderPagination() {
        const el = document.getElementById('staffLogsPagination');
        if (!el) return;

        const totalPages = Math.max(1, Math.ceil(this._total / this._limit));

        el.innerHTML = `
            <div class="staff-logs-page-info">
                Showing ${this._logs.length} of ${this._total} entries
            </div>
            <div class="staff-logs-page-controls">
                <button class="staff-logs-page-btn" ${this._page <= 1 ? 'disabled' : ''} data-page="${this._page - 1}">Prev</button>
                <span class="staff-logs-page-label">Page ${this._page} of ${totalPages}</span>
                <button class="staff-logs-page-btn" ${this._page >= totalPages ? 'disabled' : ''} data-page="${this._page + 1}">Next</button>
            </div>
        `;

        el.querySelectorAll('.staff-logs-page-btn').forEach(btn => {
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
        if (!ts) return '—';
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        if (isToday) return time;

        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${date} ${time}`;
    },

    _formatActionType(type) {
        if (!type) return '—';
        return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },

    _getActionClass(type) {
        if (!type) return '';
        const map = {
            'MUTE': 'warning',
            'UNMUTE': 'info',
            'KICK': 'warning',
            'TEMP_BAN': 'danger',
            'PERM_BAN': 'danger',
            'IP_BAN': 'danger',
            'UNBAN': 'success',
            'WARNING': 'warning',
            'MESSAGE': 'info',
            'TELEPORT': 'info',
            'MODIFY_PLAYER_DATA': 'neutral',
            'COMMAND_EXECUTE': 'neutral'
        };
        return map[type] || 'neutral';
    },

    _truncate(str, max) {
        if (!str && str !== '') return '<span class="log-muted">null</span>';
        if (!str) return '<span class="log-muted">empty</span>';
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

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StaffLogs;
}
