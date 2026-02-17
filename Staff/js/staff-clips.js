/* ============================================================
   ELDEROS STAFF PANEL — TOP 10 CLIPS ADMIN
   ============================================================ */
console.log('[StaffClips] Loading staff-clips.js...');

const StaffClips = {
    _currentSubTab: 'submissions',
    _subTabs: ['submissions', 'users', 'periods', 'blacklist', 'audit', 'payouts'],

    // Data per sub-tab
    _submissions: [], _submissionsPage: 1,
    _users: [], _usersPage: 1, _usersSearch: '',
    _periods: [], _periodsPage: 1,
    _blacklist: [], _blacklistPage: 1,
    _audit: [], _auditPage: 1,
    _payouts: [], _payoutsPage: 1, _payoutsPeriodId: null,

    // ── Init ──
    init() {
        const page = document.getElementById('page-clips');
        if (!page) return;
        page.innerHTML = this._buildPageHTML();
        this._bindSubTabs();
        console.log('[StaffClips] Initialized');
    },

    onPageLoad() {
        this._loadCurrentSubTab();
    },

    onPageLeave() {
        // Cleanup if needed
    },

    // ── Page HTML ──
    _buildPageHTML() {
        return `
            <div class="clips-subtabs">
                ${this._subTabs.map(t => `<button class="clips-subtab ${t === 'submissions' ? 'active' : ''}" data-subtab="${t}">${this._subtabLabel(t)}</button>`).join('')}
            </div>
            <div id="clips-subtab-content"></div>`;
    },

    _subtabLabel(t) {
        const labels = { submissions: 'Submissions', users: 'Users', periods: 'Periods', blacklist: 'IP Blacklist', audit: 'Audit Log', payouts: 'Payouts' };
        return labels[t] || t;
    },

    _bindSubTabs() {
        document.querySelectorAll('.clips-subtab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.subtab === this._currentSubTab) return;
                this._currentSubTab = btn.dataset.subtab;
                document.querySelectorAll('.clips-subtab').forEach(b => b.classList.toggle('active', b.dataset.subtab === this._currentSubTab));
                this._loadCurrentSubTab();
            });
        });
    },

    _loadCurrentSubTab() {
        const c = document.getElementById('clips-subtab-content');
        if (!c) return;
        c.innerHTML = '<div class="clips-empty">Loading...</div>';

        switch (this._currentSubTab) {
            case 'submissions': this._loadSubmissions(); break;
            case 'users': this._loadUsers(); break;
            case 'periods': this._loadPeriods(); break;
            case 'blacklist': this._loadBlacklist(); break;
            case 'audit': this._loadAudit(); break;
            case 'payouts': this._loadPayouts(); break;
        }
    },

    // ── Submissions ──
    async _loadSubmissions() {
        const c = document.getElementById('clips-subtab-content');
        try {
            const data = await API.clips.getSubmissions({ page: this._submissionsPage, limit: 25 });
            this._submissions = data.submissions || [];
            c.innerHTML = this._renderSubmissionsToolbar() + this._renderSubmissionsTable() + this._renderPagination('submissions', this._submissionsPage, data.totalPages || 1);
            this._bindSubmissionActions();
        } catch (e) {
            c.innerHTML = `<div class="clips-empty">Failed to load submissions: ${e.message}</div>`;
        }
    },

    _renderSubmissionsToolbar() {
        return `<div class="clips-toolbar">
            <div class="clips-toolbar-left">
                <select class="clips-filter-select" id="clips-sub-status-filter">
                    <option value="">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="REMOVED">Removed</option>
                </select>
            </div>
        </div>`;
    },

    _renderSubmissionsTable() {
        if (!this._submissions.length) return '<div class="clips-empty">No submissions found</div>';
        return `<table class="clips-table">
            <thead><tr><th>ID</th><th>Video</th><th>User</th><th>Votes</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>${this._submissions.map(s => `<tr>
                <td>${s.id}</td>
                <td class="title-cell"><a class="video-link" href="https://youtube.com/watch?v=${this._esc(s.youtubeVideoId)}" target="_blank">${this._esc(s.title || s.youtubeVideoId)}</a></td>
                <td>${this._esc(s.username || 'ID:' + s.userId)}</td>
                <td>${s.voteCount || 0}</td>
                <td><span class="clips-status ${(s.status || '').toLowerCase()}">${s.status || '?'}</span></td>
                <td>${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'}</td>
                <td><div class="clips-row-actions">
                    ${s.status === 'PENDING' ? `<button class="clips-row-btn approve" data-id="${s.id}" data-action="approve">Approve</button>` : ''}
                    ${s.status !== 'REMOVED' ? `<button class="clips-row-btn remove" data-id="${s.id}" data-action="remove">Remove</button>` : ''}
                </div></td>
            </tr>`).join('')}</tbody>
        </table>`;
    },

    _bindSubmissionActions() {
        document.querySelectorAll('.clips-row-btn[data-action="approve"]').forEach(btn => {
            btn.addEventListener('click', () => this._moderateSubmission(btn.dataset.id, 'approve'));
        });
        document.querySelectorAll('.clips-row-btn[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', () => this._moderateSubmission(btn.dataset.id, 'remove'));
        });

        const filter = document.getElementById('clips-sub-status-filter');
        if (filter) {
            filter.addEventListener('change', () => {
                this._submissionsPage = 1;
                this._loadSubmissions();
            });
        }
    },

    async _moderateSubmission(id, action) {
        if (!confirm(`${action === 'approve' ? 'Approve' : 'Remove'} this submission?`)) return;
        try {
            if (action === 'approve') {
                await API.clips.approveSubmission(id);
            } else {
                await API.clips.removeSubmission(id);
            }
            Popup.toast(`Submission ${action}d`, 'success');
            this._loadSubmissions();
        } catch (e) {
            Popup.toast(e.message || `Failed to ${action}`, 'error');
        }
    },

    // ── Users ──
    async _loadUsers() {
        const c = document.getElementById('clips-subtab-content');
        c.innerHTML = `<div class="clips-toolbar">
            <div class="clips-toolbar-left">
                <input class="clips-search-input" id="clips-user-search" placeholder="Search username or ID..." value="${this._esc(this._usersSearch)}">
                <button class="clips-btn clips-btn-secondary" id="clips-user-search-btn">Search</button>
            </div>
        </div><div id="clips-users-table"><div class="clips-empty">Search for a user to manage their clips access</div></div>`;

        document.getElementById('clips-user-search-btn').addEventListener('click', () => this._searchUsers());
        document.getElementById('clips-user-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._searchUsers();
        });

        if (this._usersSearch) this._searchUsers();
    },

    async _searchUsers() {
        const input = document.getElementById('clips-user-search');
        this._usersSearch = (input ? input.value : '').trim();
        if (!this._usersSearch) return;

        const table = document.getElementById('clips-users-table');
        table.innerHTML = '<div class="clips-empty">Searching...</div>';

        try {
            const data = await API.clips.searchUsers(this._usersSearch);
            const users = data.users || [];
            if (!users.length) {
                table.innerHTML = '<div class="clips-empty">No users found</div>';
                return;
            }
            table.innerHTML = `<table class="clips-table">
                <thead><tr><th>ID</th><th>Username</th><th>Submissions</th><th>Votes</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${users.map(u => `<tr>
                    <td>${u.id}</td>
                    <td>${this._esc(u.username)}</td>
                    <td>${u.totalSubmissions || 0}</td>
                    <td>${u.totalVotes || 0}</td>
                    <td>${u.blocked ? '<span class="clips-status blocked">Blocked</span>' : '<span class="clips-status approved">Active</span>'}</td>
                    <td><div class="clips-row-actions">
                        ${u.blocked
                            ? `<button class="clips-row-btn approve" data-uid="${u.id}" data-action="unblock">Unblock</button>`
                            : `<button class="clips-row-btn remove" data-uid="${u.id}" data-action="block">Block</button>
                               <button class="clips-row-btn" data-uid="${u.id}" data-action="warn">Warn</button>`}
                        <button class="clips-row-btn remove" data-uid="${u.id}" data-action="clear-subs">Clear Subs</button>
                    </div></td>
                </tr>`).join('')}</tbody>
            </table>`;

            this._bindUserActions();
        } catch (e) {
            table.innerHTML = `<div class="clips-empty">Search failed: ${e.message}</div>`;
        }
    },

    _bindUserActions() {
        document.querySelectorAll('.clips-row-btn[data-uid]').forEach(btn => {
            btn.addEventListener('click', () => {
                const uid = btn.dataset.uid;
                const action = btn.dataset.action;
                if (action === 'block') this._blockUser(uid, 'BLOCK');
                else if (action === 'warn') this._blockUser(uid, 'WARN');
                else if (action === 'unblock') this._unblockUser(uid);
                else if (action === 'clear-subs') this._clearUserSubmissions(uid);
            });
        });
    },

    async _blockUser(userId, type) {
        const reason = prompt(`Enter reason for ${type.toLowerCase()}:`);
        if (!reason) return;
        try {
            await API.clips.blockUser(userId, type, reason);
            Popup.toast(`User ${type.toLowerCase()}ed`, 'success');
            this._searchUsers();
        } catch (e) {
            Popup.toast(e.message || 'Failed', 'error');
        }
    },

    async _unblockUser(userId) {
        if (!confirm('Unblock this user?')) return;
        try {
            await API.clips.unblockUser(userId);
            Popup.toast('User unblocked', 'success');
            this._searchUsers();
        } catch (e) {
            Popup.toast(e.message || 'Failed', 'error');
        }
    },

    async _clearUserSubmissions(userId) {
        if (!confirm('Delete ALL submissions for this user? This cannot be undone.')) return;
        try {
            await API.clips.clearUserSubmissions(userId);
            Popup.toast('Submissions cleared', 'success');
            this._searchUsers();
        } catch (e) {
            Popup.toast(e.message || 'Failed', 'error');
        }
    },

    // ── Periods ──
    async _loadPeriods() {
        const c = document.getElementById('clips-subtab-content');
        try {
            const data = await API.clips.getPeriods({ page: this._periodsPage, limit: 20 });
            this._periods = data.periods || [];
            c.innerHTML = `<div class="clips-toolbar">
                <div class="clips-toolbar-left"></div>
                <div class="clips-toolbar-right">
                    <button class="clips-btn clips-btn-primary" id="clips-create-period-btn">+ Create Period</button>
                </div>
            </div>` + this._renderPeriodsTable() + this._renderPagination('periods', this._periodsPage, data.totalPages || 1);
            this._bindPeriodActions();
        } catch (e) {
            c.innerHTML = `<div class="clips-empty">Failed to load periods: ${e.message}</div>`;
        }
    },

    _renderPeriodsTable() {
        if (!this._periods.length) return '<div class="clips-empty">No periods found</div>';
        return `<table class="clips-table">
            <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${this._periods.map(p => `<tr>
                <td>${p.id}</td>
                <td>${this._esc(p.title || 'Untitled')}</td>
                <td>${p.periodType || '-'}</td>
                <td>${p.startDate ? new Date(p.startDate).toLocaleDateString() : '-'}</td>
                <td>${p.endDate ? new Date(p.endDate).toLocaleDateString() : '-'}</td>
                <td><span class="clips-status ${(p.status || '').toLowerCase()}">${p.status || '?'}</span></td>
                <td><div class="clips-row-actions">
                    ${p.status === 'ACTIVE' ? `<button class="clips-row-btn finalize" data-pid="${p.id}" data-action="finalize">Finalize</button>` : ''}
                    ${p.status === 'FINALIZED' ? `<button class="clips-row-btn" data-pid="${p.id}" data-action="archive">Archive</button>` : ''}
                </div></td>
            </tr>`).join('')}</tbody>
        </table>`;
    },

    _bindPeriodActions() {
        document.getElementById('clips-create-period-btn')?.addEventListener('click', () => this._showCreatePeriodModal());

        document.querySelectorAll('.clips-row-btn[data-pid]').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.dataset.pid;
                const action = btn.dataset.action;
                if (action === 'finalize') this._finalizePeriod(pid);
                else if (action === 'archive') this._archivePeriod(pid);
            });
        });

        // Pagination
        this._bindPaginationButtons('periods');
    },

    async _finalizePeriod(periodId) {
        if (!confirm('Finalize this period? This will calculate rankings and notify winners. This cannot be undone.')) return;
        try {
            await API.clips.finalizePeriod(periodId);
            Popup.toast('Period finalized', 'success');
            this._loadPeriods();
        } catch (e) {
            Popup.toast(e.message || 'Failed to finalize', 'error');
        }
    },

    async _archivePeriod(periodId) {
        if (!confirm('Archive this period?')) return;
        try {
            await API.clips.archivePeriod(periodId);
            Popup.toast('Period archived', 'success');
            this._loadPeriods();
        } catch (e) {
            Popup.toast(e.message || 'Failed to archive', 'error');
        }
    },

    _showCreatePeriodModal() {
        const now = new Date();
        const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const fmt = d => d.toISOString().split('T')[0];

        this._showModal('Create Period', `
            <div class="form-row">
                <label>Title</label>
                <input type="text" id="cp-title" placeholder="Top 10 Clips — Week of Feb 17">
            </div>
            <div class="form-row">
                <label>Period Type</label>
                <select id="cp-type">
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                </select>
            </div>
            <div class="form-row">
                <label>Start Date</label>
                <input type="date" id="cp-start" value="${fmt(now)}">
            </div>
            <div class="form-row">
                <label>End Date</label>
                <input type="date" id="cp-end" value="${fmt(twoWeeks)}">
            </div>
        `, async () => {
            const title = document.getElementById('cp-title').value.trim();
            const type = document.getElementById('cp-type').value;
            const start = document.getElementById('cp-start').value;
            const end = document.getElementById('cp-end').value;
            if (!title || !start || !end) return Popup.toast('Fill all fields', 'error');

            await API.clips.createPeriod({ title, periodType: type, startDate: new Date(start).getTime(), endDate: new Date(end + 'T23:59:59').getTime() });
            Popup.toast('Period created', 'success');
            this._loadPeriods();
        });
    },

    // ── IP Blacklist ──
    async _loadBlacklist() {
        const c = document.getElementById('clips-subtab-content');
        try {
            const data = await API.clips.getBlacklist();
            this._blacklist = data.entries || [];
            c.innerHTML = `<div class="clips-toolbar">
                <div class="clips-toolbar-left"></div>
                <div class="clips-toolbar-right">
                    <button class="clips-btn clips-btn-primary" id="clips-add-ip-btn">+ Add IP</button>
                </div>
            </div>` + this._renderBlacklistTable();
            this._bindBlacklistActions();
        } catch (e) {
            c.innerHTML = `<div class="clips-empty">Failed to load blacklist: ${e.message}</div>`;
        }
    },

    _renderBlacklistTable() {
        if (!this._blacklist.length) return '<div class="clips-empty">No blacklisted IPs</div>';
        return `<table class="clips-table">
            <thead><tr><th>IP Address</th><th>Reason</th><th>Added By</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${this._blacklist.map(e => `<tr>
                <td style="font-family:monospace">${this._esc(e.ipAddress)}</td>
                <td>${this._esc(e.reason || '-')}</td>
                <td>${this._esc(e.addedByName || 'ID:' + e.addedBy)}</td>
                <td>${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'}</td>
                <td><button class="clips-row-btn remove" data-bl-id="${e.id}">Remove</button></td>
            </tr>`).join('')}</tbody>
        </table>`;
    },

    _bindBlacklistActions() {
        document.getElementById('clips-add-ip-btn')?.addEventListener('click', () => {
            this._showModal('Add IP to Blacklist', `
                <div class="form-row">
                    <label>IP Address</label>
                    <input type="text" id="bl-ip" placeholder="192.168.1.1">
                </div>
                <div class="form-row">
                    <label>Reason</label>
                    <input type="text" id="bl-reason" placeholder="Vote manipulation">
                </div>
            `, async () => {
                const ip = document.getElementById('bl-ip').value.trim();
                const reason = document.getElementById('bl-reason').value.trim();
                if (!ip) return Popup.toast('Enter an IP address', 'error');
                await API.clips.addToBlacklist(ip, reason);
                Popup.toast('IP blacklisted', 'success');
                this._loadBlacklist();
            });
        });

        document.querySelectorAll('.clips-row-btn[data-bl-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Remove this IP from the blacklist?')) return;
                try {
                    await API.clips.removeFromBlacklist(btn.dataset.blId);
                    Popup.toast('IP removed', 'success');
                    this._loadBlacklist();
                } catch (e) {
                    Popup.toast(e.message || 'Failed', 'error');
                }
            });
        });
    },

    // ── Audit Log ──
    async _loadAudit() {
        const c = document.getElementById('clips-subtab-content');
        try {
            const data = await API.clips.getAuditLog({ page: this._auditPage, limit: 50 });
            this._audit = data.entries || [];
            c.innerHTML = this._renderAuditTable() + this._renderPagination('audit', this._auditPage, data.totalPages || 1);
            this._bindPaginationButtons('audit');
        } catch (e) {
            c.innerHTML = `<div class="clips-empty">Failed to load audit log: ${e.message}</div>`;
        }
    },

    _renderAuditTable() {
        if (!this._audit.length) return '<div class="clips-empty">No audit entries</div>';
        return `<table class="clips-table">
            <thead><tr><th>Time</th><th>Action</th><th>Target</th><th>Performed By</th><th>Details</th></tr></thead>
            <tbody>${this._audit.map(e => `<tr>
                <td>${e.createdAt ? new Date(e.createdAt).toLocaleString() : '-'}</td>
                <td><span class="clips-status ${(e.action || '').toLowerCase()}">${e.action || '?'}</span></td>
                <td>${e.targetType || ''} #${e.targetId || ''}</td>
                <td>${this._esc(e.performedByName || 'ID:' + e.performedBy)}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this._esc(e.details || '')}">${this._esc(e.details || '-')}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    },

    // ── Payouts ──
    async _loadPayouts() {
        const c = document.getElementById('clips-subtab-content');
        try {
            // First load finalized periods to let admin select which one
            const periodsData = await API.clips.getPeriods({ status: 'FINALIZED', limit: 50 });
            const periods = periodsData.periods || [];

            if (!periods.length) {
                c.innerHTML = '<div class="clips-empty">No finalized periods with payouts</div>';
                return;
            }

            if (!this._payoutsPeriodId) this._payoutsPeriodId = periods[0].id;

            const data = await API.clips.getPayouts(this._payoutsPeriodId);
            this._payouts = data.results || [];

            const periodOptions = periods.map(p => `<option value="${p.id}" ${p.id == this._payoutsPeriodId ? 'selected' : ''}>${this._esc(p.title || 'Period #' + p.id)}</option>`).join('');

            c.innerHTML = `<div class="clips-toolbar">
                <div class="clips-toolbar-left">
                    <select class="clips-filter-select" id="clips-payout-period">${periodOptions}</select>
                </div>
            </div>` + this._renderPayoutsTable();

            document.getElementById('clips-payout-period')?.addEventListener('change', (e) => {
                this._payoutsPeriodId = e.target.value;
                this._loadPayouts();
            });

            this._bindPayoutActions();
        } catch (e) {
            c.innerHTML = `<div class="clips-empty">Failed to load payouts: ${e.message}</div>`;
        }
    },

    _renderPayoutsTable() {
        if (!this._payouts.length) return '<div class="clips-empty">No results for this period</div>';
        return `<table class="clips-table">
            <thead><tr><th>Rank</th><th>User</th><th>Video</th><th>Votes</th><th>Prize</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${this._payouts.map(r => `<tr>
                <td style="font-weight:700">#${r.finalRank}</td>
                <td>${this._esc(r.username || 'ID:' + r.userId)}</td>
                <td class="title-cell">${this._esc(r.videoTitle || '-')}</td>
                <td>${r.voteCount || 0}</td>
                <td style="color:var(--accent)">${this._esc(r.prizeValue || '-')}</td>
                <td><span class="clips-status ${(r.payoutStatus || 'unpaid').toLowerCase()}">${r.payoutStatus || 'UNPAID'}</span></td>
                <td>${r.payoutStatus !== 'PAID' ? `<button class="clips-row-btn approve" data-result-id="${r.id}" data-action="mark-paid">Mark Paid</button>` : ''}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    },

    _bindPayoutActions() {
        document.querySelectorAll('.clips-row-btn[data-result-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Mark this prize as paid?')) return;
                try {
                    await API.clips.markPaid(btn.dataset.resultId);
                    Popup.toast('Marked as paid', 'success');
                    this._loadPayouts();
                } catch (e) {
                    Popup.toast(e.message || 'Failed', 'error');
                }
            });
        });
    },

    // ── Pagination Helper ──
    _renderPagination(type, currentPage, totalPages) {
        if (totalPages <= 1) return '';
        return `<div class="clips-pagination">
            <button class="clips-page-btn" data-page-type="${type}" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>&laquo; Prev</button>
            <span class="clips-page-info">Page ${currentPage} of ${totalPages}</span>
            <button class="clips-page-btn" data-page-type="${type}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>Next &raquo;</button>
        </div>`;
    },

    _bindPaginationButtons(type) {
        document.querySelectorAll(`.clips-page-btn[data-page-type="${type}"]`).forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (isNaN(page) || page < 1) return;
                switch (type) {
                    case 'submissions': this._submissionsPage = page; this._loadSubmissions(); break;
                    case 'periods': this._periodsPage = page; this._loadPeriods(); break;
                    case 'audit': this._auditPage = page; this._loadAudit(); break;
                    case 'payouts': this._payoutsPage = page; this._loadPayouts(); break;
                }
            });
        });
    },

    // ── Modal Helper ──
    _showModal(title, bodyHtml, onConfirm) {
        document.querySelectorAll('.clips-modal-overlay').forEach(m => m.remove());

        const overlay = document.createElement('div');
        overlay.className = 'clips-modal-overlay';
        overlay.innerHTML = `<div class="clips-modal">
            <h3>${this._esc(title)}</h3>
            ${bodyHtml}
            <div class="form-actions">
                <button class="clips-btn clips-btn-secondary" id="clips-modal-cancel">Cancel</button>
                <button class="clips-btn clips-btn-primary" id="clips-modal-confirm">Confirm</button>
            </div>
        </div>`;

        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);

        document.getElementById('clips-modal-cancel').addEventListener('click', () => overlay.remove());
        document.getElementById('clips-modal-confirm').addEventListener('click', async () => {
            const btn = document.getElementById('clips-modal-confirm');
            btn.disabled = true;
            btn.textContent = 'Processing...';
            try {
                await onConfirm();
                overlay.remove();
            } catch (e) {
                Popup.toast(e.message || 'Operation failed', 'error');
                btn.disabled = false;
                btn.textContent = 'Confirm';
            }
        });
    },

    // ── Util ──
    _esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
};
