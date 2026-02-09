/* ============================================================
   ELDEROS STAFF PANEL - PLAYER VIEW MODULE
   Two-column layout with field sections (left) and panels (right)
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
    isSaving: false,
    pendingChanges: new Map(),
    currentWorldType: 'ECONOMY',

    // Tags state (shown in header)
    tags: [],
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

        // Ashpire account protection
        if (typeof CONFIG !== 'undefined' && String(playerId) === String(CONFIG.ASHPIRE_ACCOUNT_ID) && !Auth.isAshpire()) {
            Toast.error('You do not have permission to view this account');
            return;
        }

        console.log('[PlayerView] Opening player:', playerId);

        const playersPage = document.getElementById('page-players');
        const container = document.getElementById('player-view-container');

        if (!container) {
            console.error('[PlayerView] CRITICAL: player-view-container not found in DOM!');
            Toast.error('Player view container not found');
            return;
        }

        // Show player view container, hide players list
        playersPage?.classList.add('hidden');
        container.classList.remove('hidden');

        // Show loading state
        this.renderLoading();

        try {
            const response = await API.get(`/players/${playerId}`);

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
            this.tags = [];
            this.tagsLoaded = false;
            document.body.classList.remove('player-view-edit-mode');

            // Reset panels state
            PlayerViewPanels.reset();

            // Load tags immediately (shown in header)
            if (Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
                this.loadTags(this.player.id);
            }

            // Render the full view
            this.render();

            // Load notes in the right column
            if (Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
                PlayerViewPanels.loadNotes(this.player.id);
            }

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
     * Render the complete player view (two-column layout)
     */
    render() {
        const container = document.getElementById('player-view-container');
        if (!container) return;

        try {
            const topBar = this.renderTopBar();
            const editBanner = this.renderEditModeBanner();
            const header = this.renderPlayerHeader();
            const leftColumn = this.renderFieldSections();
            const rightColumn = this.renderRightColumn();
            const reasonModal = this.renderReasonModal();

            container.innerHTML = `
                <div class="player-view-container">
                    ${topBar}
                    ${editBanner}
                    ${header}
                    <div class="player-view-body">
                        <div class="player-view-left">
                            ${leftColumn}
                        </div>
                        <div class="player-view-right">
                            ${rightColumn}
                        </div>
                    </div>
                </div>
                ${reasonModal}
            `;
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

        // Setup panel listeners
        PlayerViewPanels.setupListeners();
    },

    /**
     * Render the right column (panels)
     */
    renderRightColumn() {
        const actions = PlayerViewPanels.renderQuickActions(this.player, this.permissions);
        const notes = PlayerViewPanels.renderNotes(this.player);
        const activity = PlayerViewPanels.renderActivityLog(this.player);
        return actions + notes + activity;
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
            { key: 'ECONOMY', label: 'Economy', icon: '\uD83D\uDCB0', class: 'economy' },
            { key: 'PVP', label: 'PvP', icon: '\u2694\uFE0F', class: 'pvp' },
            { key: 'LEAGUES', label: 'Leagues', icon: '\uD83C\uDFC6', class: 'leagues' },
            { key: 'CUSTOMS', label: 'Customs', icon: '\uD83C\uDFAE', class: 'customs' }
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
     * Render badges from header
     */
    renderBadges() {
        if (!this.header || !this.header.badges) return '';

        return this.header.badges.map(badge => {
            const enumDef = this.enums[badge.type];
            const enumValue = enumDef?.values?.find(v => v.key === badge.value);
            const badgeClass = enumValue?.badgeClass || badge.value.toLowerCase();
            const label = enumValue?.label || badge.value;

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

    // === Tags ===

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

    async loadTags(playerId) {
        try {
            const response = await API.tags.getForPlayer(playerId);
            if (response.success) {
                this.tags = response.tags || [];
                this.tagsLoaded = true;
                const tagsBar = document.getElementById('playerViewTagsBar');
                if (tagsBar) {
                    tagsBar.innerHTML = this._renderTagsContent();
                }
            }
        } catch (error) {
            console.error('[PlayerView] Failed to load tags:', error);
        }
    },

    toggleTagDropdown(event) {
        event.stopPropagation();
        const dropdown = document.getElementById('playerViewTagDropdown');
        if (dropdown) {
            dropdown.classList.toggle('open');
            const close = (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('open');
                    document.removeEventListener('click', close);
                }
            };
            setTimeout(() => document.addEventListener('click', close), 0);
        }
    },

    async addTag(tag) {
        if (!this.player) return;
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

    // === Field Sections (Left Column) ===

    /**
     * Render all field sections for the left column
     */
    renderFieldSections() {
        if (!this.sections || this.sections.length === 0) {
            return '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No data available</div>';
        }

        return this.sections
            .filter(section => this.shouldShowSection(section))
            .map(section => this.renderSection(section))
            .join('');
    },

    shouldShowSection(section) {
        if (section.scope === 'account') return true;
        if (section.worldType) {
            return section.worldType === this.currentWorldType;
        }
        return true;
    },

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

    renderSectionContent(section) {
        if (section.groups) {
            return section.groups.map(group => `
                <div class="player-view-data-group-header">${group.header}</div>
                ${group.fields.map(field => this.renderField(field, section)).join('')}
            `).join('');
        }

        if (section.fields) {
            return section.fields.map(field => this.renderField(field, section)).join('');
        }

        return '';
    },

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

    renderFieldValue(field) {
        let valueClass = 'player-view-data-value';
        if (field.type === 'mono') valueClass += ' mono';
        if (field.type && field.type !== 'mono' && field.type !== 'badge') {
            valueClass += ' ' + field.type;
        }
        if (field.color) valueClass += ' ' + field.color;

        if (field.type === 'badge' && field.badgeClass) {
            return `<span class="${valueClass}"><span class="player-view-badge player-view-badge-${field.badgeClass}">${field.displayValue}</span></span>`;
        }

        return `<span class="${valueClass}">${field.displayValue || field.value || '\u2014'}</span>`;
    },

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

    renderEnumSelect(field, section, currentValue, hasChange) {
        const enumDef = this.enums[field.enumType];
        if (!enumDef || !enumDef.values) {
            return `<select class="player-view-data-input" disabled><option>Error loading options</option></select>`;
        }

        let filteredValues = enumDef.values;
        if (field.maxLevel !== undefined && field.maxLevel !== null) {
            filteredValues = enumDef.values.filter(v => {
                if (v.key === currentValue) return true;
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

    // === Reason Modal ===

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

    toggleEditMode() {
        this.editMode = !this.editMode;
        document.body.classList.toggle('player-view-edit-mode', this.editMode);

        if (this.elements.editToggle) {
            this.elements.editToggle.classList.toggle('active', this.editMode);
        }

        if (this.editMode && this.player) {
            const playerId = this.player.id;
            SessionManager.registerDraft('player_edit_' + playerId, () => {
                return this.pendingChanges.size > 0 ? Object.fromEntries(this.pendingChanges) : null;
            });
        }

        if (!this.editMode) {
            if (this.player) {
                SessionManager.clearDraft('player_edit_' + this.player.id);
            }
            this.pendingChanges.clear();
            this.render();
            // Re-setup panel listeners after re-render
            PlayerViewPanels.setupListeners();
            // Reload notes since render resets DOM
            if (this.player && Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
                PlayerViewPanels.loadNotes(this.player.id);
            }
        }
    },

    toggleSection(headerEl) {
        headerEl.closest('.player-view-section').classList.toggle('collapsed');
    },

    toggleWorldDropdown() {
        if (this.elements.worldDropdown) {
            this.elements.worldDropdown.classList.toggle('open');
        }
    },

    selectWorld(worldType) {
        this.currentWorldType = worldType;
        if (this.elements.worldDropdown) {
            this.elements.worldDropdown.classList.remove('open');
        }
        this.render();
        // Re-setup after re-render
        PlayerViewPanels.setupListeners();
        if (this.player && Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
            PlayerViewPanels.loadNotes(this.player.id);
        }
    },

    handleFieldChange(input) {
        if (!this.editMode) return;

        const key = input.dataset.key;
        const sectionKey = input.dataset.section;
        const row = input.closest('.player-view-data-row');
        const originalValue = row.dataset.original;

        let currentValue;
        if (input.dataset.inputType === 'currency') {
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

    cancelSectionChanges(sectionKey) {
        for (const [key] of this.pendingChanges.entries()) {
            if (key.startsWith(sectionKey + ':')) {
                this.pendingChanges.delete(key);
            }
        }
        this.render();
        PlayerViewPanels.setupListeners();
        if (this.player && Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
            PlayerViewPanels.loadNotes(this.player.id);
        }
    },

    saveSectionChanges(sectionKey) {
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

    showReasonModal(changes, sectionKey) {
        this.pendingSaveSection = sectionKey;
        this.pendingSaveChanges = changes;

        const changesHtml = changes.map(change => `
            <div class="player-view-modal-change-item">
                <span class="player-view-modal-change-field">${change.label}</span>
                <span class="player-view-modal-change-values">
                    <span class="player-view-modal-change-old">${this.formatValue(change.oldValue)}</span>
                    <span class="player-view-modal-change-arrow">\u2192</span>
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

    closeReasonModal() {
        if (this.elements.reasonModal) {
            this.elements.reasonModal.classList.remove('active');
        }
        this.pendingSaveSection = null;
        this.pendingSaveChanges = null;
    },

    async confirmSave() {
        if (this.isSaving) return;

        let reason = this.elements.reasonTextarea?.value?.trim();
        if (!reason) {
            const textarea = document.getElementById('playerViewChangeReason');
            reason = textarea?.value?.trim();
        }

        if (!reason || reason.length < 10) {
            Toast.error('Please provide a reason of at least 10 characters');
            return;
        }

        if (!this.pendingSaveChanges || this.pendingSaveChanges.length === 0) {
            this.closeReasonModal();
            return;
        }

        this.isSaving = true;
        const saveBtn = document.getElementById('reasonModalSaveBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-small"></span> Saving...';
        }

        const changes = this.pendingSaveChanges.map(change => {
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

        try {
            const response = await API.request(`/players/${this.player.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ changes, reason })
            });

            if (response.success) {
                const changeCount = this.pendingSaveChanges.length;
                const changedFields = this.pendingSaveChanges.map(c => c.label).join(', ');
                Toast.success(`Saved ${changeCount} change(s): ${changedFields}`);

                for (const change of this.pendingSaveChanges) {
                    const changeKey = `${this.pendingSaveSection}:${change.key}`;
                    this.pendingChanges.delete(changeKey);
                }

                this.closeReasonModal();
                await this.open(this.player.id);
            } else {
                if (response.errors && response.errors.length > 0) {
                    const errorMsgs = response.errors.map(e => `${e.key}: ${e.error}`).join(', ');
                    Toast.error(`Save failed: ${errorMsgs}`);
                } else {
                    Toast.error(response.message || 'Failed to save changes');
                }
            }
        } catch (error) {
            console.error('[PlayerView] Save error:', error);
            Toast.error(`Error: ${error.message || 'Failed to save changes'}`);
        } finally {
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

        container.classList.add('hidden');
        container.style.cssText = '';

        document.getElementById('page-players').classList.remove('hidden');

        if (this.player) {
            SessionManager.clearDraft('player_edit_' + this.player.id);
        }

        this.editMode = false;
        document.body.classList.remove('player-view-edit-mode');

        this.player = null;
        this.header = null;
        this.sections = [];
        this.pendingChanges.clear();
        this.tags = [];
        this.tagsLoaded = false;

        // Reset panels
        PlayerViewPanels.reset();
    },

    // === Helper Methods ===

    canEditField(field) {
        if (!field.permission) return true;
        return this.permissions.includes(field.permission);
    },

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

    getChangeKey(section, field) {
        return `${section.key}:${field.key}`;
    },

    getSectionChangeCount(sectionKey) {
        let count = 0;
        for (const key of this.pendingChanges.keys()) {
            if (key.startsWith(sectionKey + ':')) count++;
        }
        return count;
    },

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

    formatValue(value) {
        if (value === true) return 'Yes';
        if (value === false) return 'No';
        if (value === null || value === undefined) return '\u2014';
        if (typeof value === 'number') return value.toLocaleString();
        return String(value);
    },

    escapeAttr(value) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerView;
}
