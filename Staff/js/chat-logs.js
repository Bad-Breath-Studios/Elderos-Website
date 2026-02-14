/* ============================================================
   ELDEROS STAFF PANEL - CHAT LOGS
   ============================================================ */
console.log('[ChatLogs] Loading chat-logs.js...');

const ChatLogs = {
    _logs: [],
    _total: 0,
    _page: 1,
    _limit: 25,
    _filters: {},
    _isLoading: false,
    _searchMode: 'simple', // 'simple' or 'regex'

    // Conversation context state
    _context: {
        isOpen: false,
        messages: [],
        windowFrom: null,
        windowTo: null,
        hasEarlier: false,
        hasLater: false,
        highlightIds: [],
        mode: null,
        params: {},
        participants: [],
        isLoading: false
    },

    CHAT_TYPES: ['PUBLIC', 'PRIVATE', 'CLAN', 'TRADE', 'YELL'],

    // 10-color palette for player name coloring (dark-theme friendly)
    PLAYER_COLORS: [
        '#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff',
        '#39d2c0', '#ff7b72', '#79c0ff', '#d2a8ff', '#ffa657'
    ],

    CONTEXT_WINDOW_MS: 5 * 60 * 1000, // 5 minutes

    init() {},

    onPageLoad() {
        this._page = 1;
        this._filters = {};
        this._searchMode = 'simple';
        this._context = { isOpen: false, messages: [], windowFrom: null, windowTo: null, hasEarlier: false, hasLater: false, highlightIds: [], mode: null, params: {}, participants: [], roles: {}, isLoading: false };
        this._parseUrlFilters();
        this.render();
        this.load();
    },

    onPageLeave() {
        this._closeContext();
    },

    _parseUrlFilters() {
        const hash = window.location.hash;
        const queryIdx = hash.indexOf('?');
        if (queryIdx === -1) return;

        const params = new URLSearchParams(hash.substring(queryIdx));
        if (params.has('account_id')) this._filters.account_id = params.get('account_id');
        if (params.has('chat_type')) this._filters.chat_type = params.get('chat_type');
    },

    render() {
        const container = document.getElementById('page-chat-logs');
        if (!container) return;

        container.innerHTML = `
            <div class="chat-logs-page">
                <div class="chat-logs-filters" id="chatLogsFilters">
                    ${this._renderFilters()}
                </div>
                <div class="chat-logs-table-wrapper">
                    <div class="chat-logs-table" id="chatLogsTable">
                        <div class="chat-logs-loading">Loading...</div>
                    </div>
                    <div class="chat-logs-pagination" id="chatLogsPagination"></div>
                </div>
                <div class="chat-logs-context-panel" id="chatContextPanel" style="display:none;"></div>
            </div>
        `;

        this._bindEvents();
    },

    _renderFilters() {
        return `
            <div class="chat-logs-filter-row">
                <div class="chat-logs-filter-group">
                    <label>Chat Type</label>
                    <select id="clFilterType" class="chat-logs-select">
                        <option value="">All Types</option>
                        ${this.CHAT_TYPES.map(t => `<option value="${t}" ${this._filters.chat_type === t ? 'selected' : ''}>${this._formatType(t)}</option>`).join('')}
                    </select>
                </div>
                <div class="chat-logs-filter-group chat-logs-search-group">
                    <label>Search</label>
                    <div class="chat-logs-search-row">
                        <input type="text" id="clFilterSearch" class="chat-logs-input ${this._searchMode === 'regex' ? 'regex-active' : ''}" placeholder="${this._searchMode === 'regex' ? 'Regex pattern...' : 'Username or message...'}" value="${this._escapeHtml(this._filters.search || '')}">
                        <div class="search-mode-toggle">
                            <button class="search-mode-btn ${this._searchMode === 'simple' ? 'active' : ''}" data-mode="simple">Simple</button>
                            <button class="search-mode-btn ${this._searchMode === 'regex' ? 'active' : ''}" data-mode="regex">Regex</button>
                        </div>
                        <div class="regex-help-wrapper">
                            <button class="regex-help-btn" id="regexHelpBtn" title="Regex help">?</button>
                            <div class="regex-help-tooltip" id="regexHelpTooltip">
                                <div class="regex-help-title">Regex Examples</div>
                                <div class="regex-help-item"><code>\\d+[kmb]</code> Gold amounts</div>
                                <div class="regex-help-item"><code>discord\\.gg/\\w+</code> Discord links</div>
                                <div class="regex-help-item"><code>(sell|buy).*(paypal|venmo)</code> RWT keywords</div>
                                <div class="regex-help-item"><code>\\b(bot|macro)\\b</code> Bot mentions</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="chat-logs-filter-group">
                    <label>World</label>
                    <input type="number" id="clFilterWorld" class="chat-logs-input chat-logs-input-small" placeholder="ID" value="${this._filters.world_id || ''}">
                </div>
                <div class="chat-logs-filter-group">
                    <label>Zone ID</label>
                    <input type="number" id="clFilterZone" class="chat-logs-input chat-logs-input-small" placeholder="ID" value="${this._filters.zone_id || ''}">
                </div>
                <div class="chat-logs-filter-group">
                    <label>From</label>
                    <input type="date" id="clFilterStart" class="chat-logs-input">
                </div>
                <div class="chat-logs-filter-group">
                    <label>To</label>
                    <input type="date" id="clFilterEnd" class="chat-logs-input">
                </div>
                <div class="chat-logs-filter-actions">
                    <button class="chat-logs-filter-btn" id="clFilterApply">Apply</button>
                    <button class="chat-logs-filter-clear" id="clFilterClear">Clear</button>
                </div>
            </div>
        `;
    },

    _bindEvents() {
        document.getElementById('clFilterApply')?.addEventListener('click', () => this._applyFilters());
        document.getElementById('clFilterClear')?.addEventListener('click', () => {
            this._filters = {};
            this._searchMode = 'simple';
            this._page = 1;
            this._closeContext();
            this.render();
            this.load();
        });

        document.querySelectorAll('#chatLogsFilters .chat-logs-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._applyFilters();
            });
        });

        // Search mode toggle
        document.querySelectorAll('.search-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._searchMode = btn.dataset.mode;
                const searchInput = document.getElementById('clFilterSearch');
                if (searchInput) {
                    searchInput.className = 'chat-logs-input' + (this._searchMode === 'regex' ? ' regex-active' : '');
                    searchInput.placeholder = this._searchMode === 'regex' ? 'Regex pattern...' : 'Username or message...';
                }
                document.querySelectorAll('.search-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === this._searchMode));
            });
        });

        // Regex help tooltip
        const helpBtn = document.getElementById('regexHelpBtn');
        const helpTooltip = document.getElementById('regexHelpTooltip');
        if (helpBtn && helpTooltip) {
            helpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                helpTooltip.classList.toggle('visible');
            });
            document.addEventListener('click', () => helpTooltip?.classList.remove('visible'), { once: false });
        }
    },

    _applyFilters() {
        const chatType = document.getElementById('clFilterType')?.value;
        const search = document.getElementById('clFilterSearch')?.value?.trim();
        const worldId = document.getElementById('clFilterWorld')?.value?.trim();
        const zoneId = document.getElementById('clFilterZone')?.value?.trim();
        const startDate = document.getElementById('clFilterStart')?.value;
        const endDate = document.getElementById('clFilterEnd')?.value;

        this._filters = {};
        if (chatType) this._filters.chat_type = chatType;
        if (search) this._filters.search = search;
        if (worldId) this._filters.world_id = worldId;
        if (zoneId) this._filters.zone_id = zoneId;
        if (startDate) this._filters.start_date = new Date(startDate).getTime();
        if (endDate) this._filters.end_date = new Date(endDate + 'T23:59:59').getTime();
        if (this._searchMode === 'regex') this._filters.search_mode = 'regex';

        this._page = 1;
        this.load();
    },

    async load() {
        if (this._isLoading) return;
        this._isLoading = true;

        const tableEl = document.getElementById('chatLogsTable');
        if (tableEl) tableEl.innerHTML = '<div class="chat-logs-loading">Loading...</div>';

        try {
            const data = await API.logs.getChatLogs(this._page, this._limit, this._filters);
            this._logs = data.logs || [];
            this._total = data.total || 0;
            this._renderTable();
            this._renderPagination();
        } catch (error) {
            console.error('[ChatLogs] Load error:', error);
            const msg = error.message || 'Unknown error';
            if (tableEl) {
                tableEl.innerHTML = `
                    <div class="chat-logs-empty">
                        <div class="chat-logs-empty-text">${msg.includes('regex') ? 'Invalid regex pattern. Check your syntax.' : 'Failed to load logs: ' + this._escapeHtml(msg)}</div>
                    </div>
                `;
            }
        } finally {
            this._isLoading = false;
        }
    },

    _renderTable() {
        const tableEl = document.getElementById('chatLogsTable');
        if (!tableEl) return;

        if (this._logs.length === 0) {
            tableEl.innerHTML = `
                <div class="chat-logs-empty">
                    <div class="chat-logs-empty-text">No chat logs found</div>
                </div>
            `;
            return;
        }

        const searchTerm = this._filters.search || '';
        const isRegex = this._filters.search_mode === 'regex';

        tableEl.innerHTML = `
            <table class="data-table chat-logs-data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Player</th>
                        <th>Type</th>
                        <th>Message</th>
                        <th>Recipient</th>
                        <th>World</th>
                        <th>Zone</th>
                        <th class="th-actions">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this._logs.map(log => `
                        <tr>
                            <td class="log-time">${this._formatTime(log.createdAt)}</td>
                            <td>
                                <a href="#" class="log-player-link" data-account-id="${log.accountId}">${this._escapeHtml(log.username)}</a>
                            </td>
                            <td><span class="chat-type-badge ${this._getChatClass(log.chatType)}">${this._formatType(log.chatType)}</span></td>
                            <td class="chat-message-cell" title="${this._escapeHtml(log.message || '')}">${this._highlightMessage(log.message, searchTerm, isRegex)}</td>
                            <td>${log.recipient ? `<a href="#" class="log-player-link" data-account-id="">${this._escapeHtml(log.recipient)}</a>` : '<span class="log-muted">\u2014</span>'}</td>
                            <td>${log.worldId != null ? '<span class="log-detail-tag">W' + log.worldId + '</span>' : '<span class="log-muted">\u2014</span>'}</td>
                            <td>${log.zoneId != null ? '<span class="log-detail-tag">' + log.zoneId + '</span>' : '<span class="log-muted">\u2014</span>'}</td>
                            <td class="td-actions">
                                <button class="ctx-btn" data-log-id="${log.id}" title="View conversation context">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this._bindTableLinks(tableEl);
        this._bindContextButtons(tableEl);
    },

    _highlightMessage(msg, searchTerm, isRegex) {
        if (!msg) return '<span class="log-muted">\u2014</span>';
        const raw = msg.length > 80 ? msg.substring(0, 80) + '...' : msg;
        if (!searchTerm) return this._escapeHtml(raw);

        try {
            let regex;
            if (isRegex) {
                if (this._isUnsafeRegex(searchTerm)) return this._escapeHtml(raw);
                regex = new RegExp(searchTerm, 'gi');
            } else {
                regex = new RegExp(this._escapeRegex(searchTerm), 'gi');
            }
            // Split-escape-wrap: match on raw text, escape segments individually
            const parts = [];
            let lastIndex = 0;
            let m;
            regex.lastIndex = 0;
            while ((m = regex.exec(raw)) !== null) {
                if (m.index > lastIndex) parts.push(this._escapeHtml(raw.substring(lastIndex, m.index)));
                parts.push(`<mark class="chat-highlight">${this._escapeHtml(m[0])}</mark>`);
                lastIndex = regex.lastIndex;
                if (m[0].length === 0) { regex.lastIndex++; }
            }
            if (lastIndex < raw.length) parts.push(this._escapeHtml(raw.substring(lastIndex)));
            return parts.join('');
        } catch {
            return this._escapeHtml(raw);
        }
    },

    _isUnsafeRegex(pattern) {
        if (pattern.length > 100) return true;
        // Simple string scan for nested quantifiers: )+, )*, ){, +*, ++, etc.
        for (let i = 1; i < pattern.length; i++) {
            const prev = pattern[i - 1];
            const curr = pattern[i];
            if ((prev === ')' || prev === ']') && (curr === '+' || curr === '*' || curr === '{')) return true;
        }
        return false;
    },

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    _bindContextButtons(el) {
        el.querySelectorAll('.ctx-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const logId = parseInt(btn.dataset.logId);
                const log = this._logs.find(l => l.id === logId);
                if (log) this._openContext(log);
            });
        });
    },

    // === Context Panel ===

    _openContext(log) {
        const chatType = log.chatType;

        // Clan: not supported yet
        if (chatType === 'CLAN') {
            if (typeof Toast !== 'undefined') Toast.error('Clan context not available yet — requires clan tracking');
            return;
        }

        // Determine context mode and params
        let mode, params;
        if (chatType === 'PRIVATE') {
            mode = 'private';
            params = { player_a: log.username, player_b: log.recipient };
        } else if (chatType === 'YELL') {
            mode = 'yell';
            params = { world_id: log.worldId };
        } else {
            // PUBLIC, TRADE — world-based context (shows all nearby chat on same world)
            if (log.worldId == null) {
                if (typeof Toast !== 'undefined') Toast.error('No world data for this message');
                return;
            }
            mode = 'world';
            params = { world_id: log.worldId };
        }

        const ts = log.createdAt;
        const from = ts - this.CONTEXT_WINDOW_MS;
        const to = ts + this.CONTEXT_WINDOW_MS;

        this._context.mode = mode;
        this._context.params = params;
        this._context.highlightIds = [log.id];
        this._context.isOpen = true;

        this._loadContext(from, to, true);
    },

    async _loadContext(from, to, isInitial) {
        if (this._context.isLoading) return;
        this._context.isLoading = true;

        const panel = document.getElementById('chatContextPanel');
        if (!panel) return;

        panel.style.display = '';
        if (isInitial) {
            panel.innerHTML = '<div class="conv-loading">Loading conversation...</div>';
        }

        try {
            const apiParams = {
                mode: this._context.mode,
                from, to,
                limit: 200,
                ...this._context.params
            };

            const data = await API.logs.getChatContext(apiParams);

            this._context.messages = data.messages || [];
            this._context.windowFrom = data.window?.from || from;
            this._context.windowTo = data.window?.to || to;
            this._context.hasEarlier = data.window?.hasEarlier || false;
            this._context.hasLater = data.window?.hasLater || false;
            this._context.participants = data.participants || [];
            this._context.roles = data.roles || {};

            this._renderContextPanel();

            if (isInitial) {
                // Scroll highlighted message into view
                setTimeout(() => {
                    const highlighted = panel.querySelector('.conv-msg.highlighted');
                    if (highlighted) highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
            }
        } catch (error) {
            console.error('[ChatLogs] Context load error:', error);
            panel.innerHTML = `<div class="conv-loading">Failed to load context: ${this._escapeHtml(error.message)}</div>`;
        } finally {
            this._context.isLoading = false;
        }
    },

    async _loadEarlier() {
        if (this._context.isLoading) return;
        this._context.isLoading = true;

        const msgList = document.getElementById('convMsgList');
        const prevHeight = msgList ? msgList.scrollHeight : 0;
        const prevScroll = msgList ? msgList.scrollTop : 0;

        const newFrom = this._context.windowFrom - this.CONTEXT_WINDOW_MS;
        const newTo = this._context.windowFrom;

        try {
            const apiParams = {
                mode: this._context.mode,
                from: newFrom, to: newTo,
                limit: 200,
                ...this._context.params
            };
            const data = await API.logs.getChatContext(apiParams);
            const newMsgs = data.messages || [];

            if (newMsgs.length > 0) {
                // Deduplicate by id
                const existingIds = new Set(this._context.messages.map(m => m.id));
                const unique = newMsgs.filter(m => !existingIds.has(m.id));
                this._context.messages = [...unique, ...this._context.messages];
            }

            this._context.windowFrom = newFrom;
            this._context.hasEarlier = data.window?.hasEarlier || false;
            // Merge participants and roles
            (data.participants || []).forEach(p => {
                if (!this._context.participants.includes(p)) this._context.participants.push(p);
            });
            Object.assign(this._context.roles, data.roles || {});

            this._renderContextPanel();

            // Restore scroll position
            if (msgList) {
                const newHeight = document.getElementById('convMsgList')?.scrollHeight || 0;
                const ml = document.getElementById('convMsgList');
                if (ml) ml.scrollTop = prevScroll + (newHeight - prevHeight);
            }
        } catch (error) {
            console.error('[ChatLogs] Load earlier error:', error);
        } finally {
            this._context.isLoading = false;
        }
    },

    async _loadLater() {
        if (this._context.isLoading) return;
        this._context.isLoading = true;

        const newFrom = this._context.windowTo;
        const newTo = this._context.windowTo + this.CONTEXT_WINDOW_MS;

        try {
            const apiParams = {
                mode: this._context.mode,
                from: newFrom, to: newTo,
                limit: 200,
                ...this._context.params
            };
            const data = await API.logs.getChatContext(apiParams);
            const newMsgs = data.messages || [];

            if (newMsgs.length > 0) {
                const existingIds = new Set(this._context.messages.map(m => m.id));
                const unique = newMsgs.filter(m => !existingIds.has(m.id));
                this._context.messages = [...this._context.messages, ...unique];
            }

            this._context.windowTo = newTo;
            this._context.hasLater = data.window?.hasLater || false;
            (data.participants || []).forEach(p => {
                if (!this._context.participants.includes(p)) this._context.participants.push(p);
            });
            Object.assign(this._context.roles, data.roles || {});

            this._renderContextPanel();
        } catch (error) {
            console.error('[ChatLogs] Load later error:', error);
        } finally {
            this._context.isLoading = false;
        }
    },

    _renderContextPanel() {
        const panel = document.getElementById('chatContextPanel');
        if (!panel) return;

        const ctx = this._context;
        const modeLabel = ctx.mode === 'world' ? 'World Chat' : ctx.mode === 'zone' ? 'Zone Chat' : ctx.mode === 'private' ? 'Private Messages' : 'Yell Chat';
        const fromDate = new Date(ctx.windowFrom);
        const toDate = new Date(ctx.windowTo);
        const windowInfo = this._formatContextTime(fromDate) + ' \u2014 ' + this._formatContextTime(toDate);

        let detailParts = [modeLabel];
        if (ctx.params.world_id != null) detailParts.push('W' + ctx.params.world_id);
        if (ctx.params.zone_id != null) detailParts.push('Zone ' + ctx.params.zone_id);
        if (ctx.params.player_a) detailParts.push(ctx.params.player_a + ' \u2194 ' + ctx.params.player_b);

        panel.innerHTML = `
            <div class="conv-header">
                <div class="conv-header-left">
                    <svg class="conv-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span class="conv-title">Conversation Context</span>
                    <span class="conv-detail">${this._escapeHtml(detailParts.join(' \u00b7 '))}</span>
                </div>
                <div class="conv-header-right">
                    <span class="conv-window">${windowInfo}</span>
                    <button class="conv-close-btn" id="convCloseBtn" title="Close">\u00d7</button>
                </div>
            </div>
            <button class="conv-load-btn conv-load-earlier ${ctx.hasEarlier ? '' : 'exhausted'}" id="convLoadEarlier">${ctx.hasEarlier ? 'Load Earlier' : 'Load Earlier (expand window)'}</button>
            <div class="conv-msg-list" id="convMsgList">
                ${ctx.messages.length === 0 ? '<div class="conv-empty">No other messages in this context window</div>' : ctx.messages.map(m => this._renderContextMessage(m)).join('')}
            </div>
            <button class="conv-load-btn conv-load-later ${ctx.hasLater ? '' : 'exhausted'}" id="convLoadLater">${ctx.hasLater ? 'Load Later' : 'Load Later (expand window)'}</button>
            ${ctx.participants.length > 0 ? `
                <div class="conv-participants">
                    <span class="conv-participants-label">Participants:</span>
                    ${ctx.participants.map(p => {
                        const pMsg = ctx.messages.find(m => m.username === p);
                        const pAccountId = pMsg ? pMsg.accountId : '';
                        return `<a href="#" class="conv-participant" data-account-id="${pAccountId}" data-username="${this._escapeHtml(p)}" style="color:${this._getPlayerColor(p)}">${this._escapeHtml(p)}</a>`;
                    }).join('')}
                </div>
            ` : ''}
        `;

        // Bind events
        document.getElementById('convCloseBtn')?.addEventListener('click', () => this._closeContext());
        document.getElementById('convLoadEarlier')?.addEventListener('click', () => this._loadEarlier());
        document.getElementById('convLoadLater')?.addEventListener('click', () => this._loadLater());

        // Participant clicks → filter chat logs by that player's account_id
        panel.querySelectorAll('.conv-participant').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const accountId = link.dataset.accountId;
                if (accountId) {
                    this._closeContext();
                    this._filters = { account_id: accountId };
                    this._page = 1;
                    this.render();
                    this.load();
                }
            });
        });

        // Username clicks in messages → filter chat logs by that player's account_id
        panel.querySelectorAll('.conv-username').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const accountId = link.dataset.accountId;
                if (accountId) {
                    this._closeContext();
                    this._filters = { account_id: accountId };
                    this._page = 1;
                    this.render();
                    this.load();
                }
            });
        });
    },

    _renderContextMessage(msg) {
        const isHighlighted = this._context.highlightIds.includes(msg.id);
        const isPM = msg.chatType === 'PRIVATE';
        const isYell = msg.chatType === 'YELL';
        const isClan = msg.chatType === 'CLAN';
        const color = this._getPlayerColor(msg.username);
        const time = new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

        let classes = 'conv-msg';
        if (isHighlighted) classes += ' highlighted';
        if (isPM) classes += ' pm';
        if (isYell) classes += ' yell';
        if (isClan) classes += ' clan';

        let recipient = '';
        if (isPM && msg.recipient) {
            recipient = ` <span class="conv-recipient">\u2192 ${this._escapeHtml(msg.recipient)}</span>`;
        }

        // Rank icon(s) for this player
        const rankIcons = this._getRankIcons(msg.accountId);

        return `
            <div class="${classes}">
                <span class="conv-time">${time}</span>
                ${rankIcons}<a href="#" class="conv-username" data-account-id="${msg.accountId}" style="color:${color}">${this._escapeHtml(msg.username)}</a>${recipient}
                <span class="conv-text">${this._escapeHtml(msg.message || '')}</span>
            </div>
        `;
    },

    _closeContext() {
        this._context.isOpen = false;
        this._context.messages = [];
        const panel = document.getElementById('chatContextPanel');
        if (panel) panel.style.display = 'none';
    },

    _getPlayerColor(username) {
        if (!username) return this.PLAYER_COLORS[0];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = ((hash << 5) - hash) + username.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit int
        }
        return this.PLAYER_COLORS[Math.abs(hash) % this.PLAYER_COLORS.length];
    },

    // Staff rank icon filename map (matches Utils.STAFF_RANK_ICONS)
    STAFF_RANK_ICONS: {
        'OWNER': 'OWNER.png', 'DEVELOPER': 'DEVELOPER.png', 'MANAGER': 'MANAGER.png',
        'ADMINISTRATOR': 'ADMIN.png', 'HEAD_MODERATOR': 'MOD.png', 'MODERATOR': 'MOD.png',
        'SUPPORT': 'SUPPORT.png', 'YOUTUBER': 'YOUTUBER.png'
    },

    _getRankIcons(accountId) {
        const roleInfo = this._context.roles[String(accountId)];
        if (!roleInfo) return '';

        let html = '';
        // Staff rank icon
        if (roleInfo.staffRole && roleInfo.staffRole !== 'PLAYER') {
            const iconFile = this.STAFF_RANK_ICONS[roleInfo.staffRole];
            if (iconFile) {
                html += `<img src="assets/staff-ranks/${iconFile}" alt="${roleInfo.staffRole}" class="conv-rank-icon" title="${roleInfo.staffRole}">`;
            }
        }
        // Donator rank icon
        if (roleInfo.donatorRank) {
            html += `<img src="assets/donator-ranks/${roleInfo.donatorRank}.png" alt="${roleInfo.donatorRank}" class="conv-rank-icon" title="${roleInfo.donatorRank}">`;
        }
        return html;
    },

    _formatContextTime(date) {
        const d = date;
        const month = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        return `${month} ${time}`;
    },

    _renderPagination() {
        const el = document.getElementById('chatLogsPagination');
        if (!el) return;

        const totalPages = Math.max(1, Math.ceil(this._total / this._limit));

        el.innerHTML = `
            <div class="chat-logs-page-info">
                Showing ${this._logs.length} of ${this._total} entries
            </div>
            <div class="chat-logs-page-controls">
                <button class="chat-logs-page-btn" ${this._page <= 1 ? 'disabled' : ''} data-page="${this._page - 1}">Prev</button>
                <span class="chat-logs-page-label">Page ${this._page} of ${totalPages}</span>
                <button class="chat-logs-page-btn" ${this._page >= totalPages ? 'disabled' : ''} data-page="${this._page + 1}">Next</button>
            </div>
        `;

        el.querySelectorAll('.chat-logs-page-btn').forEach(btn => {
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
        return type.charAt(0) + type.slice(1).toLowerCase();
    },

    _getChatClass(type) {
        const map = {
            'PUBLIC': 'public', 'PRIVATE': 'private', 'CLAN': 'clan',
            'TRADE': 'trade', 'YELL': 'yell'
        };
        return map[type] || 'public';
    },

    _truncateMessage(msg) {
        if (!msg) return '<span class="log-muted">\u2014</span>';
        const escaped = this._escapeHtml(msg);
        if (msg.length > 80) {
            return `<span title="${escaped}">${this._escapeHtml(msg.substring(0, 80))}...</span>`;
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
    module.exports = ChatLogs;
}
