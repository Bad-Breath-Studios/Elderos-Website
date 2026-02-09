/* ============================================================
   ELDEROS STAFF PANEL - PLAYER VIEW MODULE
   Self-describing player view with edit mode support
   ============================================================ */
console.log('[PlayerView] Loading player-view.js...');

const PlayerView = {
    // State
    player: null,
    header: null,
    sections: [],
    permissions: [],
    enums: {},
    editMode: false,
    isSaving: false, // Prevent duplicate save submissions
    pendingChanges: new Map(), // key -> { scope, worldType, oldValue, newValue, label }
    currentWorldType: 'ECONOMY',
    currentTab: 'info',

    // Notes & Tags state
    notes: [],
    tags: [],
    notesLoaded: false,
    tagsLoaded: false,

    // Predefined tags
    PREDEFINED_TAGS: [
        'RWT Suspect', 'Known Botter', 'Alt Account', 'VIP',
        'Content Creator', 'Bug Abuser', 'Trusted Trader', 'Restricted'
    ],

    // Elements (cached after render)
    elements: {},

    /**
     * Initialize the player view module
     */
    init() {
        console.log('[PlayerView] init()');
        this.loadEnums();
    },

    /**
     * Load enum definitions from API
     */
    async loadEnums() {
        try {
            const response = await API.get('/enums');
            if (response.success && response.enums) {
                this.enums = response.enums;
                console.log('[PlayerView] Loaded enums:', Object.keys(this.enums));
            }
        } catch (error) {
            console.error('[PlayerView] Failed to load enums:', error);
        }
    },

    /**
     * Open player view for a specific player ID
     */
    async open(playerId) {
        if (!playerId) return;

        // Ashpire account protection — only Ashpire can view their own account
        if (typeof CONFIG !== 'undefined' && String(playerId) === String(CONFIG.ASHPIRE_ACCOUNT_ID) && !Auth.isAshpire()) {
            Toast.error('You do not have permission to view this account');
            return;
        }

        console.log('[PlayerView] Opening player:', playerId);

        // Get container elements
        const playersPage = document.getElementById('page-players');
        const container = document.getElementById('player-view-container');

        console.log('[PlayerView] page-players element:', playersPage);
        console.log('[PlayerView] player-view-container element:', container);

        if (!container) {
            console.error('[PlayerView] CRITICAL: player-view-container not found in DOM!');
            Toast.error('Player view container not found');
            return;
        }

        // Show player view container, hide players list
        playersPage?.classList.add('hidden');
        container.classList.remove('hidden');

        console.log('[PlayerView] Container now visible, classes:', container.className);

        // Show loading state
        this.renderLoading();

        try {
            // Fetch player data with self-describing response
            console.log('[PlayerView] Fetching player data for ID:', playerId);
            const response = await API.get(`/players/${playerId}`);
            console.log('[PlayerView] API Response:', response);

            if (!response || !response.success) {
                throw new Error(response?.message || 'Failed to load player');
            }

            this.player = response.player;
            this.header = response.header;
            this.sections = response.sections || [];
            this.permissions = response.staffPermissions || [];

            // Reset state
            this.editMode = false;
            this.pendingChanges.clear();
            this.currentTab = 'info';
            this.notes = [];
            this.tags = [];
            this.notesLoaded = false;
            this.tagsLoaded = false;
            document.body.classList.remove('player-view-edit-mode');

            // Load tags immediately (shown in header)
            if (Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
                this.loadTags(this.player.id);
            }

            // Render the full view
            this.render();

            // Check for restored draft from session timeout
            const draftData = SessionManager.getDraftData('player_edit_' + playerId);
            if (draftData && Object.keys(draftData).length > 0) {
                Toast.info('You have unsaved changes from a previous session. Enable edit mode to continue.');
                SessionManager.clearStoredDraft('player_edit_' + playerId);
            }

        } catch (error) {
            console.error('[PlayerView] Error loading player:', error);
            Toast.error(error.message || 'Failed to load player');
            this.close();
        }
    },

    /**
     * Render loading state
     */
    renderLoading() {
        const container = document.getElementById('player-view-container');
        container.innerHTML = `
            <div class="player-view-container">
                <div class="player-view-top-bar">
                    <button class="player-view-back-btn" onclick="PlayerView.close()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        Back to Players
                    </button>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; padding: 80px;">
                    <div class="spinner spinner-lg"></div>
                </div>
            </div>
        `;
    },

    /**
     * Render the complete player view
     */
    render() {
        console.log('[PlayerView] render() called');
        console.log('[PlayerView] Player:', this.player);
        console.log('[PlayerView] Sections:', this.sections?.length);

        const container = document.getElementById('player-view-container');
        if (!container) {
            console.error('[PlayerView] Container not found!');
            return;
        }

        try {
            const topBar = this.renderTopBar();
            const editBanner = this.renderEditModeBanner();
            const header = this.renderPlayerHeader();
            const tabs = this.renderTabs();
            const tabContent = this.renderTabContent();
            const reasonModal = this.renderReasonModal();

            container.innerHTML = `
                <div class="player-view-container">
                    ${topBar}
                    ${editBanner}
                    ${header}
                    ${tabs}
                    ${tabContent}
                </div>
                ${reasonModal}
            `;

            console.log('[PlayerView] Content rendered successfully');
        } catch (error) {
            console.error('[PlayerView] Render error:', error);
            container.innerHTML = `
                <div class="player-view-container">
                    <div class="player-view-top-bar">
                        <button class="player-view-back-btn" onclick="PlayerView.close()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                            Back to Players
                        </button>
                    </div>
                    <div style="padding: 40px; text-align: center; color: var(--error);">
                        Error loading player view: ${error.message}
                    </div>
                </div>
            `;
            return;
        }

        // Cache elements
        this.cacheElements();

        // Setup event listeners
        this.setupEventListeners();
    },

    /**
     * Cache DOM elements after render
     */
    cacheElements() {
        this.elements = {
            editToggle: document.getElementById('playerViewEditToggle'),
            worldDropdown: document.getElementById('playerViewWorldDropdown'),
            reasonModal: document.getElementById('playerViewReasonModal'),
            reasonTextarea: document.getElementById('playerViewChangeReason'),
            changesList: document.getElementById('playerViewChangesList')
        };
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (this.elements.worldDropdown && !this.elements.worldDropdown.contains(e.target)) {
                this.elements.worldDropdown.classList.remove('open');
            }
        });

        // Close modal on outside click
        if (this.elements.reasonModal) {
            this.elements.reasonModal.addEventListener('click', (e) => {
                if (e.target === this.elements.reasonModal) {
                    this.closeReasonModal();
                }
            });
        }

        // Setup input change tracking
        document.querySelectorAll('.player-view-data-input').forEach(input => {
            input.addEventListener('input', () => this.handleFieldChange(input));
            input.addEventListener('change', () => this.handleFieldChange(input));
        });
    },

    /**
     * Render top bar with back button, edit toggle, and world dropdown
     */
    renderTopBar() {
        const canEdit = this.permissions.includes('MODIFY_PLAYER_DATA') || this.permissions.includes('MANAGE_STAFF');

        return `
            <div class="player-view-top-bar">
                <button class="player-view-back-btn" onclick="PlayerView.close()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to Players
                </button>

                <div class="player-view-top-bar-right">
                    ${canEdit ? `
                    <button class="player-view-edit-toggle" id="playerViewEditToggle" onclick="PlayerView.toggleEditMode()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit Mode
                    </button>
                    ` : ''}

                    ${this.renderWorldDropdown()}
                </div>
            </div>
        `;
    },

    /**
     * Render world dropdown for profile switching
     */
    renderWorldDropdown() {
        const worldTypes = [
            { key: 'ECONOMY', label: 'Economy', icon: '💰', class: 'economy' },
            { key: 'PVP', label: 'PvP', icon: '⚔️', class: 'pvp' },
            { key: 'LEAGUES', label: 'Leagues', icon: '🏆', class: 'leagues' },
            { key: 'CUSTOMS', label: 'Customs', icon: '🎮', class: 'customs' }
        ];

        const current = worldTypes.find(w => w.key === this.currentWorldType) || worldTypes[0];

        return `
            <div class="player-view-world-dropdown" id="playerViewWorldDropdown">
                <div class="player-view-world-dropdown-btn" onclick="PlayerView.toggleWorldDropdown()">
                    <span class="player-view-world-icon ${current.class}">${current.icon}</span>
                    <div class="player-view-world-dropdown-text">
                        <span class="player-view-world-dropdown-label">Profile</span>
                        <span class="player-view-world-dropdown-value">${current.label}</span>
                    </div>
                    <svg class="player-view-world-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="player-view-world-dropdown-menu">
                    ${worldTypes.map(w => `
                        <div class="player-view-world-option ${w.key === this.currentWorldType ? 'active' : ''}" onclick="PlayerView.selectWorld('${w.key}')">
                            <span class="player-view-world-icon ${w.class}">${w.icon}</span>
                            <span class="player-view-world-option-name">${w.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render edit mode banner
     */
    renderEditModeBanner() {
        return `
            <div class="player-view-edit-mode-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit mode active — changes require a reason and will be logged
            </div>
        `;
    },

    /**
     * Render player header with avatar, badges, and stats
     */
    renderPlayerHeader() {
        if (!this.player || !this.header) return '';

        const statusClass = this.player.status === 'ONLINE' ? 'online' :
                           this.player.status === 'BANNED' ? 'banned' : 'offline';
        const statusText = this.player.status === 'ONLINE' ? 'Online' :
                          this.player.status === 'BANNED' ? 'Banned' : 'Offline';

        // Discord avatar or fallback to initial
        const avatarContent = this.player.discordAvatarUrl
            ? `<img src="${this.player.discordAvatarUrl}" alt="${this.player.username}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <span class="player-view-avatar-initial" style="display: none;">${this.player.avatarInitials || this.player.username.charAt(0).toUpperCase()}</span>`
            : `<span class="player-view-avatar-initial">${this.player.avatarInitials || this.player.username.charAt(0).toUpperCase()}</span>`;

        return `
            <div class="player-view-header">
                <div class="player-view-header-top">
                    <div class="player-view-identity">
                        <div class="player-view-avatar">${avatarContent}</div>
                        <div class="player-view-name-block">
                            <div class="player-view-name-row">
                                <span class="player-view-name">${Utils.escapeHtml(this.player.username)}</span>
                                ${this.renderBadges()}
                            </div>
                            <div class="player-view-meta">
                                ID: <span>${this.player.id}</span>
                            </div>
                        </div>
                    </div>
                    <div class="player-view-status-badge ${statusClass}">
                        <span class="player-view-status-dot"></span>
                        <div>
                            <div>${statusText}</div>
                            ${this.player.currentWorld ? `<div class="player-view-status-location">${this.player.currentWorld}</div>` : ''}
                        </div>
                    </div>
                </div>

                ${this.renderTagsBar()}

                <div class="player-view-stats">
                    ${this.header.stats.map(stat => `
                        <div class="player-view-stat">
                            <div class="player-view-stat-value ${stat.color || ''}">${stat.value}</div>
                            <div class="player-view-stat-label">${stat.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render badges from header (staff rank and donator rank with icons)
     */
    renderBadges() {
        if (!this.header || !this.header.badges) return '';

        return this.header.badges.map(badge => {
            const enumDef = this.enums[badge.type];
            const enumValue = enumDef?.values?.find(v => v.key === badge.value);
            const badgeClass = enumValue?.badgeClass || badge.value.toLowerCase();
            const label = enumValue?.label || badge.value;

            // Get icon image based on badge type
            let iconHtml = '';
            if (badge.type === 'staff_rank' && badge.value !== 'PLAYER') {
                const iconFile = this.getStaffRankIcon(badge.value);
                if (iconFile) {
                    iconHtml = `<img src="assets/staff-ranks/${iconFile}" alt="${label}" class="player-view-badge-icon">`;
                }
            } else if (badge.type === 'donator_rank' && badge.value !== 'NONE') {
                iconHtml = `<img src="assets/donator-ranks/${badge.value}.png" alt="${label}" class="player-view-badge-icon">`;
            }

            return `<span class="player-view-badge player-view-badge-${badgeClass}">${iconHtml}${label}</span>`;
        }).join('');
    },

    /**
     * Get staff rank icon filename
     */
    getStaffRankIcon(staffRole) {
        const iconMap = {
            'OWNER': 'OWNER.png',
            'DEVELOPER': 'DEVELOPER.png',
            'MANAGER': 'MANAGER.png',
            'ADMINISTRATOR': 'ADMIN.png',
            'HEAD_MODERATOR': 'MOD.png',
            'MODERATOR': 'MOD.png',
            'SUPPORT': 'SUPPORT.png'
        };
        return iconMap[staffRole] || null;
    },

    /**
     * Render tab navigation
     */
    renderTabs() {
        const canViewNotes = Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES);
        const noteCount = this.notesLoaded ? this.notes.length : 0;

        return `
            <div class="player-view-tabs">
                <button class="player-view-tab ${this.currentTab === 'info' ? 'active' : ''}" data-tab="info" onclick="PlayerView.switchTab('info')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    Information
                </button>
                <button class="player-view-tab ${this.currentTab === 'actions' ? 'active' : ''}" data-tab="actions" onclick="PlayerView.switchTab('actions')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Actions
                </button>
                ${canViewNotes ? `
                <button class="player-view-tab ${this.currentTab === 'notes' ? 'active' : ''}" data-tab="notes" onclick="PlayerView.switchTab('notes')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    Notes
                    ${noteCount > 0 ? `<span class="player-view-tab-count">${noteCount}</span>` : ''}
                </button>
                ` : ''}
                <button class="player-view-tab ${this.currentTab === 'logs' ? 'active' : ''}" data-tab="logs" onclick="PlayerView.switchTab('logs')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Logs
                </button>
            </div>
        `;
    },

    /**
     * Render tab content
     */
    renderTabContent() {
        const canViewNotes = Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES);

        return `
            <div class="player-view-tab-content ${this.currentTab === 'info' ? 'active' : ''}" id="playerViewInfoTab">
                ${this.renderInfoTab()}
            </div>
            <div class="player-view-tab-content ${this.currentTab === 'actions' ? 'active' : ''}" id="playerViewActionsTab">
                ${this.renderActionsTab()}
            </div>
            ${canViewNotes ? `
            <div class="player-view-tab-content ${this.currentTab === 'notes' ? 'active' : ''}" id="playerViewNotesTab">
                ${this.renderNotesTab()}
            </div>
            ` : ''}
            <div class="player-view-tab-content ${this.currentTab === 'logs' ? 'active' : ''}" id="playerViewLogsTab">
                ${this.renderLogsTab()}
            </div>
        `;
    },

    /**
     * Render info tab with dynamic sections
     */
    renderInfoTab() {
        if (!this.sections || this.sections.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No data available</div>';
        }

        return this.sections
            .filter(section => this.shouldShowSection(section))
            .map(section => this.renderSection(section))
            .join('');
    },

    /**
     * Check if a section should be shown based on current world type
     */
    shouldShowSection(section) {
        // Account and punishment sections always show
        if (section.scope === 'account') return true;

        // Profile sections only show if they match the current world type
        if (section.worldType) {
            return section.worldType === this.currentWorldType;
        }

        return true;
    },

    /**
     * Render a single section
     */
    renderSection(section) {
        const hasChanges = this.getSectionChangeCount(section.key) > 0;

        return `
            <div class="player-view-section ${hasChanges ? 'has-changes' : ''}" data-section="${section.key}">
                <div class="player-view-section-header" onclick="PlayerView.toggleSection(this)">
                    <div class="player-view-section-header-left">
                        <div class="player-view-section-icon ${section.color}">${section.icon}</div>
                        <div class="player-view-section-title-block">
                            <div class="player-view-section-title">${section.title}</div>
                            ${section.subtitle ? `<div class="player-view-section-subtitle">${section.subtitle}</div>` : ''}
                        </div>
                    </div>
                    <div class="player-view-section-header-right">
                        <span class="player-view-section-changes-badge">${this.getSectionChangeCount(section.key)} changes</span>
                        <div class="player-view-section-toggle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </div>
                </div>
                <div class="player-view-section-content">
                    ${this.renderSectionContent(section)}
                    <div class="player-view-section-footer">
                        <button class="btn btn-secondary" onclick="PlayerView.cancelSectionChanges('${section.key}')">Cancel</button>
                        <button class="btn btn-primary" onclick="PlayerView.saveSectionChanges('${section.key}')">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render section content (fields or groups)
     */
    renderSectionContent(section) {
        // If section has groups, render each group
        if (section.groups) {
            return section.groups.map(group => `
                <div class="player-view-data-group-header">${group.header}</div>
                ${group.fields.map(field => this.renderField(field, section)).join('')}
            `).join('');
        }

        // Otherwise render fields directly
        if (section.fields) {
            return section.fields.map(field => this.renderField(field, section)).join('');
        }

        return '';
    },

    /**
     * Render a single field
     */
    renderField(field, section) {
        const isEditable = field.editable && this.canEditField(field);
        const rowClass = isEditable ? '' : 'readonly';
        const changeKey = this.getChangeKey(section, field);
        const hasChange = this.pendingChanges.has(changeKey);

        return `
            <div class="player-view-data-row ${rowClass} ${hasChange ? 'modified' : ''}"
                 data-key="${field.key}"
                 data-section="${section.key}"
                 data-original="${this.escapeAttr(field.value)}">
                <span class="player-view-data-label">
                    ${!isEditable ? `<svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` : ''}
                    ${field.label}
                </span>
                ${this.renderFieldValue(field)}
                ${isEditable ? this.renderFieldInput(field, section) : ''}
            </div>
        `;
    },

    /**
     * Render field display value
     */
    renderFieldValue(field) {
        let valueClass = 'player-view-data-value';
        if (field.type === 'mono') valueClass += ' mono';
        // Apply type as color class for non-mono, non-badge types (e.g., green, red, accent)
        if (field.type && field.type !== 'mono' && field.type !== 'badge') {
            valueClass += ' ' + field.type;
        }
        if (field.color) valueClass += ' ' + field.color;

        // Handle badge type
        if (field.type === 'badge' && field.badgeClass) {
            return `<span class="${valueClass}"><span class="player-view-badge player-view-badge-${field.badgeClass}">${field.displayValue}</span></span>`;
        }

        return `<span class="${valueClass}">${field.displayValue || field.value || '—'}</span>`;
    },

    /**
     * Render field input for edit mode
     */
    renderFieldInput(field, section) {
        const changeKey = this.getChangeKey(section, field);
        const hasChange = this.pendingChanges.has(changeKey);
        const currentValue = hasChange ? this.pendingChanges.get(changeKey).newValue : field.value;

        switch (field.inputType) {
            case 'text':
                return `<input type="text"
                    class="player-view-data-input ${hasChange ? 'modified' : ''}"
                    value="${this.escapeAttr(currentValue)}"
                    data-key="${field.key}"
                    data-section="${section.key}"
                    ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                    ${field.pattern ? `pattern="${field.pattern}"` : ''}>`;

            case 'number':
                return `<input type="number"
                    class="player-view-data-input mono ${hasChange ? 'modified' : ''}"
                    value="${currentValue}"
                    data-key="${field.key}"
                    data-section="${section.key}"
                    ${field.min !== undefined ? `min="${field.min}"` : ''}
                    ${field.max !== undefined ? `max="${field.max}"` : ''}>`;

            case 'currency':
                // Currency stored in cents, display as dollars
                const centsValue = hasChange ? currentValue : field.value;
                const dollarsValue = (centsValue / 100).toFixed(2);
                return `<input type="number"
                    class="player-view-data-input mono ${hasChange ? 'modified' : ''}"
                    value="${dollarsValue}"
                    data-key="${field.key}"
                    data-section="${section.key}"
                    data-input-type="currency"
                    min="0"
                    step="0.01">`;

            case 'boolean':
                const isActive = currentValue === true || currentValue === 'true';
                return `<div class="player-view-data-toggle-wrapper">
                    <div class="player-view-data-toggle ${isActive ? 'active' : ''}"
                        data-key="${field.key}"
                        data-section="${section.key}"
                        onclick="PlayerView.toggleBoolean(this)"></div>
                </div>`;

            case 'enum':
                return this.renderEnumSelect(field, section, currentValue, hasChange);

            default:
                return '';
        }
    },

    /**
     * Render enum select dropdown
     */
    renderEnumSelect(field, section, currentValue, hasChange) {
        const enumDef = this.enums[field.enumType];
        if (!enumDef || !enumDef.values) {
            return `<select class="player-view-data-input" disabled><option>Error loading options</option></select>`;
        }

        // Filter values based on maxLevel (for staff_rank field)
        let filteredValues = enumDef.values;
        if (field.maxLevel !== undefined && field.maxLevel !== null) {
            // Only show options with level <= maxLevel (ranks below viewer's rank)
            filteredValues = enumDef.values.filter(v => {
                // Always allow current value to be shown
                if (v.key === currentValue) return true;
                // Filter by level if defined
                return v.level !== undefined && v.level <= field.maxLevel;
            });
        }

        const options = filteredValues.map(v =>
            `<option value="${v.key}" ${v.key === currentValue ? 'selected' : ''}>${v.label}</option>`
        ).join('');

        return `<select class="player-view-data-input ${hasChange ? 'modified' : ''}"
            data-key="${field.key}"
            data-section="${section.key}">
            ${options}
        </select>`;
    },

    /**
     * Render actions tab
     */
    renderActionsTab() {
        const player = this.player;
        if (!player) return '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No player loaded</div>';

        const canBan = Auth.hasPermission(CONFIG.PERMISSIONS.TEMP_BAN);
        const canPermBan = Auth.hasPermission(CONFIG.PERMISSIONS.PERM_BAN);
        const canIpBan = Auth.hasPermission(CONFIG.PERMISSIONS.IP_BAN);
        const canMute = Auth.hasPermission(CONFIG.PERMISSIONS.MUTE_PLAYER);
        const canKick = Auth.hasPermission(CONFIG.PERMISSIONS.KICK_PLAYER);
        const canTimeout = Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_TIMEOUTS);
        const canUnban = Auth.hasPermission(CONFIG.PERMISSIONS.UNBAN);
        const canUnmute = Auth.hasPermission(CONFIG.PERMISSIONS.UNMUTE_PLAYER);

        const hasAnyAction = canBan || canPermBan || canIpBan || canMute || canKick || canTimeout;

        if (!hasAnyAction) {
            return '<div style="padding: 40px; text-align: center; color: var(--text-muted);">You do not have permission to perform actions on this player</div>';
        }

        // Set the player on Popup so performAction can use it
        const setupPopup = `Popup.currentPlayer = PlayerView.player;`;

        return `
            <div style="padding: var(--spacing-lg);">
                <h4 style="margin-bottom: var(--spacing-md); font-size: var(--text-base); color: var(--text-primary);">Quick Actions</h4>
                <div class="action-buttons">
                    ${canKick ? `
                    <button class="action-btn" onclick="${setupPopup} Popup.performAction('kick')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Kick Player
                    </button>
                    ` : ''}
                    ${canMute ? `
                    <button class="action-btn" onclick="${setupPopup} Popup.performAction('mute')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                            <line x1="23" y1="9" x2="17" y2="15"/>
                            <line x1="17" y1="9" x2="23" y2="15"/>
                        </svg>
                        Mute Player
                    </button>
                    ` : ''}
                    ${canTimeout ? `
                    <button class="action-btn" onclick="${setupPopup} Popup.performAction('timeout')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Timeout Player
                    </button>
                    ` : ''}
                    ${canBan ? `
                    <button class="action-btn danger" onclick="${setupPopup} Popup.performAction('ban')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        Ban Player
                    </button>
                    ` : ''}
                    ${canIpBan ? `
                    <button class="action-btn danger" onclick="${setupPopup} Popup.performAction('ipban')">
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
            </div>
        `;
    },

    /**
     * Render logs tab
     */
    renderLogsTab() {
        return `
            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                Player logs will appear here
            </div>
        `;
    },

    // === Notes & Tags ===

    /**
     * Load tags for a player
     */
    async loadTags(playerId) {
        try {
            const response = await API.tags.getForPlayer(playerId);
            if (response.success) {
                this.tags = response.tags || [];
                this.tagsLoaded = true;
                // Update tags bar in DOM
                const tagsBar = document.getElementById('playerViewTagsBar');
                if (tagsBar) {
                    tagsBar.innerHTML = this._renderTagsContent();
                }
            }
        } catch (error) {
            console.error('[PlayerView] Failed to load tags:', error);
        }
    },

    /**
     * Load notes for a player
     */
    async loadNotes(playerId) {
        try {
            const response = await API.notes.getForPlayer(playerId);
            if (response.success) {
                this.notes = response.notes || [];
                this.notesLoaded = true;
                // Update notes tab content in DOM
                const notesContent = document.getElementById('playerViewNotesContent');
                if (notesContent) {
                    notesContent.innerHTML = this._renderNotesContent();
                }
            }
        } catch (error) {
            console.error('[PlayerView] Failed to load notes:', error);
        }
    },

    /**
     * Render tags bar HTML for the player header
     */
    renderTagsBar() {
        if (!Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) return '';

        return `
            <div class="player-tags-bar" id="playerViewTagsBar">
                ${this._renderTagsContent()}
            </div>
        `;
    },

    _renderTagsContent() {
        const canTag = Auth.hasPermission(CONFIG.PERMISSIONS.TAG_PLAYERS);
        const tagsHtml = this.tags.map(tag => `
            <span class="player-tag-badge" data-tag-id="${tag.id}" title="Added by ${Utils.escapeHtml(tag.addedByUsername)} ${Utils.formatRelativeTime(tag.createdAt)}">
                ${Utils.escapeHtml(tag.tag)}
                ${canTag ? `<button class="player-tag-remove" onclick="PlayerView.removeTag(${tag.id}, event)">&times;</button>` : ''}
            </span>
        `).join('');

        const addBtn = canTag ? `
            <div class="player-tag-add-wrapper">
                <button class="player-tag-add-btn" onclick="PlayerView.toggleTagDropdown(event)" title="Add tag">+</button>
                <div class="player-tag-dropdown" id="playerViewTagDropdown">
                    ${this.PREDEFINED_TAGS
                        .filter(t => !this.tags.some(existing => existing.tag === t))
                        .map(t => `<div class="player-tag-dropdown-item" onclick="PlayerView.addTag('${Utils.escapeHtml(t)}')">${Utils.escapeHtml(t)}</div>`)
                        .join('')}
                    ${this.PREDEFINED_TAGS.filter(t => !this.tags.some(existing => existing.tag === t)).length === 0
                        ? '<div class="player-tag-dropdown-empty">All tags applied</div>' : ''}
                </div>
            </div>
        ` : '';

        if (this.tags.length === 0 && !canTag) return '';

        return tagsHtml + addBtn;
    },

    /**
     * Toggle tag dropdown visibility
     */
    toggleTagDropdown(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('playerViewTagDropdown');
        if (dropdown) {
            dropdown.classList.toggle('open');
            // Close on outside click
            const close = (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('open');
                    document.removeEventListener('click', close);
                }
            };
            setTimeout(() => document.addEventListener('click', close), 0);
        }
    },

    /**
     * Add a tag to the current player
     */
    async addTag(tag) {
        if (!this.player) return;

        // Close dropdown
        const dropdown = document.getElementById('playerViewTagDropdown');
        if (dropdown) dropdown.classList.remove('open');

        try {
            await API.tags.add(this.player.id, tag);
            Toast.success(`Tag "${tag}" added`);
            await this.loadTags(this.player.id);
        } catch (error) {
            Toast.error(error.message || 'Failed to add tag');
        }
    },

    /**
     * Remove a tag from the current player
     */
    async removeTag(tagId, event) {
        if (event) event.stopPropagation();
        if (!this.player) return;

        try {
            await API.tags.remove(tagId);
            Toast.success('Tag removed');
            await this.loadTags(this.player.id);
        } catch (error) {
            Toast.error(error.message || 'Failed to remove tag');
        }
    },

    /**
     * Render notes tab content
     */
    renderNotesTab() {
        if (!Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
            return '<div style="padding: 40px; text-align: center; color: var(--text-muted);">You do not have permission to view notes</div>';
        }

        return `
            <div class="player-notes-section" id="playerViewNotesContent">
                ${this.notesLoaded ? this._renderNotesContent() : `
                    <div style="display: flex; align-items: center; justify-content: center; padding: 40px;">
                        <div class="spinner spinner-lg"></div>
                    </div>
                `}
            </div>
        `;
    },

    _renderNotesContent() {
        const canAdd = Auth.hasPermission(CONFIG.PERMISSIONS.ADD_NOTE);
        const canDeleteOther = Auth.hasPermission(CONFIG.PERMISSIONS.DELETE_NOTE);

        const addForm = canAdd ? `
            <div class="player-note-add">
                <textarea id="playerViewNoteInput" class="player-note-textarea" placeholder="Write a note about this player..." maxlength="1000" rows="3"></textarea>
                <div class="player-note-add-footer">
                    <span class="player-note-charcount"><span id="playerViewNoteCharCount">0</span>/1000</span>
                    <button class="btn btn-primary btn-sm" id="playerViewNoteSubmitBtn" onclick="PlayerView.submitNote()" disabled>Add Note</button>
                </div>
            </div>
        ` : '';

        const notesHtml = this.notes.length === 0
            ? '<div class="player-notes-empty">No notes on this player yet</div>'
            : this.notes.map(note => {
                const canDelete = note.isOwnNote || canDeleteOther;
                return `
                    <div class="player-note-item ${note.isPinned ? 'pinned' : ''}" data-note-id="${note.id}">
                        <div class="player-note-header">
                            <div class="player-note-header-left">
                                ${note.isPinned ? '<svg class="player-note-pin-icon active" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="14" height="14"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>' : ''}
                                <span class="player-note-author">${Utils.escapeHtml(note.staffUsername)}</span>
                                <span class="player-note-time">${Utils.formatRelativeTime(note.createdAt)}</span>
                            </div>
                            <div class="player-note-actions">
                                ${canAdd ? `
                                <button class="player-note-action-btn" onclick="PlayerView.toggleNotePin(${note.id})" title="${note.isPinned ? 'Unpin' : 'Pin'}">
                                    <svg viewBox="0 0 24 24" fill="${note.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                                </button>
                                ` : ''}
                                ${canDelete ? `
                                <button class="player-note-action-btn danger" onclick="PlayerView.deleteNote(${note.id})" title="Delete note">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="player-note-text">${Utils.escapeHtml(note.noteText)}</div>
                    </div>
                `;
            }).join('');

        return addForm + notesHtml;
    },

    /**
     * Setup note input listeners (called after render when on notes tab)
     */
    _setupNoteInputListeners() {
        const input = document.getElementById('playerViewNoteInput');
        const charCount = document.getElementById('playerViewNoteCharCount');
        const submitBtn = document.getElementById('playerViewNoteSubmitBtn');

        if (input && charCount && submitBtn) {
            input.addEventListener('input', () => {
                const len = input.value.length;
                charCount.textContent = len;
                submitBtn.disabled = len === 0 || len > 1000;
            });
        }
    },

    /**
     * Submit a new note
     */
    async submitNote() {
        if (!this.player) return;
        const input = document.getElementById('playerViewNoteInput');
        const submitBtn = document.getElementById('playerViewNoteSubmitBtn');
        if (!input) return;

        const noteText = input.value.trim();
        if (!noteText || noteText.length > 1000) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
            await API.notes.create(this.player.id, noteText);
            Toast.success('Note added');
            input.value = '';
            document.getElementById('playerViewNoteCharCount').textContent = '0';
            await this.loadNotes(this.player.id);
        } catch (error) {
            Toast.error(error.message || 'Failed to add note');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Note';
        }
    },

    /**
     * Toggle pin on a note
     */
    async toggleNotePin(noteId) {
        try {
            const result = await API.notes.togglePin(noteId);
            Toast.success(result.isPinned ? 'Note pinned' : 'Note unpinned');
            await this.loadNotes(this.player.id);
        } catch (error) {
            Toast.error(error.message || 'Failed to toggle pin');
        }
    },

    /**
     * Delete a note
     */
    async deleteNote(noteId) {
        try {
            await API.notes.delete(noteId);
            Toast.success('Note deleted');
            await this.loadNotes(this.player.id);
        } catch (error) {
            Toast.error(error.message || 'Failed to delete note');
        }
    },

    /**
     * Render reason modal
     */
    renderReasonModal() {
        return `
            <div class="player-view-modal-overlay" id="playerViewReasonModal">
                <div class="player-view-modal">
                    <div class="player-view-modal-header">
                        <div class="player-view-modal-title">Confirm Changes</div>
                        <div class="player-view-modal-subtitle">Review and provide a reason for these changes</div>
                    </div>
                    <div class="player-view-modal-body">
                        <div class="player-view-modal-changes-list" id="playerViewChangesList"></div>
                        <label class="player-view-modal-field-label">Reason for changes (required, min 10 characters)</label>
                        <textarea class="player-view-modal-textarea" id="playerViewChangeReason" placeholder="e.g., Compensation for bug #1234, Rank adjustment per support ticket, etc."></textarea>
                    </div>
                    <div class="player-view-modal-footer">
                        <button class="btn btn-secondary" onclick="PlayerView.closeReasonModal()">Cancel</button>
                        <button class="btn btn-primary" id="reasonModalSaveBtn" onclick="PlayerView.confirmSave()">Confirm & Save</button>
                    </div>
                </div>
            </div>
        `;
    },

    // === Event Handlers ===

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        this.editMode = !this.editMode;
        document.body.classList.toggle('player-view-edit-mode', this.editMode);

        if (this.elements.editToggle) {
            this.elements.editToggle.classList.toggle('active', this.editMode);
        }

        if (this.editMode && this.player) {
            // Register draft with SessionManager
            const playerId = this.player.id;
            SessionManager.registerDraft('player_edit_' + playerId, () => {
                return this.pendingChanges.size > 0 ? Object.fromEntries(this.pendingChanges) : null;
            });
        }

        // If turning off edit mode, clear pending changes and draft
        if (!this.editMode) {
            if (this.player) {
                SessionManager.clearDraft('player_edit_' + this.player.id);
            }
            this.pendingChanges.clear();
            this.render(); // Re-render to reset all inputs
        }
    },

    /**
     * Toggle section collapse
     */
    toggleSection(headerEl) {
        headerEl.closest('.player-view-section').classList.toggle('collapsed');
    },

    /**
     * Switch tab
     */
    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.player-view-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.player-view-tab-content').forEach(c => {
            c.classList.toggle('active', c.id === `playerView${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
        });

        // Lazy-load notes when tab is first opened
        if (tab === 'notes' && !this.notesLoaded && this.player) {
            this.loadNotes(this.player.id).then(() => this._setupNoteInputListeners());
        } else if (tab === 'notes') {
            this._setupNoteInputListeners();
        }
    },

    /**
     * Toggle world dropdown
     */
    toggleWorldDropdown() {
        if (this.elements.worldDropdown) {
            this.elements.worldDropdown.classList.toggle('open');
        }
    },

    /**
     * Select world type
     */
    selectWorld(worldType) {
        this.currentWorldType = worldType;
        if (this.elements.worldDropdown) {
            this.elements.worldDropdown.classList.remove('open');
        }
        // Re-render to show correct profile section
        this.render();
    },

    /**
     * Handle field input change
     */
    handleFieldChange(input) {
        if (!this.editMode) return;

        const key = input.dataset.key;
        const sectionKey = input.dataset.section;
        const row = input.closest('.player-view-data-row');
        const originalValue = row.dataset.original;

        // Handle different input types
        let currentValue;
        if (input.dataset.inputType === 'currency') {
            // Convert dollars to cents
            currentValue = Math.round(parseFloat(input.value || 0) * 100);
        } else if (input.type === 'number') {
            currentValue = Number(input.value);
        } else {
            currentValue = input.value;
        }

        const section = this.sections.find(s => s.key === sectionKey);
        const field = this.findField(section, key);
        if (!field) return;

        const changeKey = this.getChangeKey(section, field);

        if (String(currentValue) !== String(originalValue)) {
            this.pendingChanges.set(changeKey, {
                scope: section.scope,
                worldType: section.worldType,
                key: key,
                label: field.label,
                oldValue: originalValue,
                newValue: currentValue
            });
            row.classList.add('modified');
            input.classList.add('modified');
        } else {
            this.pendingChanges.delete(changeKey);
            row.classList.remove('modified');
            input.classList.remove('modified');
        }

        this.updateSectionChangeBadge(sectionKey);
    },

    /**
     * Handle boolean toggle
     */
    toggleBoolean(toggle) {
        if (!this.editMode) return;

        toggle.classList.toggle('active');

        const key = toggle.dataset.key;
        const sectionKey = toggle.dataset.section;
        const row = toggle.closest('.player-view-data-row');
        const originalValue = row.dataset.original === 'true';
        const currentValue = toggle.classList.contains('active');

        const section = this.sections.find(s => s.key === sectionKey);
        const field = this.findField(section, key);
        if (!field) return;

        const changeKey = this.getChangeKey(section, field);

        if (currentValue !== originalValue) {
            this.pendingChanges.set(changeKey, {
                scope: section.scope,
                worldType: section.worldType,
                key: key,
                label: field.label,
                oldValue: originalValue,
                newValue: currentValue
            });
            row.classList.add('modified');
        } else {
            this.pendingChanges.delete(changeKey);
            row.classList.remove('modified');
        }

        this.updateSectionChangeBadge(sectionKey);
    },

    /**
     * Cancel changes for a section
     */
    cancelSectionChanges(sectionKey) {
        // Remove changes for this section
        for (const [key, change] of this.pendingChanges.entries()) {
            if (key.startsWith(sectionKey + ':')) {
                this.pendingChanges.delete(key);
            }
        }

        // Re-render the section to reset inputs
        this.render();
    },

    /**
     * Save changes for a section
     */
    saveSectionChanges(sectionKey) {
        // Gather changes for this section
        const changes = [];
        for (const [key, change] of this.pendingChanges.entries()) {
            if (key.startsWith(sectionKey + ':')) {
                changes.push(change);
            }
        }

        if (changes.length === 0) {
            Toast.warning('No changes to save');
            return;
        }

        this.showReasonModal(changes, sectionKey);
    },

    /**
     * Show reason modal with changes list
     */
    showReasonModal(changes, sectionKey) {
        this.pendingSaveSection = sectionKey;
        this.pendingSaveChanges = changes;

        // Build changes list HTML
        const changesHtml = changes.map(change => `
            <div class="player-view-modal-change-item">
                <span class="player-view-modal-change-field">${change.label}</span>
                <span class="player-view-modal-change-values">
                    <span class="player-view-modal-change-old">${this.formatValue(change.oldValue)}</span>
                    <span class="player-view-modal-change-arrow">→</span>
                    <span class="player-view-modal-change-new">${this.formatValue(change.newValue)}</span>
                </span>
            </div>
        `).join('');

        if (this.elements.changesList) {
            this.elements.changesList.innerHTML = changesHtml;
        }
        if (this.elements.reasonTextarea) {
            this.elements.reasonTextarea.value = '';
        }
        if (this.elements.reasonModal) {
            this.elements.reasonModal.classList.add('active');
        }
    },

    /**
     * Close reason modal
     */
    closeReasonModal() {
        if (this.elements.reasonModal) {
            this.elements.reasonModal.classList.remove('active');
        }
        this.pendingSaveSection = null;
        this.pendingSaveChanges = null;
    },

    /**
     * Confirm and execute save
     */
    async confirmSave() {
        console.log('[PlayerView] confirmSave() called');

        // Prevent duplicate submissions
        if (this.isSaving) {
            console.log('[PlayerView] Save already in progress, ignoring');
            return;
        }

        // Get reason from textarea - try both cached element and direct lookup
        let reason = this.elements.reasonTextarea?.value?.trim();
        if (!reason) {
            const textarea = document.getElementById('playerViewChangeReason');
            reason = textarea?.value?.trim();
            console.log('[PlayerView] Fallback textarea lookup, reason:', reason);
        }

        console.log('[PlayerView] Reason:', reason, 'Length:', reason?.length);
        console.log('[PlayerView] Pending changes:', this.pendingSaveChanges);

        if (!reason || reason.length < 10) {
            console.log('[PlayerView] Reason too short, showing error toast');
            Toast.error('Please provide a reason of at least 10 characters');
            return;
        }

        if (!this.pendingSaveChanges || this.pendingSaveChanges.length === 0) {
            this.closeReasonModal();
            return;
        }

        // Set saving state and update UI
        console.log('[PlayerView] Setting saving state...');
        this.isSaving = true;
        const saveBtn = document.getElementById('reasonModalSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-small"></span> Saving...';
        }

        // Build changes array for API
        console.log('[PlayerView] Building changes array...');
        const changes = this.pendingSaveChanges.map(change => {
            // Strip table prefix from key (e.g., "accounts.donator_rank" -> "donator_rank")
            let key = change.key;
            if (key.includes('.')) {
                key = key.split('.').pop();
            }
            return {
                scope: change.scope,
                worldType: change.worldType,
                key: key,
                oldValue: String(change.oldValue ?? ''),
                newValue: String(change.newValue ?? '')
            };
        });
        console.log('[PlayerView] Changes to send:', JSON.stringify(changes, null, 2));

        try {
            console.log('[PlayerView] Making API request to /players/' + this.player.id);
            const response = await API.request(`/players/${this.player.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ changes, reason })
            });
            console.log('[PlayerView] API response:', response);

            if (response.success) {
                console.log('[PlayerView] Save successful!');

                // Build summary of what was changed
                const changeCount = this.pendingSaveChanges.length;
                const changedFields = this.pendingSaveChanges.map(c => c.label).join(', ');
                Toast.success(`Saved ${changeCount} change(s): ${changedFields}`);

                // Clear pending changes for saved section
                for (const change of this.pendingSaveChanges) {
                    const changeKey = `${this.pendingSaveSection}:${change.key}`;
                    this.pendingChanges.delete(changeKey);
                }

                this.closeReasonModal();

                // Reload player data to get fresh values
                await this.open(this.player.id);
            } else {
                console.log('[PlayerView] Save failed with response:', response);
                // Show specific error messages if available
                if (response.errors && response.errors.length > 0) {
                    const errorMsgs = response.errors.map(e => `${e.key}: ${e.error}`).join(', ');
                    Toast.error(`Save failed: ${errorMsgs}`);
                    console.error('[PlayerView] Save errors:', response.errors);
                } else {
                    Toast.error(response.message || 'Failed to save changes');
                }
            }
        } catch (error) {
            console.error('[PlayerView] Save error (exception):', error);
            Toast.error(`Error: ${error.message || 'Failed to save changes'}`);
        } finally {
            // Always reset saving state
            this.isSaving = false;
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = 'Confirm & Save';
            }
        }
    },

    /**
     * Close player view and return to players list
     */
    close() {
        const container = document.getElementById('player-view-container');

        // Hide player view container
        container.classList.add('hidden');

        // Reset inline styles that were applied
        container.style.cssText = '';

        // Show players list
        document.getElementById('page-players').classList.remove('hidden');

        // Clear draft registration
        if (this.player) {
            SessionManager.clearDraft('player_edit_' + this.player.id);
        }

        // Reset edit mode
        this.editMode = false;
        document.body.classList.remove('player-view-edit-mode');

        // Clear state
        this.player = null;
        this.header = null;
        this.sections = [];
        this.pendingChanges.clear();
        this.notes = [];
        this.tags = [];
        this.notesLoaded = false;
        this.tagsLoaded = false;
    },

    // === Helper Methods ===

    /**
     * Check if user can edit a field based on permissions
     */
    canEditField(field) {
        if (!field.permission) return true;
        return this.permissions.includes(field.permission);
    },

    /**
     * Find a field in a section (handles groups)
     */
    findField(section, key) {
        if (!section) return null;

        if (section.fields) {
            const field = section.fields.find(f => f.key === key);
            if (field) return field;
        }

        if (section.groups) {
            for (const group of section.groups) {
                const field = group.fields.find(f => f.key === key);
                if (field) return field;
            }
        }

        return null;
    },

    /**
     * Get unique change key for a field
     */
    getChangeKey(section, field) {
        return `${section.key}:${field.key}`;
    },

    /**
     * Get number of pending changes for a section
     */
    getSectionChangeCount(sectionKey) {
        let count = 0;
        for (const key of this.pendingChanges.keys()) {
            if (key.startsWith(sectionKey + ':')) count++;
        }
        return count;
    },

    /**
     * Update section change badge
     */
    updateSectionChangeBadge(sectionKey) {
        const section = document.querySelector(`[data-section="${sectionKey}"]`);
        if (!section) return;

        const count = this.getSectionChangeCount(sectionKey);
        const badge = section.querySelector('.player-view-section-changes-badge');
        if (badge) {
            badge.textContent = `${count} change${count !== 1 ? 's' : ''}`;
        }
        section.classList.toggle('has-changes', count > 0);
    },

    /**
     * Format a value for display
     */
    formatValue(value) {
        if (value === true) return 'Yes';
        if (value === false) return 'No';
        if (value === null || value === undefined) return '—';
        if (typeof value === 'number') return value.toLocaleString();
        return String(value);
    },

    /**
     * Escape attribute value
     */
    escapeAttr(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerView;
}
