/* ============================================================
   ELDEROS STAFF PANEL - POPUP/MODAL MODULE
   ============================================================ */

const Popup = {
    // State
    currentPlayer: null,
    currentTab: 'info',
    isOpen: false,
    popupNotes: [],
    popupNotesLoaded: false,

    // Elements
    elements: {},

    /**
     * Initialize popup module
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            backdrop: document.getElementById('playerPopup'),
            modal: document.querySelector('#playerPopup .modal')
        };
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close on backdrop click
        this.elements.backdrop?.addEventListener('click', (e) => {
            if (e.target === this.elements.backdrop) {
                this.close();
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    /**
     * Open player popup
     */
    async openPlayer(playerId) {
        if (!playerId) return;

        // Ashpire account protection
        if (typeof CONFIG !== 'undefined' && String(playerId) === String(CONFIG.ASHPIRE_ACCOUNT_ID) && !Auth.isAshpire()) {
            Toast.error('You do not have permission to view this account');
            return;
        }

        this.showLoading();
        this.open();

        try {
            const player = await API.players.get(playerId);
            this.currentPlayer = player;
            this.renderPlayerPopup(player);
        } catch (error) {
            Toast.error(error.message || 'Failed to load player');
            this.close();
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.modal) {
            this.elements.modal.innerHTML = `
                <div class="modal-header">
                    <span class="modal-title">Loading...</span>
                    <button class="modal-close" onclick="Popup.close()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="display: flex; align-items: center; justify-content: center; padding: 48px;">
                        <div class="spinner spinner-lg"></div>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Open popup
     */
    open() {
        this.isOpen = true;
        this.elements.backdrop?.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close popup
     */
    close() {
        this.isOpen = false;
        this.elements.backdrop?.classList.remove('show');
        document.body.style.overflow = '';
        this.currentPlayer = null;
        this.currentTab = 'info';
        this.popupNotes = [];
        this.popupNotesLoaded = false;
    },

    /**
     * Render player popup
     */
    renderPlayerPopup(player) {
        if (!this.elements.modal) return;

        const statusBadge = player.banned
            ? '<span class="badge badge-error">Banned</span>'
            : player.online
            ? '<span class="badge badge-success">Online</span>'
            : '';

        const canPunish = Auth.hasPermission(CONFIG.PERMISSIONS.TEMP_BAN);
        const canModify = Auth.hasPermission(CONFIG.PERMISSIONS.MODIFY_PLAYER_DATA);
        const canViewNotes = Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES);

        this.elements.modal.innerHTML = `
            <!-- Player Header -->
            <div class="player-header">
                <div class="player-avatar-large">
                    <span class="player-avatar-large-initial">${player.username.charAt(0).toUpperCase()}</span>
                </div>
                <div class="player-header-info">
                    <div class="player-header-top">
                        <span class="player-name-large">${Utils.escapeHtml(player.username)}</span>
                        <div class="player-badges">
                            ${statusBadge}
                            ${player.donatorRank ? `<span class="badge badge-accent">${player.donatorRank}</span>` : ''}
                        </div>
                    </div>
                    <div class="player-header-meta">
                        <span class="player-header-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Last seen ${Utils.formatRelativeTime(player.lastLogin)}
                        </span>
                        <span class="player-header-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            Joined ${Utils.formatDate(player.createdAt, { hour: undefined, minute: undefined })}
                        </span>
                    </div>
                </div>
                <button class="modal-close" onclick="Popup.close()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <!-- Tabs -->
            <div class="popup-tabs">
                <button class="popup-tab active" data-tab="info" onclick="Popup.switchTab('info')">Info</button>
                ${canPunish ? '<button class="popup-tab" data-tab="actions" onclick="Popup.switchTab(\'actions\')">Actions</button>' : ''}
                ${canViewNotes ? '<button class="popup-tab" data-tab="notes" onclick="Popup.switchTab(\'notes\')">Notes</button>' : ''}
                <button class="popup-tab" data-tab="logs" onclick="Popup.switchTab('logs')">
                    Logs
                </button>
            </div>

            <!-- Tab Content -->
            <div class="modal-body" style="padding: 0;">
                <!-- Info Tab -->
                <div class="popup-tab-content active" data-content="info">
                    ${this.renderInfoTab(player)}
                </div>

                ${canPunish ? `
                <!-- Actions Tab -->
                <div class="popup-tab-content" data-content="actions">
                    ${this.renderActionsTab(player)}
                </div>
                ` : ''}

                ${canViewNotes ? `
                <!-- Notes Tab -->
                <div class="popup-tab-content" data-content="notes">
                    <div id="popupNotesContent" style="padding: var(--spacing-lg);">
                        <div style="display: flex; align-items: center; justify-content: center; padding: 24px;">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Logs Tab -->
                <div class="popup-tab-content" data-content="logs">
                    ${this.renderLogsTab(player)}
                </div>
            </div>
        `;
    },

    /**
     * Render info tab
     */
    renderInfoTab(player) {
        return `
            <div style="padding: var(--spacing-lg);">
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Player ID</div>
                        <div class="info-value mono">${player.id}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Username</div>
                        <div class="info-value">${Utils.escapeHtml(player.username)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Play Time</div>
                        <div class="info-value">${Utils.formatDuration(player.playTime || 0)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Bank Value</div>
                        <div class="info-value currency">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                            </svg>
                            ${Utils.formatNumber(player.bankValue || 0)}
                        </div>
                    </div>
                    ${Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_LOGS) ? `
                    <div class="info-item">
                        <div class="info-label">Last IP</div>
                        <div class="info-value mono">${player.lastIp || 'N/A'}</div>
                        <div class="info-actions">
                            <button class="btn btn-secondary btn-sm" onclick="Popup.searchByIP('${player.lastIp}')">Search IP</button>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">MAC Address</div>
                        <div class="info-value mono">${player.macAddress || 'N/A'}</div>
                    </div>
                    ` : ''}
                </div>

                ${player.linkedAccounts && player.linkedAccounts.length > 0 ? `
                <h4 style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); font-size: var(--text-base); color: var(--text-primary);">Linked Accounts</h4>
                <div class="linked-accounts-list">
                    ${player.linkedAccounts.map(acc => `
                        <div class="linked-account-item" onclick="Popup.openPlayer('${acc.id}')">
                            <div class="linked-account-avatar">
                                <span class="linked-account-avatar-initial">${acc.username.charAt(0).toUpperCase()}</span>
                            </div>
                            <div class="linked-account-info">
                                <div class="linked-account-name">${Utils.escapeHtml(acc.username)}</div>
                                <div class="linked-account-reason">${acc.linkReason || 'Same IP/MAC'}</div>
                            </div>
                            <div class="linked-account-arrow">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6"/>
                                </svg>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${player.punishments && player.punishments.length > 0 ? `
                <h4 style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); font-size: var(--text-base); color: var(--text-primary);">Punishment History</h4>
                <div class="punishments-list">
                    ${player.punishments.slice(0, 3).map(p => this.renderPunishment(p)).join('')}
                </div>
                ${player.punishments.length > 3 ? `
                <button class="btn btn-secondary btn-sm" style="margin-top: var(--spacing-md);" onclick="Popup.switchTab('logs')">
                    View All (${player.punishments.length})
                </button>
                ` : ''}
                ` : ''}
            </div>
        `;
    },

    /**
     * Render a punishment item
     */
    renderPunishment(p) {
        const isActive = p.active && !p.revoked;
        const statusClass = p.revoked ? 'revoked' : (isActive ? 'active' : 'expired');
        const statusText = p.revoked ? 'Revoked' : (isActive ? 'Active' : 'Expired');

        return `
            <div class="punishment-item ${statusClass}">
                <div class="punishment-header">
                    <div class="punishment-type">
                        ${Utils.getPunishmentBadge(p.type)}
                    </div>
                    <span class="punishment-status badge ${p.revoked ? 'badge-warning' : (isActive ? 'badge-error' : '')}">${statusText}</span>
                </div>
                <div class="punishment-reason">${Utils.escapeHtml(p.reason)}</div>
                <div class="punishment-meta">
                    <span class="punishment-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        By ${Utils.escapeHtml(p.staffName || 'System')}
                    </span>
                    <span class="punishment-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${Utils.formatRelativeTime(p.createdAt)}
                    </span>
                    <span class="punishment-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        </svg>
                        ${p.duration === -1 ? 'Permanent' : Utils.formatDuration(p.duration)}
                    </span>
                </div>
            </div>
        `;
    },

    /**
     * Render actions tab
     */
    renderActionsTab(player) {
        const canBan = Auth.hasPermission(CONFIG.PERMISSIONS.TEMP_BAN);
        const canPermBan = Auth.hasPermission(CONFIG.PERMISSIONS.PERM_BAN);
        const canIpBan = Auth.hasPermission(CONFIG.PERMISSIONS.IP_BAN);
        const canMute = Auth.hasPermission(CONFIG.PERMISSIONS.MUTE_PLAYER);
        const canKick = Auth.hasPermission(CONFIG.PERMISSIONS.KICK_PLAYER);
        const canTimeout = Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_TIMEOUTS);

        return `
            <div style="padding: var(--spacing-lg);">
                <h4 style="margin-bottom: var(--spacing-md); font-size: var(--text-base); color: var(--text-primary);">Quick Actions</h4>
                <div class="action-buttons">
                    ${canKick && player.online ? `
                    <button class="action-btn" onclick="Popup.performAction('kick')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Kick Player
                    </button>
                    ` : ''}
                    ${canMute ? `
                    <button class="action-btn" onclick="Popup.performAction('mute')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            <line x1="23" y1="9" x2="17" y2="15"/>
                            <line x1="17" y1="9" x2="23" y2="15"/>
                        </svg>
                        Mute Player
                    </button>
                    ` : ''}
                    ${canTimeout ? `
                    <button class="action-btn" onclick="Popup.performAction('timeout')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Timeout Player
                    </button>
                    ` : ''}
                    ${canBan ? `
                    <button class="action-btn danger" onclick="Popup.performAction('ban')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        Ban Player
                    </button>
                    ` : ''}
                    ${canIpBan ? `
                    <button class="action-btn danger" onclick="Popup.performAction('ipban')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                            <line x1="6" y1="6" x2="6.01" y2="6"/>
                            <line x1="6" y1="18" x2="6.01" y2="18"/>
                        </svg>
                        IP Ban
                    </button>
                    ` : ''}
                </div>

                ${player.banned && player.activeBan ? `
                <h4 style="margin-top: var(--spacing-xl); margin-bottom: var(--spacing-md); font-size: var(--text-base); color: var(--text-primary);">Active Punishment</h4>
                ${this.renderPunishment(player.activeBan)}
                <button class="btn btn-warning" style="margin-top: var(--spacing-md);" onclick="Popup.showRevokeModal('${player.activeBan.id}')">
                    Revoke Ban
                </button>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render logs tab
     */
    renderLogsTab(player) {
        if (!player.logs || player.logs.length === 0) {
            return `
                <div style="padding: var(--spacing-lg);">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <div class="empty-state-title">No logs available</div>
                        <div class="empty-state-text">Player activity logs will appear here</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="logs-list">
                ${player.logs.map(log => `
                    <div class="log-item">
                        <div class="log-icon ${log.type}">
                            ${this.getLogIcon(log.type)}
                        </div>
                        <div class="log-content">
                            <div class="log-message">${Utils.escapeHtml(log.message)}</div>
                            <div class="log-time">${Utils.formatRelativeTime(log.timestamp)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Get log icon SVG
     */
    getLogIcon(type) {
        const icons = {
            trade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
            drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
            pickup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
            command: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
            chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
        };
        return icons[type] || icons.chat;
    },

    /**
     * Switch tab
     */
    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.popup-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.popup-tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.content === tab);
        });

        // Lazy-load popup notes
        if (tab === 'notes' && !this.popupNotesLoaded && this.currentPlayer) {
            this._loadPopupNotes(this.currentPlayer.id);
        }
    },

    /**
     * Search by IP
     */
    searchByIP(ip) {
        if (!ip || ip === 'N/A') return;
        this.close();
        Search.setState('ip', ip);
        Router.navigate('players');
        Search.performSearch();
    },

    // === Action Modal System ===

    /**
     * Action config definitions
     */
    _actionConfig: {
        kick:    { type: 'KICK',     title: 'Kick Player',    needsDuration: false, danger: false },
        mute:    { type: 'MUTE',     title: 'Mute Player',    needsDuration: true,  danger: false,
                   presets: [{l:'1h',v:60},{l:'6h',v:360},{l:'12h',v:720},{l:'24h',v:1440},{l:'3d',v:4320},{l:'7d',v:10080}] },
        timeout: { type: 'TIMEOUT',  title: 'Timeout Player',  needsDuration: true,  danger: false,
                   presets: [{l:'30m',v:30},{l:'1h',v:60},{l:'6h',v:360},{l:'12h',v:720},{l:'24h',v:1440},{l:'3d',v:4320}] },
        ban:     { type: 'TEMP_BAN', title: 'Ban Player',      needsDuration: true,  danger: true, hasBanType: true,
                   presets: [{l:'24h',v:1440},{l:'3d',v:4320},{l:'7d',v:10080},{l:'14d',v:20160},{l:'30d',v:43200}] },
        ipban:   { type: 'IP_BAN',   title: 'IP Ban Player',   needsDuration: false, danger: true }
    },

    /**
     * Perform action — opens a form modal for the given action
     */
    performAction(action) {
        const player = this.currentPlayer;
        if (!player) return;

        const config = this._actionConfig[action];
        if (!config) return;

        this._showActionModal(player, action, config);
    },

    /**
     * Quick punish from table (opens action modal with a specific player)
     */
    async quickPunish(playerId, type) {
        try {
            const player = await API.players.get(playerId);
            this.currentPlayer = player;
            const config = this._actionConfig[type];
            if (config) {
                this._showActionModal(player, type, config);
            }
        } catch (error) {
            Toast.error(error.message || 'Failed to load player');
        }
    },

    /**
     * Show the action form modal
     */
    _showActionModal(player, action, config) {
        // Remove existing action modal if any
        document.querySelector('.action-modal-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'action-modal-overlay';

        const dangerClass = config.danger ? ' danger' : '';
        const banTypeSection = config.hasBanType ? `
            <div class="action-form-group">
                <label class="action-form-label">Ban Type</label>
                <div class="action-ban-type-selector">
                    <button class="action-ban-type-btn active" data-ban-type="TEMP_BAN">Temporary</button>
                    <button class="action-ban-type-btn" data-ban-type="PERM_BAN">Permanent</button>
                </div>
            </div>
        ` : '';

        const durationSection = config.needsDuration ? `
            <div class="action-form-group" id="actionDurationGroup">
                <label class="action-form-label">Duration</label>
                <div class="action-duration-presets">
                    ${(config.presets || []).map(p => `<button class="action-duration-preset" data-minutes="${p.v}">${p.l}</button>`).join('')}
                </div>
                <div class="action-duration-custom">
                    <input type="number" id="actionDurationInput" class="action-form-input" placeholder="Custom minutes" min="1">
                    <span class="action-duration-unit">minutes</span>
                </div>
            </div>
        ` : '';

        overlay.innerHTML = `
            <div class="action-modal-content">
                <div class="action-modal-header${dangerClass}">
                    <div class="action-modal-title">${config.title}</div>
                    <div class="action-modal-subtitle">Target: <strong>${this._escapeHtml(player.username)}</strong> (ID: ${player.id})</div>
                </div>
                ${banTypeSection}
                <div class="action-form-group">
                    <label class="action-form-label">Reason <span class="action-form-hint">(min 5 characters)</span></label>
                    <textarea id="actionReasonInput" class="action-form-textarea" placeholder="Enter reason for this action..." rows="3"></textarea>
                    <div class="action-form-charcount"><span id="actionCharCount">0</span>/5 characters minimum</div>
                </div>
                ${durationSection}
                <div class="action-modal-actions">
                    <button class="action-modal-cancel" id="actionCancelBtn">Cancel</button>
                    <button class="action-modal-confirm${dangerClass}" id="actionConfirmBtn" disabled>${config.title}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // State
        let selectedBanType = 'TEMP_BAN';
        let selectedDuration = null;

        const reasonEl = document.getElementById('actionReasonInput');
        const confirmBtn = document.getElementById('actionConfirmBtn');
        const charCount = document.getElementById('actionCharCount');
        const durationInput = document.getElementById('actionDurationInput');

        reasonEl.focus();

        // Validate form state
        const validate = () => {
            const reasonOk = reasonEl.value.trim().length >= 5;
            const currentType = config.hasBanType ? selectedBanType : config.type;
            const needsDur = config.needsDuration && currentType !== 'PERM_BAN';
            const durationOk = !needsDur || (selectedDuration && selectedDuration > 0);
            confirmBtn.disabled = !(reasonOk && durationOk);
        };

        // Reason input
        reasonEl.addEventListener('input', () => {
            charCount.textContent = reasonEl.value.trim().length;
            validate();
        });

        // Duration presets
        overlay.querySelectorAll('.action-duration-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.action-duration-preset').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDuration = parseInt(btn.dataset.minutes);
                if (durationInput) durationInput.value = '';
                validate();
            });
        });

        // Custom duration
        if (durationInput) {
            durationInput.addEventListener('input', () => {
                const val = parseInt(durationInput.value);
                if (val > 0) {
                    overlay.querySelectorAll('.action-duration-preset').forEach(b => b.classList.remove('active'));
                    selectedDuration = val;
                } else {
                    selectedDuration = null;
                }
                validate();
            });
        }

        // Ban type toggle
        overlay.querySelectorAll('.action-ban-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                overlay.querySelectorAll('.action-ban-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedBanType = btn.dataset.banType;

                // Show/hide duration for perm ban
                const durGroup = document.getElementById('actionDurationGroup');
                if (durGroup) {
                    durGroup.style.display = selectedBanType === 'PERM_BAN' ? 'none' : '';
                }
                validate();
            });
        });

        // Cancel
        document.getElementById('actionCancelBtn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // Confirm
        confirmBtn.addEventListener('click', async () => {
            const reason = reasonEl.value.trim();
            if (reason.length < 5) return;

            const punishmentType = config.hasBanType ? selectedBanType : config.type;
            const needsDur = config.needsDuration && punishmentType !== 'PERM_BAN';
            const duration = needsDur ? selectedDuration : null;

            if (needsDur && (!duration || duration < 1)) return;

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Submitting...';

            try {
                const result = await API.punishments.create(player.id, punishmentType, reason, duration);
                overlay.remove();
                Toast.success(result.message || `${config.title} successful`);
                // Refresh player data if popup is still open
                if (this.currentPlayer && this.currentPlayer.id === player.id) {
                    this.openPlayer(player.id);
                }
            } catch (error) {
                Toast.error(error.message || `Failed to ${action} player`);
                confirmBtn.disabled = false;
                confirmBtn.textContent = config.title;
            }
        });
    },

    /**
     * Show revoke modal (for revoking from popup actions tab)
     */
    showRevokeModal(punishmentId) {
        document.querySelector('.action-modal-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'action-modal-overlay';
        overlay.innerHTML = `
            <div class="action-modal-content">
                <div class="action-modal-header">
                    <div class="action-modal-title">Revoke Punishment</div>
                    <div class="action-modal-subtitle">Provide a reason for revoking this punishment (min 10 characters)</div>
                </div>
                <div class="action-form-group">
                    <textarea id="revokeReasonInput" class="action-form-textarea" placeholder="Reason for revocation..." rows="3"></textarea>
                    <div class="action-form-charcount"><span id="revokeCharCount">0</span>/10 characters minimum</div>
                </div>
                <div class="action-modal-actions">
                    <button class="action-modal-cancel" id="revokeCancelBtn">Cancel</button>
                    <button class="action-modal-confirm" id="revokeConfirmBtn" disabled>Revoke</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const textarea = document.getElementById('revokeReasonInput');
        const confirmBtn = document.getElementById('revokeConfirmBtn');
        const charCount = document.getElementById('revokeCharCount');

        textarea.focus();

        textarea.addEventListener('input', () => {
            const len = textarea.value.trim().length;
            charCount.textContent = len;
            confirmBtn.disabled = len < 10;
        });

        document.getElementById('revokeCancelBtn').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        confirmBtn.addEventListener('click', async () => {
            const reason = textarea.value.trim();
            if (reason.length < 10) return;

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Revoking...';

            try {
                await API.punishments.revoke(punishmentId, reason);
                overlay.remove();
                Toast.success('Punishment revoked');
                if (this.currentPlayer) {
                    this.openPlayer(this.currentPlayer.id);
                }
            } catch (error) {
                Toast.error(error.message || 'Failed to revoke punishment');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Revoke';
            }
        });
    },

    // === Popup Notes ===

    async _loadPopupNotes(playerId) {
        try {
            const response = await API.notes.getForPlayer(playerId);
            if (response.success) {
                this.popupNotes = response.notes || [];
                this.popupNotesLoaded = true;
                this._renderPopupNotes();
            }
        } catch (error) {
            console.error('[Popup] Failed to load notes:', error);
            const container = document.getElementById('popupNotesContent');
            if (container) {
                container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Failed to load notes</div>';
            }
        }
    },

    _renderPopupNotes() {
        const container = document.getElementById('popupNotesContent');
        if (!container) return;

        const canAdd = Auth.hasPermission(CONFIG.PERMISSIONS.ADD_NOTE);
        const recentNotes = this.popupNotes.slice(0, 5);
        const totalCount = this.popupNotes.length;

        const addForm = canAdd ? `
            <div class="popup-note-add">
                <textarea id="popupNoteInput" class="popup-note-textarea" placeholder="Quick note..." maxlength="1000" rows="2"></textarea>
                <div class="popup-note-add-actions">
                    <span class="popup-note-charcount"><span id="popupNoteCharCount">0</span>/1000</span>
                    <button class="btn btn-primary btn-sm" id="popupNoteSubmitBtn" onclick="Popup._submitPopupNote()" disabled>Add</button>
                </div>
            </div>
        ` : '';

        const notesHtml = recentNotes.length === 0
            ? '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No notes yet</div>'
            : recentNotes.map(note => `
                <div class="popup-note-item ${note.isPinned ? 'pinned' : ''}">
                    <div class="popup-note-header">
                        ${note.isPinned ? '<svg class="player-note-pin-icon active" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="12" height="12"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>' : ''}
                        <span class="popup-note-author">${this._escapeHtml(note.staffUsername)}</span>
                        <span class="popup-note-time">${Utils.formatRelativeTime(note.createdAt)}</span>
                    </div>
                    <div class="popup-note-text">${this._escapeHtml(note.noteText)}</div>
                </div>
            `).join('');

        const viewAllBtn = totalCount > 5 && this.currentPlayer ? `
            <button class="btn btn-secondary btn-sm" style="margin-top: var(--spacing-sm); width: 100%;" onclick="Popup.close(); PlayerView.open(${this.currentPlayer.id}).then(() => { const el = document.getElementById('pvPanelNotes'); if (el) el.scrollIntoView({behavior:'smooth'}); });">
                View All Notes (${totalCount})
            </button>
        ` : '';

        container.innerHTML = addForm + notesHtml + viewAllBtn;

        // Setup note input listener
        const input = document.getElementById('popupNoteInput');
        const charCount = document.getElementById('popupNoteCharCount');
        const submitBtn = document.getElementById('popupNoteSubmitBtn');
        if (input && charCount && submitBtn) {
            input.addEventListener('input', () => {
                const len = input.value.length;
                charCount.textContent = len;
                submitBtn.disabled = len === 0 || len > 1000;
            });
        }
    },

    async _submitPopupNote() {
        if (!this.currentPlayer) return;
        const input = document.getElementById('popupNoteInput');
        const submitBtn = document.getElementById('popupNoteSubmitBtn');
        if (!input) return;

        const noteText = input.value.trim();
        if (!noteText || noteText.length > 1000) return;

        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        try {
            await API.notes.create(this.currentPlayer.id, noteText);
            Toast.success('Note added');
            input.value = '';
            document.getElementById('popupNoteCharCount').textContent = '0';
            this.popupNotesLoaded = false;
            await this._loadPopupNotes(this.currentPlayer.id);
        } catch (error) {
            Toast.error(error.message || 'Failed to add note');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add';
        }
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
    module.exports = Popup;
}
