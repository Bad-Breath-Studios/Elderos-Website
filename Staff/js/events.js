/* ============================================================
   ELDEROS STAFF PANEL — EVENT SCHEDULER
   ============================================================ */
console.log('[Events] Loading events.js...');

const Events = {
    _pollTimer: null,
    _countdownTimer: null,
    _currentView: 'list',
    _events: [],
    _activeEvents: [],
    _history: [],
    _templates: [],
    _listPage: 1,
    _historyPage: 1,
    _calendarWeekStart: null, // Monday of displayed week
    _editingEventId: null,

    // Event type metadata
    TYPES: {
        XP_BOOST:        { label: 'XP Boost',    icon: '\u26A1', css: 'xp_boost' },
        DROP_RATE:       { label: 'Drop Rate',    icon: '\uD83C\uDF40', css: 'drop_rate' },
        BOSS_MASS:       { label: 'Boss Mass',    icon: '\uD83D\uDC80', css: 'boss_mass' },
        PVP_TOURNAMENT:  { label: 'PvP',          icon: '\u2694\uFE0F', css: 'pvp_tournament' },
        SKILL_COMP:      { label: 'Skill Comp',   icon: '\u26CF\uFE0F', css: 'skill_comp' },
        DOUBLE_VOTE:     { label: 'Vote',         icon: '\uD83D\uDDF3\uFE0F', css: 'double_vote' },
        COMMUNITY_GOAL:  { label: 'Community',    icon: '\uD83C\uDFAF', css: 'community_goal' },
        CUSTOM:          { label: 'Custom',       icon: '\uD83D\uDD27', css: 'custom' }
    },

    SKILLS: [
        'All Skills', 'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged', 'Prayer',
        'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking',
        'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving',
        'Slayer', 'Farming', 'Runecrafting', 'Hunter', 'Construction'
    ],

    DURATION_PRESETS: [
        { label: '15 minutes', value: 15 },
        { label: '30 minutes', value: 30 },
        { label: '45 minutes', value: 45 },
        { label: '1 hour', value: 60 },
        { label: '2 hours', value: 120 },
        { label: '3 hours', value: 180 },
        { label: '6 hours', value: 360 },
        { label: '12 hours', value: 720 },
        { label: '24 hours', value: 1440 },
        { label: '48 hours', value: 2880 }
    ],

    REPEAT_PRESETS: [
        { label: 'One-time (no repeat)', value: 0 },
        { label: 'Every 4 hours', value: 240 },
        { label: 'Every 6 hours', value: 360 },
        { label: 'Every 8 hours', value: 480 },
        { label: 'Every 12 hours', value: 720 },
        { label: 'Daily', value: 1440 },
        { label: 'Weekly', value: 10080 }
    ],

    // ── Init ──
    init() {
        const page = document.getElementById('page-events');
        if (!page) return;
        page.innerHTML = this._buildPageHTML();
        this._bindEvents();
        console.log('[Events] Initialized');
    },

    onPageLoad() {
        this._loadActiveEvents();
        this._loadListView();
        this._startPolling();
    },

    onPageLeave() {
        this._stopPolling();
    },

    // ── Polling ──
    _startPolling() {
        this._stopPolling();
        this._pollTimer = setInterval(() => this._loadActiveEvents(), 30000);
        this._countdownTimer = setInterval(() => this._tickCountdowns(), 1000);
    },

    _stopPolling() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
        if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
    },

    // ── Page HTML ──
    _buildPageHTML() {
        const canCreate = Auth.hasPermission(CONFIG.PERMISSIONS.CREATE_EVENT);
        return `
            <div class="events-header">
                <div class="events-header-title">Event Scheduler</div>
                <div class="events-header-actions">
                    ${canCreate ? `
                        <button class="btn btn-secondary" id="evtFromTemplate">From Template</button>
                        <button class="btn btn-primary" id="evtCreateBtn">+ Create Event</button>
                    ` : ''}
                </div>
            </div>

            <div class="active-events-strip" id="evtActiveStrip"></div>

            <div class="events-view-tabs">
                <button class="events-view-tab active" data-view="list">List</button>
                <button class="events-view-tab" data-view="calendar">Calendar</button>
                <button class="events-view-tab" data-view="history">History</button>
                ${canCreate ? '<button class="events-view-tab" data-view="templates">Templates</button>' : ''}
            </div>

            <div class="events-view visible" id="evtViewList">
                <div id="evtListContent"><div class="events-loading"><div class="events-loading-spinner"></div>Loading events...</div></div>
            </div>
            <div class="events-view" id="evtViewCalendar">
                <div id="evtCalendarContent"></div>
            </div>
            <div class="events-view" id="evtViewHistory">
                <div id="evtHistoryContent"><div class="events-loading"><div class="events-loading-spinner"></div>Loading history...</div></div>
            </div>
            <div class="events-view" id="evtViewTemplates">
                <div id="evtTemplatesContent"></div>
            </div>
        `;
    },

    _bindEvents() {
        const page = document.getElementById('page-events');
        if (!page) return;

        // View tabs
        page.querySelectorAll('.events-view-tab').forEach(tab => {
            tab.addEventListener('click', () => this._switchView(tab.dataset.view));
        });

        // Create button
        const createBtn = document.getElementById('evtCreateBtn');
        if (createBtn) createBtn.addEventListener('click', () => this._openCreateModal());

        // From template
        const tplBtn = document.getElementById('evtFromTemplate');
        if (tplBtn) tplBtn.addEventListener('click', () => {
            this._switchView('templates');
        });
    },

    // ── View Switching ──
    _switchView(view) {
        this._currentView = view;
        document.querySelectorAll('.events-view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
        document.querySelectorAll('.events-view').forEach(v => v.classList.remove('visible'));
        const target = document.getElementById('evtView' + view.charAt(0).toUpperCase() + view.slice(1));
        if (target) target.classList.add('visible');

        switch (view) {
            case 'list': this._loadListView(); break;
            case 'calendar': this._loadCalendarView(); break;
            case 'history': this._loadHistoryView(); break;
            case 'templates': this._loadTemplatesView(); break;
        }
    },

    // ── Active Events Strip ──
    async _loadActiveEvents() {
        try {
            const data = await API.events.getActive();
            this._activeEvents = data.events || [];
            this._renderActiveStrip();
        } catch (e) {
            console.error('[Events] Failed to load active events:', e);
        }
    },

    _renderActiveStrip() {
        const strip = document.getElementById('evtActiveStrip');
        if (!strip) return;
        if (!this._activeEvents.length) { strip.innerHTML = ''; return; }

        strip.innerHTML = this._activeEvents.map(evt => {
            const type = this.TYPES[evt.eventType] || this.TYPES.CUSTOM;
            const remaining = evt.endTimeMillis - Date.now();
            const worlds = this._renderWorldPills(evt.targetWorlds);
            return `
                <div class="active-event-card" data-event-id="${evt.id}" data-end="${evt.endTimeMillis}">
                    <span class="active-event-icon">${type.icon}</span>
                    <div class="active-event-info">
                        <div class="active-event-name">${this._esc(evt.name)}</div>
                        <div class="active-event-meta">${type.label} &middot; by ${this._esc(evt.createdByUsername || 'Unknown')}</div>
                        <div class="active-event-worlds">${worlds}</div>
                    </div>
                    <div class="active-event-timer" data-end="${evt.endTimeMillis}">${this._formatCountdown(remaining)}</div>
                </div>
            `;
        }).join('');
    },

    _tickCountdowns() {
        document.querySelectorAll('.active-event-timer[data-end]').forEach(el => {
            const end = parseInt(el.dataset.end);
            const remaining = end - Date.now();
            el.textContent = this._formatCountdown(remaining);
        });
    },

    _formatCountdown(ms) {
        if (ms <= 0) return '0:00:00';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    // ── List View ──
    async _loadListView() {
        const container = document.getElementById('evtListContent');
        if (!container) return;
        container.innerHTML = '<div class="events-loading"><div class="events-loading-spinner"></div>Loading events...</div>';

        try {
            const data = await API.events.getAll({ page: this._listPage, limit: 20 });
            this._events = data.events || [];
            const total = data.total || 0;
            this._renderListView(total);
        } catch (e) {
            container.innerHTML = `<div class="events-empty"><div class="events-empty-title">Failed to load events</div><div class="events-empty-text">${this._esc(e.message)}</div></div>`;
        }
    },

    _renderListView(total) {
        const container = document.getElementById('evtListContent');
        if (!container) return;

        if (!this._events.length) {
            container.innerHTML = `<div class="events-empty"><div class="events-empty-icon">&#x1F4C5;</div><div class="events-empty-title">No events</div><div class="events-empty-text">Create your first event to get started</div></div>`;
            return;
        }

        const canManage = Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_EVENTS);
        const canCreate = Auth.hasPermission(CONFIG.PERMISSIONS.CREATE_EVENT);

        const rows = this._events.map(evt => {
            const type = this.TYPES[evt.eventType] || this.TYPES.CUSTOM;
            const statusCss = (evt.status || '').toLowerCase();
            const statusLabel = evt.status === 'ACTIVE' ? 'Live' : evt.status === 'SCHEDULED' ? 'Scheduled' : evt.status === 'CANCELLED' ? 'Cancelled' : 'Ended';
            const worlds = this._renderWorldPills(evt.targetWorlds);
            const repeat = evt.repeatIntervalMinutes > 0 ? this._formatRepeat(evt.repeatIntervalMinutes) : 'One-time';
            const repeatCss = evt.repeatIntervalMinutes > 0 ? 'has-repeat' : '';
            const time = this._formatSchedule(evt);

            let actions = '';
            if (evt.status === 'ACTIVE' && canManage) {
                actions = `<button class="evt-action-btn stop" data-action="stop" data-id="${evt.id}">Stop</button>`;
            } else if (evt.status === 'SCHEDULED') {
                if (canManage) actions += `<button class="evt-action-btn" data-action="edit" data-id="${evt.id}">Edit</button>`;
                if (canCreate) actions += `<button class="evt-action-btn start" data-action="start" data-id="${evt.id}">Start Now</button>`;
                if (canManage) actions += `<button class="evt-action-btn stop" data-action="delete" data-id="${evt.id}">Delete</button>`;
            } else if ((evt.status === 'ENDED' || evt.status === 'CANCELLED') && canManage) {
                actions += `<button class="evt-action-btn stop" data-action="delete" data-id="${evt.id}">Delete</button>`;
            }

            return `<tr>
                <td class="evt-name">${this._esc(evt.name)}</td>
                <td><span class="evt-type-pill ${type.css}">${type.label}</span></td>
                <td><div class="evt-worlds">${worlds}</div></td>
                <td><span class="evt-time">${time.primary}<span class="evt-time-sub">${time.sub}</span></span></td>
                <td><span class="evt-repeat ${repeatCss}">${repeat}</span></td>
                <td><span class="evt-status ${statusCss}"><span class="evt-status-dot ${statusCss}"></span> ${statusLabel}</span></td>
                <td><span class="evt-created-by">${this._esc(evt.createdByUsername || 'Unknown')}</span></td>
                <td><div class="evt-actions">${actions}</div></td>
            </tr>`;
        }).join('');

        const totalPages = Math.ceil(total / 20);
        const pagination = totalPages > 1 ? `
            <div class="events-pagination">
                <button class="events-pagination-btn" data-page="${this._listPage - 1}" ${this._listPage <= 1 ? 'disabled' : ''}>Prev</button>
                <span class="events-pagination-info">Page ${this._listPage} of ${totalPages}</span>
                <button class="events-pagination-btn" data-page="${this._listPage + 1}" ${this._listPage >= totalPages ? 'disabled' : ''}>Next</button>
            </div>` : '';

        container.innerHTML = `
            <table class="events-table">
                <thead><tr><th>Event</th><th>Type</th><th>Worlds</th><th>Schedule</th><th>Repeat</th><th>Status</th><th>Created By</th><th>Actions</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${pagination}
        `;

        // Bind action buttons
        container.querySelectorAll('.evt-action-btn').forEach(btn => {
            btn.addEventListener('click', () => this._handleAction(btn.dataset.action, parseInt(btn.dataset.id)));
        });
        container.querySelectorAll('.events-pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p >= 1) { this._listPage = p; this._loadListView(); }
            });
        });
    },

    // ── Calendar View ──
    async _loadCalendarView() {
        const container = document.getElementById('evtCalendarContent');
        if (!container) return;

        if (!this._calendarWeekStart) {
            const now = new Date();
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day; // Monday
            this._calendarWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
        }

        const weekEnd = new Date(this._calendarWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        container.innerHTML = '<div class="events-loading"><div class="events-loading-spinner"></div>Loading calendar...</div>';

        try {
            const data = await API.events.getAll({ page: 1, limit: 100 });
            const events = (data.events || []).filter(e => {
                const start = e.startTime;
                const end = e.endTimeMillis || (e.startTime + e.durationMinutes * 60000);
                return start <= weekEnd.getTime() && end >= this._calendarWeekStart.getTime();
            });
            this._renderCalendar(events);
        } catch (e) {
            container.innerHTML = `<div class="events-empty"><div class="events-empty-title">Failed to load calendar</div></div>`;
        }
    },

    _renderCalendar(events) {
        const container = document.getElementById('evtCalendarContent');
        if (!container) return;

        const ws = this._calendarWeekStart;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekLabel = `${this._formatDateShort(ws)} — ${this._formatDateShort(new Date(ws.getTime() + 6 * 86400000))}`;

        let headers = '';
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(d => { headers += `<div class="events-cal-header">${d}</div>`; });

        let cells = '';
        for (let i = 0; i < 7; i++) {
            const cellDate = new Date(ws.getTime() + i * 86400000);
            const isToday = cellDate.getTime() === today.getTime();
            const cellStart = cellDate.getTime();
            const cellEnd = cellStart + 86400000;

            const cellEvents = events.filter(e => {
                const eStart = e.startTime;
                const eEnd = e.endTimeMillis || (e.startTime + e.durationMinutes * 60000);
                return eStart < cellEnd && eEnd > cellStart;
            });

            const evtHtml = cellEvents.map(e => {
                const type = this.TYPES[e.eventType] || this.TYPES.CUSTOM;
                return `<div class="events-cal-event ${type.css}" title="${this._esc(e.name)}">${type.icon} ${this._esc(e.name)}</div>`;
            }).join('');

            cells += `<div class="events-cal-cell${isToday ? ' today' : ''}">
                <div class="events-cal-date">${cellDate.getDate()}</div>
                ${evtHtml}
            </div>`;
        }

        container.innerHTML = `
            <div class="events-calendar-nav">
                <button class="events-cal-nav-btn" id="evtCalPrev">&larr; Prev Week</button>
                <div class="events-calendar-title">${weekLabel}</div>
                <div class="events-calendar-btns">
                    <button class="events-cal-nav-btn" id="evtCalToday">Today</button>
                    <button class="events-cal-nav-btn" id="evtCalNext">Next Week &rarr;</button>
                </div>
            </div>
            <div class="events-calendar-grid">
                ${headers}
                ${cells}
            </div>
        `;

        document.getElementById('evtCalPrev')?.addEventListener('click', () => {
            this._calendarWeekStart.setDate(this._calendarWeekStart.getDate() - 7);
            this._loadCalendarView();
        });
        document.getElementById('evtCalNext')?.addEventListener('click', () => {
            this._calendarWeekStart.setDate(this._calendarWeekStart.getDate() + 7);
            this._loadCalendarView();
        });
        document.getElementById('evtCalToday')?.addEventListener('click', () => {
            this._calendarWeekStart = null;
            this._loadCalendarView();
        });
    },

    // ── History View ──
    async _loadHistoryView() {
        const container = document.getElementById('evtHistoryContent');
        if (!container) return;
        container.innerHTML = '<div class="events-loading"><div class="events-loading-spinner"></div>Loading history...</div>';

        try {
            const data = await API.events.getHistory({ page: this._historyPage, limit: 20 });
            this._history = data.history || [];
            const total = data.total || 0;
            this._renderHistoryView(total);
        } catch (e) {
            container.innerHTML = `<div class="events-empty"><div class="events-empty-title">Failed to load history</div></div>`;
        }
    },

    _renderHistoryView(total) {
        const container = document.getElementById('evtHistoryContent');
        if (!container) return;

        if (!this._history.length) {
            container.innerHTML = `<div class="events-empty"><div class="events-empty-icon">&#x1F550;</div><div class="events-empty-title">No event history</div><div class="events-empty-text">Past events will appear here</div></div>`;
            return;
        }

        const rows = this._history.map(h => {
            const type = this.TYPES[h.eventType] || this.TYPES.CUSTOM;
            const started = this._formatDateTime(h.startedAt);
            const ended = h.endedAt ? this._formatDateTime(h.endedAt) : '-';
            const duration = h.endedAt ? this._formatDurationMs(h.endedAt - h.startedAt) : '-';
            return `<tr>
                <td class="evt-name">${this._esc(h.eventName || 'Unknown')}</td>
                <td><span class="evt-type-pill ${type.css}">${type.label}</span></td>
                <td class="evt-time">${started}</td>
                <td class="evt-time">${ended}</td>
                <td>${duration}</td>
                <td>${h.occurrence || 1}</td>
            </tr>`;
        }).join('');

        const totalPages = Math.ceil(total / 20);
        const pagination = totalPages > 1 ? `
            <div class="events-pagination">
                <button class="events-pagination-btn" data-page="${this._historyPage - 1}" ${this._historyPage <= 1 ? 'disabled' : ''}>Prev</button>
                <span class="events-pagination-info">Page ${this._historyPage} of ${totalPages}</span>
                <button class="events-pagination-btn" data-page="${this._historyPage + 1}" ${this._historyPage >= totalPages ? 'disabled' : ''}>Next</button>
            </div>` : '';

        container.innerHTML = `
            <table class="events-history-table">
                <thead><tr><th>Event</th><th>Type</th><th>Started</th><th>Ended</th><th>Duration</th><th>Occurrence</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${pagination}
        `;

        container.querySelectorAll('.events-pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p >= 1) { this._historyPage = p; this._loadHistoryView(); }
            });
        });
    },

    // ── Templates View ──
    async _loadTemplatesView() {
        const container = document.getElementById('evtTemplatesContent');
        if (!container) return;
        container.innerHTML = '<div class="events-loading"><div class="events-loading-spinner"></div>Loading templates...</div>';

        try {
            const data = await API.events.getTemplates();
            this._templates = data.templates || [];
            this._renderTemplatesView();
        } catch (e) {
            container.innerHTML = `<div class="events-empty"><div class="events-empty-title">Failed to load templates</div></div>`;
        }
    },

    _renderTemplatesView() {
        const container = document.getElementById('evtTemplatesContent');
        if (!container) return;

        if (!this._templates.length) {
            container.innerHTML = `<div class="events-empty"><div class="events-empty-icon">&#x1F4D1;</div><div class="events-empty-title">No templates</div><div class="events-empty-text">Save a template when creating an event</div></div>`;
            return;
        }

        const canManage = Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_EVENTS);

        container.innerHTML = `<div class="events-templates-grid">${this._templates.map(t => {
            const type = this.TYPES[t.eventType] || this.TYPES.CUSTOM;
            return `<div class="events-template-card">
                <div class="events-template-name">${this._esc(t.name)}</div>
                <div class="events-template-type"><span class="evt-type-pill ${type.css}">${type.label}</span></div>
                <div class="events-template-desc">${this._esc(t.description || 'No description')}</div>
                <div class="events-template-actions">
                    <button class="evt-action-btn start" data-action="use-template" data-id="${t.id}">Use Template</button>
                    ${canManage ? `<button class="evt-action-btn stop" data-action="delete-template" data-id="${t.id}">Delete</button>` : ''}
                </div>
            </div>`;
        }).join('')}</div>`;

        container.querySelectorAll('.evt-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = parseInt(btn.dataset.id);
                if (action === 'use-template') this._createFromTemplate(id);
                else if (action === 'delete-template') this._deleteTemplate(id);
            });
        });
    },

    // ── Actions ──
    async _handleAction(action, id) {
        switch (action) {
            case 'start':
                if (!confirm('Start this event now?')) return;
                try {
                    await API.events.start(id);
                    Toast.success('Event started');
                    this._loadListView();
                    this._loadActiveEvents();
                } catch (e) { Toast.error(e.message || 'Failed to start event'); }
                break;
            case 'stop':
                if (!confirm('Stop this active event?')) return;
                try {
                    await API.events.stop(id);
                    Toast.success('Event stopped');
                    this._loadListView();
                    this._loadActiveEvents();
                } catch (e) { Toast.error(e.message || 'Failed to stop event'); }
                break;
            case 'delete':
                if (!confirm('Delete this event? This cannot be undone.')) return;
                try {
                    await API.events.delete(id);
                    Toast.success('Event deleted');
                    this._loadListView();
                } catch (e) { Toast.error(e.message || 'Failed to delete event'); }
                break;
            case 'edit':
                this._openEditModal(id);
                break;
        }
    },

    async _createFromTemplate(templateId) {
        try {
            const result = await API.events.createFromTemplate(templateId);
            Toast.success('Event created from template');
            this._switchView('list');
            this._loadListView();
        } catch (e) { Toast.error(e.message || 'Failed to create from template'); }
    },

    async _deleteTemplate(id) {
        if (!confirm('Delete this template?')) return;
        try {
            await API.events.deleteTemplate(id);
            Toast.success('Template deleted');
            this._loadTemplatesView();
        } catch (e) { Toast.error(e.message || 'Failed to delete template'); }
    },

    // ── Create/Edit Modal ──
    _openCreateModal(prefill) {
        this._editingEventId = null;
        this._showModal('Create Event', prefill);
    },

    async _openEditModal(id) {
        try {
            const evt = await API.events.get(id);
            this._editingEventId = id;
            this._showModal('Edit Event', evt);
        } catch (e) { Toast.error(e.message || 'Failed to load event'); }
    },

    _showModal(title, data) {
        // Remove existing modal
        document.getElementById('evtModalOverlay')?.remove();

        const isEdit = !!this._editingEventId;
        const d = data || {};
        const selectedType = d.eventType || 'XP_BOOST';
        const selectedWorlds = d.targetWorlds ? d.targetWorlds.split(',').map(w => w.trim()) : ['ALL'];
        const conditions = d.conditions ? (typeof d.conditions === 'string' ? JSON.parse(d.conditions) : d.conditions) : {};

        // Parse start time for date/time inputs
        let startDate = '';
        let startTime = '';
        if (d.startTime) {
            const dt = new Date(d.startTime);
            startDate = dt.toISOString().split('T')[0];
            startTime = dt.toTimeString().slice(0, 5);
        }

        const overlay = document.createElement('div');
        overlay.className = 'events-modal-overlay';
        overlay.id = 'evtModalOverlay';
        overlay.innerHTML = `
            <div class="events-modal">
                <div class="events-modal-header">
                    <div class="events-modal-title">${title}</div>
                    <button class="events-modal-close" id="evtModalClose">&times;</button>
                </div>
                <div class="events-modal-body">
                    ${!isEdit ? `
                    <div class="evt-template-row">
                        <input type="checkbox" id="evtSaveTemplate" />
                        <span class="evt-template-label">Save as template:</span>
                        <input class="evt-template-name-input" type="text" id="evtTemplateName" placeholder="e.g. Friday Night Boss Mass" />
                    </div>` : ''}

                    <div class="evt-form-group">
                        <label class="evt-form-label">Event Name</label>
                        <input class="evt-form-input" type="text" id="evtName" placeholder="e.g. 2x XP Weekend" value="${this._esc(d.name || '')}" />
                    </div>

                    <div class="evt-form-row">
                        <div class="evt-form-group">
                            <label class="evt-form-label">Event Type</label>
                            <select class="evt-form-input evt-form-select" id="evtType">
                                ${Object.entries(this.TYPES).map(([k, v]) => `<option value="${k}" ${k === selectedType ? 'selected' : ''}>${v.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="evt-form-group">
                            <label class="evt-form-label">Target Worlds</label>
                            <div class="evt-world-selector" id="evtWorldSelector">
                                <button class="evt-world-option${selectedWorlds.includes('ALL') ? ' selected' : ''}" data-world="ALL">All</button>
                                <button class="evt-world-option eco${selectedWorlds.includes('ECO') ? ' selected' : ''}" data-world="ECO">ECO</button>
                                <button class="evt-world-option pvp${selectedWorlds.includes('PVP') ? ' selected' : ''}" data-world="PVP">PVP</button>
                            </div>
                        </div>
                    </div>

                    <div class="evt-form-row-3">
                        <div class="evt-form-group">
                            <label class="evt-form-label">Start Date</label>
                            <input class="evt-form-input" type="date" id="evtStartDate" value="${startDate}" />
                        </div>
                        <div class="evt-form-group">
                            <label class="evt-form-label">Start Time (UTC)</label>
                            <input class="evt-form-input" type="time" id="evtStartTime" value="${startTime}" />
                        </div>
                        <div class="evt-form-group">
                            <label class="evt-form-label">Duration</label>
                            <select class="evt-form-input evt-form-select" id="evtDuration">
                                ${this.DURATION_PRESETS.map(p => `<option value="${p.value}" ${p.value === (d.durationMinutes || 60) ? 'selected' : ''}>${p.label}</option>`).join('')}
                                <option value="custom">Custom...</option>
                            </select>
                        </div>
                    </div>

                    <div class="evt-form-group" id="evtCustomDurationGroup" style="display:none;">
                        <label class="evt-form-label">Custom Duration (minutes)</label>
                        <input class="evt-form-input" type="number" id="evtCustomDuration" min="1" max="10080" placeholder="Minutes" value="${d.durationMinutes || ''}" />
                    </div>

                    <div class="evt-form-row">
                        <div class="evt-form-group">
                            <label class="evt-form-label">Repetition</label>
                            <select class="evt-form-input evt-form-select" id="evtRepeat">
                                ${this.REPEAT_PRESETS.map(p => `<option value="${p.value}" ${p.value === (d.repeatIntervalMinutes || 0) ? 'selected' : ''}>${p.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="evt-form-group">
                            <label class="evt-form-label">Max Occurrences (0 = forever)</label>
                            <input class="evt-form-input" type="number" id="evtMaxOccurrences" min="0" max="9999" value="${d.maxOccurrences || 0}" />
                        </div>
                    </div>

                    <div class="evt-form-group">
                        <label class="evt-form-label">Announcements</label>
                        <div class="evt-check-row">
                            <label class="evt-check-item"><input type="checkbox" id="evtAnnounceIngame" ${d.announceIngame !== false ? 'checked' : ''} /> In-Game Yell</label>
                            <label class="evt-check-item"><input type="checkbox" id="evtAnnounceDiscord" ${d.announceDiscord !== false ? 'checked' : ''} /> Discord</label>
                        </div>
                    </div>

                    <div class="evt-form-group">
                        <label class="evt-form-label">Event Conditions</label>
                        <div class="evt-conditions-section" id="evtConditions">
                            ${this._buildConditionsForm(selectedType, conditions)}
                        </div>
                    </div>

                    <div class="evt-form-group">
                        <label class="evt-form-label">Description (optional)</label>
                        <textarea class="evt-form-input evt-form-textarea" id="evtDescription" rows="2" placeholder="Shown in event announcements...">${this._esc(d.description || '')}</textarea>
                    </div>
                </div>
                <div class="events-modal-footer">
                    <button class="btn btn-secondary" id="evtModalCancel">Cancel</button>
                    ${!isEdit ? '<button class="btn btn-secondary" id="evtModalSchedule">Schedule</button>' : ''}
                    <button class="btn btn-primary" id="evtModalSubmit">${isEdit ? 'Save Changes' : 'Start Now'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Bind modal events
        overlay.addEventListener('click', e => { if (e.target === overlay) this._closeModal(); });
        document.getElementById('evtModalClose').addEventListener('click', () => this._closeModal());
        document.getElementById('evtModalCancel').addEventListener('click', () => this._closeModal());

        // Type change → update conditions + world restrictions
        document.getElementById('evtType').addEventListener('change', e => {
            const type = e.target.value;
            document.getElementById('evtConditions').innerHTML = this._buildConditionsForm(type, {});
            this._updateWorldRestrictions(type);
        });

        // World selector toggle
        document.getElementById('evtWorldSelector').addEventListener('click', e => {
            const btn = e.target.closest('.evt-world-option');
            if (!btn || btn.classList.contains('disabled')) return;
            const world = btn.dataset.world;
            if (world === 'ALL') {
                // Toggle all
                const allSelected = btn.classList.contains('selected');
                document.querySelectorAll('#evtWorldSelector .evt-world-option').forEach(b => b.classList.toggle('selected', !allSelected));
            } else {
                btn.classList.toggle('selected');
                // Deselect ALL if specific selected
                const allBtn = document.querySelector('#evtWorldSelector .evt-world-option[data-world="ALL"]');
                if (allBtn) allBtn.classList.remove('selected');
            }
        });

        // Duration change
        document.getElementById('evtDuration').addEventListener('change', e => {
            document.getElementById('evtCustomDurationGroup').style.display = e.target.value === 'custom' ? '' : 'none';
        });

        // Submit handlers
        document.getElementById('evtModalSubmit').addEventListener('click', () => {
            if (isEdit) this._submitEdit();
            else this._submitCreate(true); // startNow = true
        });
        const scheduleBtn = document.getElementById('evtModalSchedule');
        if (scheduleBtn) scheduleBtn.addEventListener('click', () => this._submitCreate(false));

        // Apply initial world restrictions
        this._updateWorldRestrictions(selectedType);
    },

    _updateWorldRestrictions(eventType) {
        const allowed = {
            XP_BOOST: null, DROP_RATE: null, BOSS_MASS: ['ECO'], PVP_TOURNAMENT: ['PVP'],
            SKILL_COMP: null, DOUBLE_VOTE: null, COMMUNITY_GOAL: null, CUSTOM: null
        };
        const restriction = allowed[eventType];
        document.querySelectorAll('#evtWorldSelector .evt-world-option').forEach(btn => {
            const world = btn.dataset.world;
            if (restriction && world !== 'ALL' && !restriction.includes(world)) {
                btn.classList.add('disabled');
                btn.classList.remove('selected');
            } else {
                btn.classList.remove('disabled');
            }
        });
    },

    _buildConditionsForm(type, conditions) {
        switch (type) {
            case 'XP_BOOST':
                return `
                    <div class="evt-conditions-title">XP Boost Configuration</div>
                    <div class="evt-form-row">
                        <div class="evt-form-group" style="margin-bottom:0;">
                            <label class="evt-form-label" style="font-size:10px;">Skill</label>
                            <select class="evt-form-input evt-form-select" id="evtCondSkill">
                                ${this.SKILLS.map(s => `<option value="${s === 'All Skills' ? '' : s.toLowerCase()}" ${(conditions.skill || '') === (s === 'All Skills' ? '' : s.toLowerCase()) ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="evt-form-group" style="margin-bottom:0;">
                            <label class="evt-form-label" style="font-size:10px;">Multiplier</label>
                            <select class="evt-form-input evt-form-select" id="evtCondMultiplier">
                                ${[1.25, 1.5, 2, 3, 5].map(m => `<option value="${m}" ${parseFloat(conditions.multiplier) === m ? 'selected' : ''}>${m}x</option>`).join('')}
                            </select>
                        </div>
                    </div>`;
            case 'DROP_RATE':
                return `
                    <div class="evt-conditions-title">Drop Rate Configuration</div>
                    <div class="evt-form-group" style="margin-bottom:0;">
                        <label class="evt-form-label" style="font-size:10px;">Multiplier</label>
                        <select class="evt-form-input evt-form-select" id="evtCondMultiplier">
                            ${[1.25, 1.5, 2, 3, 5].map(m => `<option value="${m}" ${parseFloat(conditions.multiplier) === m ? 'selected' : ''}>${m}x</option>`).join('')}
                        </select>
                    </div>`;
            case 'BOSS_MASS':
                return `
                    <div class="evt-conditions-title">Boss Mass Configuration</div>
                    <div class="evt-form-group" style="margin-bottom:0;">
                        <label class="evt-form-label" style="font-size:10px;">NPC ID</label>
                        <input class="evt-form-input" type="number" id="evtCondNpcId" min="1" value="${conditions.npcId || ''}" placeholder="e.g. 319 (Corp)" />
                    </div>`;
            case 'PVP_TOURNAMENT':
                return `
                    <div class="evt-conditions-title">PvP Tournament Configuration</div>
                    <div class="evt-form-group" style="margin-bottom:0;">
                        <label class="evt-form-label" style="font-size:10px;">Bracket Size</label>
                        <select class="evt-form-input evt-form-select" id="evtCondBracketSize">
                            ${[8, 16, 32, 64].map(s => `<option value="${s}" ${parseInt(conditions.bracketSize) === s ? 'selected' : ''}>${s} players</option>`).join('')}
                        </select>
                    </div>`;
            case 'SKILL_COMP':
                return `
                    <div class="evt-conditions-title">Skill Competition Configuration</div>
                    <div class="evt-form-group" style="margin-bottom:0;">
                        <label class="evt-form-label" style="font-size:10px;">Skill</label>
                        <select class="evt-form-input evt-form-select" id="evtCondSkill">
                            ${this.SKILLS.filter(s => s !== 'All Skills').map(s => `<option value="${s.toLowerCase()}" ${conditions.skill === s.toLowerCase() ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>`;
            case 'DOUBLE_VOTE':
                return `
                    <div class="evt-conditions-title">Vote Rewards Configuration</div>
                    <div class="evt-form-group" style="margin-bottom:0;">
                        <label class="evt-form-label" style="font-size:10px;">Multiplier</label>
                        <select class="evt-form-input evt-form-select" id="evtCondMultiplier">
                            ${[1.5, 2, 3, 5].map(m => `<option value="${m}" ${parseFloat(conditions.multiplier) === m ? 'selected' : ''}>${m}x</option>`).join('')}
                        </select>
                    </div>`;
            case 'COMMUNITY_GOAL':
                return `
                    <div class="evt-conditions-title">Community Goal Configuration</div>
                    <div class="evt-form-row">
                        <div class="evt-form-group" style="margin-bottom:0;">
                            <label class="evt-form-label" style="font-size:10px;">Target Metric</label>
                            <input class="evt-form-input" type="text" id="evtCondMetric" value="${this._esc(conditions.targetMetric || '')}" placeholder="e.g. total_bosses_killed" />
                        </div>
                        <div class="evt-form-group" style="margin-bottom:0;">
                            <label class="evt-form-label" style="font-size:10px;">Target Value</label>
                            <input class="evt-form-input" type="number" id="evtCondTargetValue" min="1" value="${conditions.targetValue || ''}" placeholder="e.g. 10000" />
                        </div>
                    </div>`;
            case 'CUSTOM':
            default:
                return `
                    <div class="evt-conditions-title">Custom Configuration (JSON)</div>
                    <div class="evt-form-group" style="margin-bottom:0;">
                        <textarea class="evt-form-input evt-form-textarea" id="evtCondJson" rows="3" placeholder='{"key": "value"}'>${this._esc(typeof conditions === 'object' ? JSON.stringify(conditions) : (conditions || '{}'))}</textarea>
                    </div>`;
        }
    },

    _gatherConditions(type) {
        switch (type) {
            case 'XP_BOOST': {
                const skill = document.getElementById('evtCondSkill')?.value || '';
                const multiplier = parseFloat(document.getElementById('evtCondMultiplier')?.value || '2');
                return JSON.stringify({ skill, multiplier });
            }
            case 'DROP_RATE': {
                const multiplier = parseFloat(document.getElementById('evtCondMultiplier')?.value || '1.5');
                return JSON.stringify({ multiplier });
            }
            case 'BOSS_MASS': {
                const npcId = parseInt(document.getElementById('evtCondNpcId')?.value || '0');
                return JSON.stringify({ npcId });
            }
            case 'PVP_TOURNAMENT': {
                const bracketSize = parseInt(document.getElementById('evtCondBracketSize')?.value || '16');
                return JSON.stringify({ bracketSize });
            }
            case 'SKILL_COMP': {
                const skill = document.getElementById('evtCondSkill')?.value || 'mining';
                return JSON.stringify({ skill });
            }
            case 'DOUBLE_VOTE': {
                const multiplier = parseFloat(document.getElementById('evtCondMultiplier')?.value || '2');
                return JSON.stringify({ multiplier });
            }
            case 'COMMUNITY_GOAL': {
                const targetMetric = document.getElementById('evtCondMetric')?.value || '';
                const targetValue = parseInt(document.getElementById('evtCondTargetValue')?.value || '0');
                return JSON.stringify({ targetMetric, targetValue });
            }
            case 'CUSTOM':
            default: {
                const raw = document.getElementById('evtCondJson')?.value || '{}';
                try { JSON.parse(raw); return raw; }
                catch { return '{}'; }
            }
        }
    },

    _gatherFormData(startNow) {
        const name = document.getElementById('evtName')?.value?.trim();
        const eventType = document.getElementById('evtType')?.value;
        const description = document.getElementById('evtDescription')?.value?.trim() || '';
        const conditions = this._gatherConditions(eventType);

        // Worlds
        const worldBtns = document.querySelectorAll('#evtWorldSelector .evt-world-option.selected');
        const worlds = Array.from(worldBtns).map(b => b.dataset.world);
        const targetWorlds = worlds.includes('ALL') ? 'ALL' : worlds.join(',');

        // Duration
        const durationSelect = document.getElementById('evtDuration')?.value;
        let durationMinutes = parseInt(durationSelect);
        if (durationSelect === 'custom') {
            durationMinutes = parseInt(document.getElementById('evtCustomDuration')?.value || '60');
        }

        // Schedule
        let startTime;
        if (startNow) {
            startTime = Date.now();
        } else {
            const dateStr = document.getElementById('evtStartDate')?.value;
            const timeStr = document.getElementById('evtStartTime')?.value;
            if (!dateStr || !timeStr) { Toast.error('Start date and time are required for scheduling'); return null; }
            startTime = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
        }

        // Repeat
        const repeatIntervalMinutes = parseInt(document.getElementById('evtRepeat')?.value || '0');
        const maxOccurrences = parseInt(document.getElementById('evtMaxOccurrences')?.value || '0');

        // Announcements
        const announceIngame = document.getElementById('evtAnnounceIngame')?.checked || false;
        const announceDiscord = document.getElementById('evtAnnounceDiscord')?.checked || false;

        if (!name) { Toast.error('Event name is required'); return null; }
        if (!targetWorlds) { Toast.error('Select at least one world'); return null; }
        if (durationMinutes < 1) { Toast.error('Duration must be at least 1 minute'); return null; }

        return {
            name, eventType, targetWorlds, conditions, description,
            startTime, durationMinutes, timezone: 'UTC',
            repeatIntervalMinutes, maxOccurrences,
            announceIngame, announceDiscord,
            startNow
        };
    },

    async _submitCreate(startNow) {
        const data = this._gatherFormData(startNow);
        if (!data) return;

        // Template save
        const saveTemplate = document.getElementById('evtSaveTemplate')?.checked || false;
        const templateName = document.getElementById('evtTemplateName')?.value?.trim() || '';

        try {
            await API.events.create(data);
            Toast.success(startNow ? 'Event started' : 'Event scheduled');

            // Save template if requested
            if (saveTemplate && templateName) {
                try {
                    await API.events.createTemplate({
                        name: templateName,
                        eventType: data.eventType,
                        targetWorlds: data.targetWorlds,
                        conditions: data.conditions,
                        description: data.description,
                        durationMinutes: data.durationMinutes,
                        announceIngame: data.announceIngame,
                        announceDiscord: data.announceDiscord
                    });
                    Toast.success('Template saved');
                } catch (e) { console.warn('[Events] Failed to save template:', e); }
            }

            this._closeModal();
            this._loadListView();
            this._loadActiveEvents();
        } catch (e) {
            Toast.error(e.message || 'Failed to create event');
        }
    },

    async _submitEdit() {
        const data = this._gatherFormData(false);
        if (!data) return;
        delete data.startNow;

        try {
            await API.events.update(this._editingEventId, data);
            Toast.success('Event updated');
            this._closeModal();
            this._loadListView();
        } catch (e) {
            Toast.error(e.message || 'Failed to update event');
        }
    },

    _closeModal() {
        const overlay = document.getElementById('evtModalOverlay');
        if (overlay) overlay.remove();
        this._editingEventId = null;
    },

    // ── Helpers ──
    _renderWorldPills(targetWorlds) {
        if (!targetWorlds) return '';
        const worlds = targetWorlds.split(',').map(w => w.trim());
        if (worlds.includes('ALL')) return '<span class="evt-world-pill all">All Worlds</span>';
        return worlds.map(w => {
            const css = w.toLowerCase();
            return `<span class="evt-world-pill ${css}">${w}</span>`;
        }).join('');
    },

    _formatSchedule(evt) {
        const d = new Date(evt.startTime);
        const primary = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
                        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const sub = this._formatDuration(evt.durationMinutes) + ' duration';
        return { primary, sub };
    },

    _formatDuration(minutes) {
        if (minutes < 60) return minutes + 'm';
        if (minutes % 60 === 0) return (minutes / 60) + 'h';
        return Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm';
    },

    _formatDurationMs(ms) {
        return this._formatDuration(Math.round(ms / 60000));
    },

    _formatRepeat(minutes) {
        for (const p of this.REPEAT_PRESETS) {
            if (p.value === minutes && p.value > 0) return p.label.replace('One-time (no repeat)', 'One-time');
        }
        return 'Every ' + this._formatDuration(minutes);
    },

    _formatDateTime(timestamp) {
        if (!timestamp) return '-';
        const d = new Date(timestamp);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
               d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    },

    _formatDateShort(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    _esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Events;
}
