/* ============================================================
   ELDEROS STAFF PANEL - DASHBOARD WIDGETS
   Role-adaptive widget system with auto-refresh.
   ============================================================ */
console.log('[Widgets] Loading widgets.js...');

const Widgets = {
    _registry: [],
    _intervals: [],
    _container: null,
    _previewRole: null, // Ashpire-only: simulated role level for testing
    _dashboardCache: null, // cache dashboard data to avoid duplicate fetches
    _revenueCache: null, // cache revenue data

    init() {
        this._container = document.getElementById('widgets-container');
        this._registerAll();
        console.log('[Widgets] Initialized with', this._registry.length, 'widgets');
    },

    _registerAll() {
        // === EVERYONE (all staff) ===
        this._register({
            id: 'stats-overview',
            title: 'Overview',
            size: 'full',
            minRole: 1,
            visible: () => true,
            fetch: () => this._getCachedDashboard(),
            render: (el, data) => this._renderOverview(el, data)
        });

        // === MODERATOR+ (role level >= 2) ===
        this._register({
            id: 'moderation-summary',
            title: 'Moderation',
            size: 'full',
            minRole: 2,
            visible: () => Auth.hasRoleLevel(2),
            fetch: () => this._getCachedDashboard(),
            render: (el, data) => this._renderModerationSummary(el, data)
        });

        this._register({
            id: 'recent-activity',
            title: 'Recent Activity',
            size: 'half',
            minRole: 2,
            visible: () => Auth.hasRoleLevel(2),
            fetch: () => this._getCachedDashboard(),
            render: (el, data) => this._renderRecentActivity(el, data)
        });

        this._register({
            id: 'open-reports',
            title: 'Open Reports',
            size: 'half',
            minRole: 2,
            visible: () => Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_REPORTS),
            fetch: () => this._getCachedDashboard(),
            render: (el, data) => this._renderOpenReports(el, data)
        });

        // === OWNER+ (role level >= 5) ===
        this._register({
            id: 'revenue-summary',
            title: 'Revenue',
            size: 'full',
            minRole: 5,
            visible: () => Auth.hasRoleLevel(5),
            fetch: () => this._getCachedRevenue(),
            render: (el, data) => this._renderRevenueSummary(el, data)
        });

        // === DEVELOPER+ (VIEW_WORLDS permission) ===
        this._register({
            id: 'world-status',
            title: 'World Status',
            size: 'full',
            minRole: 4,
            visible: () => Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_WORLDS),
            fetch: () => API.stats.getWorlds(),
            render: (el, data) => this._renderWorldStatus(el, data)
        });

        this._register({
            id: 'hub-services',
            title: 'Hub Services',
            size: 'full',
            minRole: 4,
            visible: () => Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_SYSTEM_LOGS),
            fetch: () => API.stats.getServices(),
            render: (el, data) => this._renderHubServices(el, data)
        });

        // === DEVELOPER+ ===
        this._register({
            id: 'system-health',
            title: 'System Health',
            size: 'full',
            minRole: 4,
            visible: () => Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_SYSTEM_LOGS),
            fetch: () => API.stats.getServices(),
            render: (el, data) => this._renderSystemHealth(el, data)
        });
    },

    _register(widget) {
        this._registry.push(widget);
    },

    /**
     * Cached dashboard fetch — avoids multiple identical API calls per refresh cycle.
     */
    async _getCachedDashboard() {
        if (!this._dashboardCache) {
            this._dashboardCache = API.stats.getDashboard();
        }
        return this._dashboardCache;
    },

    async _getCachedRevenue() {
        if (!this._revenueCache) {
            this._revenueCache = API.ashpire.getRevenueSummary();
        }
        return this._revenueCache;
    },

    /**
     * Check if a widget should be visible, respecting preview mode.
     */
    _isVisible(widget) {
        if (this._previewRole !== null) {
            return widget.minRole <= this._previewRole;
        }
        return widget.visible();
    },

    async load() {
        if (!this._container) return;
        this._container.innerHTML = '';
        this._dashboardCache = null;
        this._revenueCache = null;

        // Render preview bar for Ashpire
        if (Auth.isAshpire()) {
            this._container.appendChild(this._createPreviewBar());
        }

        const visible = this._registry.filter(w => this._isVisible(w));
        for (const widget of visible) {
            const card = this._createCard(widget);
            this._container.appendChild(card);
            this._fetchAndRender(widget, card);
        }
    },

    _createCard(widget) {
        const div = document.createElement('div');
        div.className = `widget widget-${widget.size}`;
        div.id = `widget-${widget.id}`;
        div.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${widget.title}</h3>
                <span class="widget-refresh"></span>
            </div>
            <div class="widget-body">
                <div class="widget-loading">Loading...</div>
            </div>
        `;
        return div;
    },

    async _fetchAndRender(widget, card) {
        const body = card.querySelector('.widget-body');
        const refresh = card.querySelector('.widget-refresh');
        try {
            if (refresh) refresh.classList.add('active');
            const data = await widget.fetch();
            body.innerHTML = '';
            widget.render(body, data);
        } catch (e) {
            console.error(`[Widgets] Failed to load ${widget.id}:`, e);
            body.innerHTML = '<div class="widget-error">Failed to load</div>';
        } finally {
            if (refresh) refresh.classList.remove('active');
        }
    },

    startAutoRefresh(intervalMs = 30000) {
        this.stopAutoRefresh();
        const id = setInterval(() => this.refresh(), intervalMs);
        this._intervals.push(id);
    },

    stopAutoRefresh() {
        this._intervals.forEach(id => clearInterval(id));
        this._intervals = [];
    },

    async refresh() {
        this._dashboardCache = null;
        this._revenueCache = null;
        const visible = this._registry.filter(w => this._isVisible(w));
        for (const widget of visible) {
            const card = document.getElementById(`widget-${widget.id}`);
            if (card) this._fetchAndRender(widget, card);
        }
    },

    onPageLoad() {
        this.load();
        this.startAutoRefresh();
    },

    onPageLeave() {
        this.stopAutoRefresh();
    },

    // === Role Preview (Ashpire only) ===

    _createPreviewBar() {
        const bar = document.createElement('div');
        bar.className = 'widget-preview-bar';
        bar.id = 'widget-preview-bar';

        const roles = [
            { value: '', label: 'My View', level: null },
            { value: '1', label: 'Support', level: 1 },
            { value: '2', label: 'Moderator', level: 2 },
            { value: '3', label: 'Administrator', level: 3 },
            { value: '4', label: 'Developer', level: 4 },
            { value: '5', label: 'Owner', level: 5 },
            { value: '6', label: 'Ashpire', level: 6 },
        ];

        const current = this._previewRole;
        const options = roles.map(r => {
            const selected = (current === null && r.value === '') || (current !== null && r.value === String(current));
            return `<option value="${r.value}" ${selected ? 'selected' : ''}>${r.label}</option>`;
        }).join('');

        bar.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
            <span class="preview-label">Preview as</span>
            <select class="preview-select" id="widgetPreviewSelect">
                ${options}
            </select>
            ${this._previewRole !== null ? '<span class="preview-badge">PREVIEW</span>' : ''}
        `;

        const select = bar.querySelector('.preview-select');
        select.addEventListener('change', (e) => {
            const val = e.target.value;
            this._previewRole = val === '' ? null : parseInt(val, 10);
            this.load();
        });

        return bar;
    },

    // === Widget Renderers ===

    _renderOverview(el, data) {
        const stats = data.stats || data;
        const playersOnline = stats.playersOnline || 0;
        const worldsOnline = stats.worldsOnline || 0;
        const totalWorlds = stats.totalWorlds || 0;
        const staffOnline = stats.staffOnline || 0;
        const totalPlayers = stats.totalPlayers || 0;
        const newPlayersToday = stats.newPlayersToday || 0;

        // Update the header online counter
        const onlineCountEl = document.getElementById('onlineCount');
        if (onlineCountEl) onlineCountEl.textContent = Utils.formatNumber(playersOnline);

        el.innerHTML = `
            <div class="widget-stats-grid">
                <div class="widget-stat-card">
                    <div class="widget-stat-icon green">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div class="widget-stat-info">
                        <div class="widget-stat-label">Players Online</div>
                        <div class="widget-stat-value">${Utils.formatNumber(playersOnline)}</div>
                    </div>
                </div>
                <div class="widget-stat-card">
                    <div class="widget-stat-icon blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                    </div>
                    <div class="widget-stat-info">
                        <div class="widget-stat-label">Worlds Online</div>
                        <div class="widget-stat-value">${worldsOnline} / ${totalWorlds}</div>
                    </div>
                </div>
                <div class="widget-stat-card">
                    <div class="widget-stat-icon purple">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="8.5" cy="7" r="4"/>
                            <path d="M20 8v6M23 11h-6"/>
                        </svg>
                    </div>
                    <div class="widget-stat-info">
                        <div class="widget-stat-label">Staff Online</div>
                        <div class="widget-stat-value">${Utils.formatNumber(staffOnline)}</div>
                    </div>
                </div>
                <div class="widget-stat-card">
                    <div class="widget-stat-icon orange">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div class="widget-stat-info">
                        <div class="widget-stat-label">Total Players</div>
                        <div class="widget-stat-value">${Utils.formatNumber(totalPlayers)}</div>
                        ${newPlayersToday > 0 ? `<div class="widget-stat-sub">+${Utils.formatNumber(newPlayersToday)} today</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    _renderModerationSummary(el, data) {
        const stats = data.stats || data;
        const activeBans = stats.activeBans || 0;
        const activeMutes = stats.activeMutes || 0;
        const activeTimeouts = stats.activeTimeouts || 0;
        const total = activeBans + activeMutes + activeTimeouts;

        el.innerHTML = `
            <div class="widget-mod-summary">
                <div class="widget-mod-total">
                    <span class="widget-mod-total-num">${total}</span>
                    <span class="widget-mod-total-label">active punishments</span>
                </div>
                <div class="widget-mod-breakdown">
                    <a href="#bans" class="widget-mod-item">
                        <div class="widget-mod-item-icon red">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                            </svg>
                        </div>
                        <div class="widget-mod-item-info">
                            <div class="widget-mod-item-val">${activeBans}</div>
                            <div class="widget-mod-item-label">Bans</div>
                        </div>
                    </a>
                    <a href="#mutes" class="widget-mod-item">
                        <div class="widget-mod-item-icon yellow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                                <line x1="23" y1="9" x2="17" y2="15"/>
                                <line x1="17" y1="9" x2="23" y2="15"/>
                            </svg>
                        </div>
                        <div class="widget-mod-item-info">
                            <div class="widget-mod-item-val">${activeMutes}</div>
                            <div class="widget-mod-item-label">Mutes</div>
                        </div>
                    </a>
                    <a href="#timeouts" class="widget-mod-item">
                        <div class="widget-mod-item-icon purple">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div class="widget-mod-item-info">
                            <div class="widget-mod-item-val">${activeTimeouts}</div>
                            <div class="widget-mod-item-label">Timeouts</div>
                        </div>
                    </a>
                </div>
            </div>
        `;
    },

    _renderRevenueSummary(el, data) {
        const totalCents = data.totalRevenueCents || 0;
        const totalTx = data.totalTransactions || 0;
        const uniqueBuyers = data.uniqueBuyers || 0;
        const totalTokens = data.totalTokensCredited || 0;
        const totalSpent = data.totalTokensSpent || 0;

        const dollars = (totalCents / 100).toFixed(2);
        const spendRate = totalTokens > 0 ? Math.round((totalSpent / totalTokens) * 100) : 0;

        el.innerHTML = `
            <div class="widget-revenue-grid">
                <a href="#ashpire-revenue" class="widget-revenue-card main">
                    <div class="widget-revenue-icon green">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                    </div>
                    <div class="widget-revenue-info">
                        <div class="widget-revenue-label">Total Revenue</div>
                        <div class="widget-revenue-val main-val">$${this._formatDollars(totalCents)}</div>
                    </div>
                </a>
                <div class="widget-revenue-card">
                    <div class="widget-revenue-icon blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                    </div>
                    <div class="widget-revenue-info">
                        <div class="widget-revenue-label">Transactions</div>
                        <div class="widget-revenue-val">${Utils.formatNumber(totalTx)}</div>
                    </div>
                </div>
                <div class="widget-revenue-card">
                    <div class="widget-revenue-icon orange">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div class="widget-revenue-info">
                        <div class="widget-revenue-label">Unique Buyers</div>
                        <div class="widget-revenue-val">${Utils.formatNumber(uniqueBuyers)}</div>
                    </div>
                </div>
                <div class="widget-revenue-card">
                    <div class="widget-revenue-icon purple">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                        </svg>
                    </div>
                    <div class="widget-revenue-info">
                        <div class="widget-revenue-label">Token Spend Rate</div>
                        <div class="widget-revenue-val">${spendRate}%</div>
                    </div>
                </div>
            </div>
        `;
    },

    _renderRecentActivity(el, data) {
        const actions = data.recentActions || [];

        if (actions.length === 0) {
            el.innerHTML = `
                <div class="widget-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32" style="margin-bottom: 8px; opacity: 0.4;">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <div>No recent activity</div>
                </div>
            `;
            return;
        }

        let html = '<div class="widget-activity-list">';
        for (const action of actions) {
            const timeAgo = this._timeAgo(action.createdAt);
            const icon = this._actionIcon(action.actionType);
            const colorClass = this._actionColor(action.actionType);
            const label = this._actionLabel(action.actionType);
            const target = action.targetUsername ? `<span class="activity-target">${this._escapeHtml(action.targetUsername)}</span>` : '';

            html += `
                <div class="widget-activity-row">
                    <div class="widget-activity-icon ${colorClass}">${icon}</div>
                    <div class="widget-activity-content">
                        <div class="widget-activity-text">
                            <span class="activity-staff">${this._escapeHtml(action.staffUsername)}</span>
                            <span class="activity-action">${label}</span>
                            ${target}
                        </div>
                        <div class="widget-activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        el.innerHTML = html;
    },

    _renderOpenReports(el, data) {
        const stats = data.stats || data;
        const reports = stats.openReports || 0;

        if (reports > 0) {
            el.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-md);">
                    <div style="font-size: var(--text-3xl); font-weight: var(--font-bold); color: var(--accent);">${reports}</div>
                    <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;">reports need attention</div>
                    <a href="#reports" class="btn btn-secondary btn-sm" style="margin-top: var(--spacing-md);">View Reports</a>
                </div>
            `;
        } else {
            el.innerHTML = `
                <div class="widget-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32" style="margin-bottom: 8px; opacity: 0.4;">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <div>No open reports</div>
                </div>
            `;
        }
    },

    async _renderWorldStatus(el, data) {
        const worlds = data.worlds || [];

        if (worlds.length === 0) {
            el.innerHTML = '<div class="widget-empty">No worlds configured</div>';
            return;
        }

        // Fetch recent telemetry for sparklines
        let sparklineData = {};
        try {
            if (typeof API.telemetry !== 'undefined') {
                const latest = await API.telemetry.getLatestAll();
                sparklineData = latest.worlds || {};
            }
        } catch (e) {
            // Sparklines are optional
        }

        let html = '<div class="widget-worlds-grid">';
        for (const w of worlds) {
            const statusClass = w.status.toLowerCase();
            const cpuPct = Math.round((w.cpuLoad || 0) * 100);
            const uptimeStr = this._formatUptime(w.uptime || 0);

            // Sparkline for CPU (if Telemetry module is available)
            let cpuSparkline = '';
            const wd = sparklineData[String(w.id)];
            if (wd && typeof Telemetry !== 'undefined' && wd.cpu !== undefined) {
                const cpuColor = wd.cpu > 75 ? '#f40e00' : wd.cpu > 50 ? '#eab308' : '#22c55e';
                cpuSparkline = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${cpuColor}; margin-left:4px;"></span>`;
            }

            html += `
                <div class="world-card" style="cursor:pointer;" onclick="Router.navigate('worlds-overview')">
                    <div class="world-card-header">
                        <div>
                            <div class="world-card-name">${this._escapeHtml(w.name)}</div>
                            <div class="world-card-meta">${w.type} &middot; <img src="${this._regionFlag(w.region)}" alt="" class="worlds-flag-icon"> ${w.region}</div>
                        </div>
                        <span class="status-pill ${statusClass}">
                            <span class="status-pill-dot"></span>
                            ${w.status}
                        </span>
                    </div>
                    <div class="world-card-stats-row">
                        <div class="world-stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                            <span class="world-stat-val">${w.players}</span>
                        </div>
                        <div class="world-stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span class="world-stat-val">${w.tickMs}ms</span>
                        </div>
                        <div class="world-stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                <line x1="8" y1="21" x2="16" y2="21"/>
                                <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            <span class="world-stat-val">${w.memoryPct}%</span>
                        </div>
                        <div class="world-stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                            </svg>
                            <span class="world-stat-val">${cpuPct}%${cpuSparkline}</span>
                        </div>
                    </div>
                    <div class="world-card-uptime">${uptimeStr ? 'Up ' + uptimeStr : ''}</div>
                </div>
            `;
        }
        html += '</div>';
        el.innerHTML = html;
    },

    _renderHubServices(el, data) {
        const services = data.services || [];

        if (services.length === 0) {
            el.innerHTML = '<div class="widget-empty">No services available</div>';
            return;
        }

        let html = `
            <table class="widget-services-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>State</th>
                        <th>Uptime</th>
                        <th>Traffic In</th>
                        <th>Traffic Out</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const svc of services) {
            const stateClass = svc.state.toLowerCase();
            html += `
                <tr>
                    <td>
                        <span class="svc-name">
                            <span class="svc-color-dot" style="background-color: ${this._escapeHtml(svc.color)};"></span>
                            ${this._escapeHtml(svc.title)}
                        </span>
                    </td>
                    <td><span class="svc-state ${stateClass}">${svc.state}</span></td>
                    <td>${this._escapeHtml(svc.uptime)}</td>
                    <td class="svc-traffic">${this._formatBytes(svc.trafficIn)}</td>
                    <td class="svc-traffic">${this._formatBytes(svc.trafficOut)}</td>
                </tr>
            `;
        }

        html += '</tbody></table>';
        el.innerHTML = html;
    },

    _renderSystemHealth(el, data) {
        const services = data.services || [];

        const errors = services.filter(s => s.lastError && s.lastError.length > 0);
        const online = services.filter(s => s.state === 'ONLINE').length;
        const total = services.length;

        let html = '<div class="widget-health-grid">';

        html += `
            <div class="health-item">
                <span class="health-item-label">Services Online</span>
                <span class="health-item-value ${online === total ? 'ok' : 'error'}">${online} / ${total}</span>
            </div>
        `;

        if (errors.length === 0) {
            html += `
                <div class="health-item">
                    <span class="health-item-label">Errors</span>
                    <span class="health-item-value ok">None</span>
                </div>
            `;
        } else {
            for (const svc of errors) {
                const time = svc.lastErrorTime > 0 ? new Date(svc.lastErrorTime).toLocaleTimeString() : 'Unknown';
                html += `
                    <div class="health-item">
                        <span class="health-item-label">${this._escapeHtml(svc.title)}</span>
                        <span class="health-item-value error" title="${this._escapeHtml(svc.lastError)}">${time}</span>
                    </div>
                `;
            }
        }

        html += '</div>';
        el.innerHTML = html;
    },

    // === Helpers ===

    _formatUptime(ms) {
        if (!ms || ms <= 0) return '0s';
        const seconds = Math.floor(ms / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    },

    _formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let val = bytes;
        while (val >= 1024 && i < units.length - 1) {
            val /= 1024;
            i++;
        }
        return val.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    },

    _formatDollars(cents) {
        const val = cents / 100;
        if (val >= 1000) return Utils.formatNumber(Math.round(val));
        return val.toFixed(2);
    },

    _regionFlag(region) {
        const flagMap = { 'CAN': 'CANADA', 'US': 'USA', 'NTL': 'NETHERLANDS' };
        return `assets/flags/${flagMap[region] || 'GLOBAL'}.png`;
    },

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    },

    _actionIcon(type) {
        const icons = {
            'TEMP_BAN': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
            'PERM_BAN': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
            'IP_BAN': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
            'UNBAN': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>',
            'MUTE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
            'UNMUTE': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
            'KICK': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
            'TIMEOUT': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
            'UNTIMEOUT': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>',
            'WARNING': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            'MODIFY_PLAYER_DATA': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        };
        return icons[type] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    },

    _actionColor(type) {
        const colors = {
            'TEMP_BAN': 'red', 'PERM_BAN': 'red', 'IP_BAN': 'red',
            'UNBAN': 'green', 'UNMUTE': 'green', 'UNTIMEOUT': 'green',
            'MUTE': 'yellow', 'WARNING': 'yellow',
            'KICK': 'orange', 'TIMEOUT': 'purple',
            'MODIFY_PLAYER_DATA': 'blue',
        };
        return colors[type] || 'muted';
    },

    _actionLabel(type) {
        const labels = {
            'TEMP_BAN': 'temp banned',
            'PERM_BAN': 'permanently banned',
            'IP_BAN': 'IP banned',
            'UNBAN': 'unbanned',
            'MUTE': 'muted',
            'UNMUTE': 'unmuted',
            'KICK': 'kicked',
            'TIMEOUT': 'timed out',
            'UNTIMEOUT': 'released',
            'WARNING': 'warned',
            'MESSAGE': 'messaged',
            'TELEPORT': 'teleported to',
            'MODIFY_PLAYER_DATA': 'modified',
        };
        return labels[type] || type.toLowerCase().replace(/_/g, ' ');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Widgets;
}
