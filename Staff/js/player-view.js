/* ============================================================
   ELDEROS STAFF PANEL - PLAYER VIEW MODULE
   Two-column layout with field sections (left) and panels (right)
   Per-field inline saves with instant feedback
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
    currentWorldType: 'ECONOMY',

    // Track fields currently saving (to prevent double-saves)
    savingFields: new Set(),

    // Tags state (shown in header)
    tags: [],
    tagsLoaded: false,

    // Predefined tags
    PREDEFINED_TAGS: [
        'RWT Suspect', 'Known Botter', 'Alt Account', 'VIP',
        'Content Creator', 'Bug Abuser', 'Trusted Trader', 'Restricted'
    ],

    // Sensitive fields that require a reason (both prefixed and unprefixed forms)
    SENSITIVE_FIELDS: new Set([
        'staff_rank', 'donator_rank', 'total_spent', 'eldercoin_balance', 'username',
        'accounts.staff_rank', 'accounts.donator_rank', 'accounts.total_spent', 'accounts.eldercoin_balance', 'accounts.username'
    ]),

    // Hidden derived fields (replaced by punishment panel)
    HIDDEN_FIELDS: new Set(['is_banned', 'is_muted', 'accounts.is_banned', 'accounts.is_muted']),

    // Hidden sections (replaced by right column panels)
    HIDDEN_SECTIONS: new Set(['punishments']),

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
            this.savingFields.clear();
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

            // Load punishments in the right column
            PlayerViewPanels.loadPunishments(this.player.id);

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
        const punishments = PlayerViewPanels.renderPunishments(this.player);
        const notes = PlayerViewPanels.renderNotes(this.player);
        const activity = PlayerViewPanels.renderActivityLog(this.player);
        return actions + punishments + notes + activity;
    },

    /**
     * Cache DOM elements after render
     */
    cacheElements() {
        this.elements = {
            editToggle: document.getElementById('playerViewEditToggle'),
            worldDropdown: document.getElementById('playerViewWorldDropdown')
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

        // Setup per-field save listeners on inputs
        document.querySelectorAll('.player-view-data-input').forEach(input => {
            // Track changes visually
            input.addEventListener('input', () => this.handleFieldChange(input));

            // Save on blur
            input.addEventListener('blur', () => this.saveField(input));

            // Save on Enter
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur(); // triggers blur -> saveField
                }
            });
        });

        // Select elements save on change
        document.querySelectorAll('select.player-view-data-input').forEach(select => {
            select.addEventListener('change', () => this.saveField(select));
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
                Edit mode active — fields save individually on blur or Enter
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
        const statusText = this.player.status === 'ONLINE'
            ? `Online`
            : this.player.status === 'BANNED' ? 'Banned' : 'Offline';

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
            .filter(section => !this.HIDDEN_SECTIONS.has(section.key))
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
        return `
            <div class="player-view-section" data-section="${section.key}">
                <div class="player-view-section-header" onclick="PlayerView.toggleSection(this)">
                    <div class="player-view-section-header-left">
                        <div class="player-view-section-icon ${section.color}">${section.icon}</div>
                        <div class="player-view-section-title-block">
                            <div class="player-view-section-title">${section.title}</div>
                            ${section.subtitle ? `<div class="player-view-section-subtitle">${section.subtitle}</div>` : ''}
                        </div>
                    </div>
                    <div class="player-view-section-header-right">
                        <div class="player-view-section-toggle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </div>
                </div>
                <div class="player-view-section-content">
                    ${this.renderSectionContent(section)}
                </div>
            </div>
        `;
    },

    renderSectionContent(section) {
        if (section.groups) {
            return section.groups.map(group => `
                <div class="player-view-data-group-header">${group.header}</div>
                ${group.fields
                    .filter(field => !this.HIDDEN_FIELDS.has(field.key))
                    .map(field => this.renderField(field, section)).join('')}
            `).join('');
        }

        if (section.fields) {
            return section.fields
                .filter(field => !this.HIDDEN_FIELDS.has(field.key))
                .map(field => this.renderField(field, section)).join('');
        }

        return '';
    },

    renderField(field, section) {
        const isEditable = field.editable && this.canEditField(field);
        const rowClass = isEditable ? '' : 'readonly';

        return `
            <div class="player-view-data-row ${rowClass}"
                 data-key="${field.key}"
                 data-section="${section.key}"
                 data-scope="${section.scope}"
                 data-world-type="${section.worldType || ''}"
                 data-original="${this.escapeAttr(field.value)}"
                 data-sensitive="${this.SENSITIVE_FIELDS.has(field.key) ? 'true' : 'false'}">
                <span class="player-view-data-label">
                    ${!isEditable ? `<svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` : ''}
                    ${field.label}
                </span>
                <div class="player-view-data-right">
                    ${this.renderFieldValue(field)}
                    ${isEditable ? this.renderFieldInput(field, section) : ''}
                    <div class="player-view-field-feedback" data-feedback-for="${field.key}"></div>
                </div>
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
        switch (field.inputType) {
            case 'text':
                return `<input type="text"
                    class="player-view-data-input"
                    value="${this.escapeAttr(field.value)}"
                    data-key="${field.key}"
                    data-section="${section.key}"
                    ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                    ${field.pattern ? `pattern="${field.pattern}"` : ''}>`;

            case 'number':
                return `<input type="number"
                    class="player-view-data-input mono"
                    value="${field.value}"
                    data-key="${field.key}"
                    data-section="${section.key}"
                    ${field.min !== undefined ? `min="${field.min}"` : ''}
                    ${field.max !== undefined ? `max="${field.max}"` : ''}>`;

            case 'currency':
                const dollarsValue = (field.value / 100).toFixed(2);
                return `<input type="number"
                    class="player-view-data-input mono"
                    value="${dollarsValue}"
                    data-key="${field.key}"
                    data-section="${section.key}"
                    data-input-type="currency"
                    min="0"
                    step="0.01">`;

            case 'boolean':
                const isActive = field.value === true || field.value === 'true';
                return `<div class="player-view-data-toggle-wrapper">
                    <div class="player-view-data-toggle ${isActive ? 'active' : ''}"
                        data-key="${field.key}"
                        data-section="${section.key}"
                        onclick="PlayerView.toggleBoolean(this)"></div>
                </div>`;

            case 'enum':
                return this.renderEnumSelect(field, section);

            default:
                return '';
        }
    },

    renderEnumSelect(field, section) {
        const enumDef = this.enums[field.enumType];
        if (!enumDef || !enumDef.values) {
            return `<select class="player-view-data-input" disabled><option>Error loading options</option></select>`;
        }

        let filteredValues = enumDef.values;
        if (field.maxLevel !== undefined && field.maxLevel !== null) {
            filteredValues = enumDef.values.filter(v => {
                if (v.key === field.value) return true;
                return v.level !== undefined && v.level <= field.maxLevel;
            });
        }

        const options = filteredValues.map(v =>
            `<option value="${v.key}" ${v.key === String(field.value) ? 'selected' : ''}>${v.label}</option>`
        ).join('');

        return `<select class="player-view-data-input"
            data-key="${field.key}"
            data-section="${section.key}">
            ${options}
        </select>`;
    },

    // === Event Handlers ===

    toggleEditMode() {
        this.editMode = !this.editMode;
        document.body.classList.toggle('player-view-edit-mode', this.editMode);

        if (this.elements.editToggle) {
            this.elements.editToggle.classList.toggle('active', this.editMode);
        }

        if (!this.editMode) {
            // Remove any inline reason inputs
            document.querySelectorAll('.player-view-inline-reason').forEach(el => el.remove());
            // Re-render to reset field values
            this.render();
            PlayerViewPanels.setupListeners();
            if (this.player && Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
                PlayerViewPanels.loadNotes(this.player.id);
            }
            PlayerViewPanels.loadPunishments(this.player?.id);
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
        PlayerViewPanels.setupListeners();
        if (this.player && Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) {
            PlayerViewPanels.loadNotes(this.player.id);
        }
        PlayerViewPanels.loadPunishments(this.player?.id);
    },

    /**
     * Handle input change - mark field as modified visually
     */
    handleFieldChange(input) {
        if (!this.editMode) return;

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

        if (String(currentValue) !== String(originalValue)) {
            row.classList.add('modified');
            input.classList.add('modified');
        } else {
            row.classList.remove('modified');
            input.classList.remove('modified');
        }
    },

    /**
     * Toggle boolean and auto-save
     */
    toggleBoolean(toggle) {
        if (!this.editMode) return;

        toggle.classList.toggle('active');

        const key = toggle.dataset.key;
        const sectionKey = toggle.dataset.section;
        const row = toggle.closest('.player-view-data-row');
        const originalValue = row.dataset.original === 'true';
        const currentValue = toggle.classList.contains('active');

        if (currentValue !== originalValue) {
            row.classList.add('modified');
            // Auto-save boolean changes
            this._doFieldSave(row, key, sectionKey, String(currentValue));
        } else {
            row.classList.remove('modified');
        }
    },

    /**
     * Save field on blur/Enter — the core per-field save flow
     */
    saveField(input) {
        if (!this.editMode) return;

        const key = input.dataset.key;
        const sectionKey = input.dataset.section;
        const row = input.closest('.player-view-data-row');
        const originalValue = row.dataset.original;

        // Get current value
        let currentValue;
        if (input.dataset.inputType === 'currency') {
            currentValue = String(Math.round(parseFloat(input.value || 0) * 100));
        } else if (input.type === 'number') {
            currentValue = String(Number(input.value));
        } else {
            currentValue = input.value;
        }

        // No change - skip
        if (currentValue === String(originalValue)) {
            row.classList.remove('modified');
            input.classList.remove('modified');
            return;
        }

        // Check if sensitive field needs reason
        if (row.dataset.sensitive === 'true') {
            this._showInlineReason(row, key, sectionKey, currentValue);
            return;
        }

        // Non-sensitive: save immediately
        this._doFieldSave(row, key, sectionKey, currentValue);
    },

    /**
     * Show inline reason input below the field row
     */
    _showInlineReason(row, key, sectionKey, newValue) {
        // Remove any existing inline reason for this field
        const existing = row.querySelector('.player-view-inline-reason');
        if (existing) return; // Already showing

        const reasonHtml = `
            <div class="player-view-inline-reason">
                <input type="text" class="player-view-inline-reason-input"
                    placeholder="Reason for change (min 5 chars)..."
                    data-key="${key}"
                    data-section="${sectionKey}"
                    data-new-value="${this.escapeAttr(newValue)}">
                <div class="player-view-inline-reason-actions">
                    <button class="btn btn-sm btn-secondary" onclick="PlayerView._cancelInlineReason(this)">Cancel</button>
                    <button class="btn btn-sm btn-primary" onclick="PlayerView._submitInlineReason(this)">Save</button>
                </div>
            </div>
        `;

        row.insertAdjacentHTML('beforeend', reasonHtml);

        // Focus the reason input
        const reasonInput = row.querySelector('.player-view-inline-reason-input');
        if (reasonInput) {
            reasonInput.focus();
            reasonInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._submitInlineReason(reasonInput);
                }
                if (e.key === 'Escape') {
                    this._cancelInlineReason(reasonInput);
                }
            });
        }
    },

    /**
     * Cancel inline reason input
     */
    _cancelInlineReason(el) {
        const reasonDiv = el.closest('.player-view-inline-reason');
        if (reasonDiv) reasonDiv.remove();
    },

    /**
     * Submit inline reason and save field
     */
    _submitInlineReason(el) {
        const reasonDiv = el.closest('.player-view-inline-reason');
        const input = reasonDiv.querySelector('.player-view-inline-reason-input');
        const reason = input.value.trim();

        if (reason.length < 5) {
            input.style.borderColor = 'var(--error)';
            input.placeholder = 'Reason must be at least 5 characters';
            return;
        }

        const key = input.dataset.key;
        const sectionKey = input.dataset.section;
        const newValue = input.dataset.newValue;
        const row = reasonDiv.closest('.player-view-data-row');

        // Remove the reason input
        reasonDiv.remove();

        // Save with reason
        this._doFieldSave(row, key, sectionKey, newValue, reason);
    },

    /**
     * Perform the actual field save API call
     */
    async _doFieldSave(row, key, sectionKey, newValue, reason = null) {
        const fieldKey = `${sectionKey}:${key}`;

        // Prevent double-save
        if (this.savingFields.has(fieldKey)) return;
        this.savingFields.add(fieldKey);

        const scope = row.dataset.scope;
        const worldType = row.dataset.worldType || null;
        const feedback = row.querySelector('.player-view-field-feedback');

        // Show saving spinner
        if (feedback) {
            feedback.className = 'player-view-field-feedback saving';
            feedback.innerHTML = '<span class="spinner-small"></span>';
        }

        try {
            const response = await API.players.saveField(this.player.id, {
                field: key,
                value: newValue,
                scope: scope,
                worldType: worldType || undefined,
                reason: reason || undefined
            });

            if (response.success) {
                // Update the original value so subsequent blurs don't re-save
                row.dataset.original = response.newValue || newValue;
                row.classList.remove('modified');

                // Update display value
                const displayEl = row.querySelector('.player-view-data-value');
                if (displayEl && response.newDisplayValue) {
                    displayEl.textContent = response.newDisplayValue;
                }

                // Remove modified class from input
                const inputEl = row.querySelector('.player-view-data-input');
                if (inputEl) inputEl.classList.remove('modified');

                // Show success feedback
                if (feedback) {
                    const liveText = response.appliedLive
                        ? `Applied live`
                        : 'Saved';
                    feedback.className = `player-view-field-feedback ${response.appliedLive ? 'live' : 'saved'}`;
                    feedback.textContent = liveText;

                    // Fade after 3s
                    setTimeout(() => {
                        feedback.className = 'player-view-field-feedback';
                        feedback.textContent = '';
                    }, 3000);
                }
            } else {
                throw new Error(response.message || 'Save failed');
            }

        } catch (error) {
            console.error('[PlayerView] Field save error:', error);

            if (feedback) {
                feedback.className = 'player-view-field-feedback error';
                feedback.textContent = error.message || 'Save failed';

                setTimeout(() => {
                    feedback.className = 'player-view-field-feedback';
                    feedback.textContent = '';
                }, 5000);
            }
        } finally {
            this.savingFields.delete(fieldKey);
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

        this.editMode = false;
        document.body.classList.remove('player-view-edit-mode');

        this.player = null;
        this.header = null;
        this.sections = [];
        this.savingFields.clear();
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
