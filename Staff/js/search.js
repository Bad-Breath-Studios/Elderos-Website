/* ============================================================
   ELDEROS STAFF PANEL - ADVANCED SEARCH MODULE
   6-Mode Search: PLAYER, IP, UID, QUERY, ITEM, HISCORES
   ============================================================ */
console.log('[Search] Loading search.js...');

// Skill definitions for OSRS (used by HISCORES mode)
const SKILLS = [
    {id:0,name:'Attack'}, {id:1,name:'Defence'}, {id:2,name:'Strength'},
    {id:3,name:'Hitpoints'}, {id:4,name:'Ranged'}, {id:5,name:'Prayer'},
    {id:6,name:'Magic'}, {id:7,name:'Cooking'}, {id:8,name:'Woodcutting'},
    {id:9,name:'Fletching'}, {id:10,name:'Fishing'}, {id:11,name:'Firemaking'},
    {id:12,name:'Crafting'}, {id:13,name:'Smithing'}, {id:14,name:'Mining'},
    {id:15,name:'Herblore'}, {id:16,name:'Agility'}, {id:17,name:'Thieving'},
    {id:18,name:'Slayer'}, {id:19,name:'Farming'}, {id:20,name:'Runecrafting'},
    {id:21,name:'Hunter'}, {id:22,name:'Construction'}
];

const Search = {
    // Search modes configuration
    MODES: {
        PLAYER: {
            id: 'PLAYER',
            label: 'Player',
            placeholder: 'Search by player name...',
            color: 'blue',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>`,
            permission: 'VIEW_PLAYERS'
        },
        IP: {
            id: 'IP',
            label: 'IP Address',
            placeholder: 'Search by IP address...',
            color: 'purple',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>`,
            permission: 'VIEW_IP'
        },
        UID: {
            id: 'UID',
            label: 'Player ID',
            placeholder: 'Search by player ID...',
            color: 'orange',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>`,
            permission: 'VIEW_PLAYERS'
        },
        QUERY: {
            id: 'QUERY',
            label: 'Query',
            placeholder: 'Type an attribute...',
            color: 'green',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>`,
            permission: 'QUERY_PLAYERS'
        },
        ITEM: {
            id: 'ITEM',
            label: 'Item',
            placeholder: 'Search by item name or ID...',
            color: 'yellow',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>`,
            permission: 'SEARCH_ITEMS'
        },
        HISCORES: {
            id: 'HISCORES',
            label: 'Hiscores',
            placeholder: 'Add skill conditions below...',
            color: 'teal',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>`,
            permission: 'SEARCH_HISCORES'
        }
    },

    // State
    currentMode: 'PLAYER',
    currentQuery: '',
    filters: [],           // For QUERY mode filter tags
    attributes: [],        // Cached query attributes from API
    isDropdownOpen: false,
    isAutocompleteOpen: false,
    autocompleteIndex: -1, // Keyboard navigation index
    sortBy: null,
    sortDir: 'ASC',
    debounceTimer: null,   // For debouncing autocomplete updates

    // ITEM mode state
    selectedItem: null,    // {id, name} — currently selected item
    itemMinQty: 1,
    itemLocation: 'all',

    // HISCORES mode state
    hiscoreConditions: [], // [{skillId, op, value, minValue, maxValue, label}]

    // Elements
    elements: {},

    /**
     * Initialize search module
     */
    init() {
        console.log('[Search] init() called');
        this.cacheElements();
        console.log('[Search] Elements found:', {
            container: !!this.elements.container,
            modeBtn: !!this.elements.modeBtn,
            modeDropdown: !!this.elements.modeDropdown,
            input: !!this.elements.input
        });
        if (this.elements.container) {
            console.log('[Search] Setting up event listeners...');
            this.setupEventListeners();
            this.setupAutocompleteEvents();
            this.updateModeUI();
            this.fetchQueryAttributes();
            console.log('[Search] Init complete');
        } else {
            console.error('[Search] Container not found!');
        }
        console.log('[Search] init() completed');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            container: document.getElementById('playerSearch'),
            modeBtn: document.getElementById('searchModeBtn'),
            modeIcon: document.getElementById('searchModeIcon'),
            modeLabel: document.getElementById('searchModeLabel'),
            modeDropdown: document.getElementById('searchModeDropdown'),
            input: document.getElementById('searchInput'),
            clearBtn: document.getElementById('searchClearBtn'),
            submitBtn: document.getElementById('searchSubmitBtn'),
            autocomplete: document.getElementById('queryAutocomplete'),
            autocompleteMatching: document.getElementById('autocompleteMatchingItems'),
            autocompleteAll: document.getElementById('autocompleteAllItems'),
            filterTagsContainer: document.getElementById('filterTagsContainer'),
            filterTags: document.getElementById('filterTags'),
            filterClearAll: document.getElementById('filterClearAll')
        };

        console.log('[Search] Elements cached:', {
            container: !!this.elements.container,
            modeBtn: !!this.elements.modeBtn,
            input: !!this.elements.input
        });
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        const { modeBtn, modeDropdown, input, clearBtn, submitBtn, filterClearAll } = this.elements;

        console.log('[Search] setupEventListeners - modeBtn:', modeBtn);

        // Mode button click
        if (modeBtn) {
            modeBtn.addEventListener('click', (e) => {
                console.log('[Search] Mode button clicked!');
                e.stopPropagation();
                this.toggleModeDropdown();
            });
            console.log('[Search] Mode button listener attached');
        } else {
            console.error('[Search] Mode button not found, cannot attach listener');
        }

        // Mode options click
        modeDropdown?.querySelectorAll('.search-mode-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const mode = option.dataset.mode;
                const permission = option.dataset.permission;

                // Check permission
                if (permission && !Auth.hasPermission(permission)) {
                    Toast.warning('You do not have permission for this search mode');
                    return;
                }

                this.setMode(mode);
                this.closeModeDropdown();
                input?.focus();
            });
        });

        // Input events
        input?.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });

        input?.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        input?.addEventListener('focus', () => {
            if (this.currentMode === 'QUERY' && this.attributes.length > 0) {
                this.showAutocomplete();
            }
        });

        // Clear button
        clearBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearInput();
        });

        // Submit button
        submitBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.executeSearch();
        });

        // Clear all filters
        filterClearAll?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearAllFilters();
        });

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            if (!this.elements.container?.contains(e.target)) {
                this.closeModeDropdown();
                this.hideAutocomplete();
            }
        });

        // Escape key closes dropdowns
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModeDropdown();
                this.hideAutocomplete();
            }
        });

        // Update permission-based visibility
        this.updateModePermissions();
    },

    /**
     * Fetch query attributes from API
     */
    async fetchQueryAttributes() {
        try {
            const response = await API.get('/query/attributes');
            this.attributes = response.attributes || [];
            console.log('[Search] Loaded', this.attributes.length, 'query attributes');
        } catch (error) {
            console.warn('[Search] Failed to load query attributes:', error);
            // Use fallback attributes
            this.attributes = this.getFallbackAttributes();
        }
    },

    /**
     * Fallback attributes if API fails
     */
    getFallbackAttributes() {
        return [
            { field: 'eldercoin_balance', displayName: 'Eldercoins', type: 'NUMBER', operators: ['=', '!=', '>', '>=', '<', '<='], example: '>= 1000' },
            { field: 'rank', displayName: 'Rank', type: 'STRING', operators: ['=', '!='], allowedValues: ['member', 'sapphire', 'emerald', 'ruby', 'diamond', 'onyx', 'ascendant'], example: '= onyx' },
            { field: 'play_time', displayName: 'Play Time (hours)', type: 'NUMBER', operators: ['=', '!=', '>', '>=', '<', '<='], example: '> 100' },
            { field: 'warnings', displayName: 'Warnings', type: 'NUMBER', operators: ['=', '!=', '>', '>=', '<', '<='], example: '>= 2' },
            { field: 'donated', displayName: 'Total Donated ($)', type: 'NUMBER', operators: ['=', '!=', '>', '>=', '<', '<='], example: '> 50' },
            { field: 'is_muted', displayName: 'Is Muted', type: 'BOOLEAN', operators: ['='], example: '= true' },
            { field: 'is_banned', displayName: 'Is Banned', type: 'BOOLEAN', operators: ['='], example: '= true' },
            { field: 'status', displayName: 'Status', type: 'STRING', operators: ['=', '!='], allowedValues: ['online', 'offline', 'afk'], example: '= online' }
        ];
    },

    /**
     * Update mode permissions visibility
     */
    updateModePermissions() {
        this.elements.modeDropdown?.querySelectorAll('.search-mode-option').forEach(option => {
            const permission = option.dataset.permission;
            if (permission && !Auth.hasPermission(permission)) {
                option.classList.add('disabled');
                const desc = option.querySelector('.mode-option-desc');
                if (desc) desc.textContent = 'Requires Administrator';
            }
        });
    },

    /**
     * Handle input changes
     */
    handleInput(value) {
        this.currentQuery = value;
        this.updateClearButton();

        // Check for mode prefixes
        if (value.startsWith('ip:')) {
            this.setMode('IP');
            this.elements.input.value = value.slice(3);
            this.currentQuery = value.slice(3);
            return;
        }
        if (value.startsWith('uid:')) {
            this.setMode('UID');
            this.elements.input.value = value.slice(4);
            this.currentQuery = value.slice(4);
            return;
        }
        if (value.startsWith('q:')) {
            this.setMode('QUERY');
            this.elements.input.value = value.slice(2);
            this.currentQuery = value.slice(2);
            return;
        }

        // Show autocomplete in Query mode (debounced)
        if (this.currentMode === 'QUERY') {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.updateAutocomplete(value);
            }, 100);
        }

        // ITEM mode: autocomplete item names from API (debounced)
        if (this.currentMode === 'ITEM') {
            // Clear selected item when user types (they're starting a new search)
            this.selectedItem = null;
            this.updateItemFilterBar();

            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.fetchItemSuggestions(value);
            }, 200);
        }
    },

    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        // Tab cycles modes
        if (e.key === 'Tab' && !e.shiftKey && this.isDropdownOpen) {
            e.preventDefault();
            this.cycleMode();
            return;
        }

        // Enter executes search or adds filter
        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.currentMode === 'QUERY' && this.isAutocompleteOpen && this.autocompleteIndex >= 0) {
                this.selectAutocompleteItem();
            } else if (this.currentMode === 'QUERY' && this.isValidQueryExpression(this.currentQuery)) {
                this.addFilter(this.currentQuery);
            } else if (this.currentMode === 'ITEM' && this.isAutocompleteOpen && this.autocompleteIndex >= 0) {
                this.selectItemAutocompleteItem();
            } else {
                this.executeSearch();
            }
            return;
        }

        // Arrow keys for autocomplete navigation
        if (this.isAutocompleteOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateAutocomplete(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateAutocomplete(-1);
            }
        }

        // Backspace on empty input removes last filter
        if (e.key === 'Backspace' && this.currentQuery === '' && this.filters.length > 0) {
            this.removeFilter(this.filters.length - 1);
        }
    },

    /**
     * Toggle mode dropdown
     */
    toggleModeDropdown() {
        this.isDropdownOpen = !this.isDropdownOpen;
        console.log('[Search] Toggle dropdown:', this.isDropdownOpen);
        if (this.elements.modeDropdown) {
            this.elements.modeDropdown.style.display = this.isDropdownOpen ? 'block' : 'none';
        }
        this.elements.modeBtn?.classList.toggle('open', this.isDropdownOpen);
    },

    /**
     * Close mode dropdown
     */
    closeModeDropdown() {
        this.isDropdownOpen = false;
        if (this.elements.modeDropdown) {
            this.elements.modeDropdown.style.display = 'none';
        }
        this.elements.modeBtn?.classList.remove('open');
    },

    /**
     * Set search mode
     */
    setMode(mode) {
        if (!this.MODES[mode]) return;

        const modeConfig = this.MODES[mode];

        // Check permission
        if (!Auth.hasPermission(modeConfig.permission)) {
            Toast.warning('You do not have permission for this search mode');
            return;
        }

        const prevMode = this.currentMode;
        this.currentMode = mode;
        this.updateModeUI();

        // Clear filters when leaving Query mode
        if (mode !== 'QUERY' && this.filters.length > 0) {
            this.clearAllFilters();
        }

        // Clear ITEM state when leaving ITEM mode
        if (prevMode === 'ITEM' && mode !== 'ITEM') {
            this.selectedItem = null;
            this.itemMinQty = 1;
            this.itemLocation = 'all';
        }

        // Clear HISCORES state when leaving HISCORES mode
        if (prevMode === 'HISCORES' && mode !== 'HISCORES') {
            this.hiscoreConditions = [];
        }

        // Toggle visibility of results areas
        this.updateResultsVisibility(mode);

        // Show/hide item filter bar and hiscores builder
        this.updateItemFilterBar();
        this.updateHiscoresBuilder();

        console.log('[Search] Mode set to:', mode);
    },

    /**
     * Update mode UI elements
     */
    updateModeUI() {
        const mode = this.MODES[this.currentMode];
        if (!mode) return;

        // Update button
        if (this.elements.modeIcon) {
            this.elements.modeIcon.innerHTML = mode.icon;
            this.elements.modeIcon.className = `search-mode-icon ${mode.color}`;
        }
        if (this.elements.modeLabel) {
            this.elements.modeLabel.textContent = mode.label;
        }

        // Update placeholder
        if (this.elements.input) {
            this.elements.input.placeholder = mode.placeholder;
        }

        // Update active option in dropdown
        this.elements.modeDropdown?.querySelectorAll('.search-mode-option').forEach(option => {
            option.classList.toggle('active', option.dataset.mode === this.currentMode);
        });

        // Update container color class
        this.elements.container?.setAttribute('data-mode', this.currentMode.toLowerCase());
    },

    /**
     * Cycle through available modes
     */
    cycleMode() {
        const modes = Object.keys(this.MODES);
        const currentIndex = modes.indexOf(this.currentMode);
        let nextIndex = (currentIndex + 1) % modes.length;

        // Skip modes without permission
        let attempts = 0;
        while (attempts < modes.length) {
            const nextMode = modes[nextIndex];
            if (Auth.hasPermission(this.MODES[nextMode].permission)) {
                this.setMode(nextMode);
                return;
            }
            nextIndex = (nextIndex + 1) % modes.length;
            attempts++;
        }
    },

    /**
     * Update clear button visibility
     */
    updateClearButton() {
        const hasValue = this.currentQuery.length > 0;
        if (this.elements.clearBtn) {
            this.elements.clearBtn.classList.toggle('show', hasValue);
        }
    },

    /**
     * Clear input
     */
    clearInput() {
        if (this.elements.input) {
            this.elements.input.value = '';
            this.elements.input.focus();
        }
        this.currentQuery = '';
        this.updateClearButton();
        this.hideAutocomplete();
    },

    /**
     * Execute search
     */
    async executeSearch(allowEmpty = false) {
        const query = this.currentQuery.trim();

        // ITEM mode: delegate to ItemSearch module
        if (this.currentMode === 'ITEM') {
            if (!this.selectedItem) {
                Toast.warning('Please select an item from the suggestions');
                this.elements.input?.focus();
                return;
            }
            await ItemSearch.execute(this.selectedItem.id, this.selectedItem.name, this.itemMinQty, this.itemLocation, 1);
            return;
        }

        // HISCORES mode: delegate to ItemSearch hiscores
        if (this.currentMode === 'HISCORES') {
            if (this.hiscoreConditions.length === 0) {
                Toast.warning('Please add at least one skill condition');
                return;
            }
            await ItemSearch.executeHiscores(this.hiscoreConditions, 1);
            return;
        }

        // For non-Query modes, require input (unless allowEmpty is true for browsing all)
        if (!allowEmpty && this.currentMode !== 'QUERY' && !query) {
            Toast.warning('Please enter a search term');
            this.elements.input?.focus();
            return;
        }

        console.log('[Search] Executing search:', {
            mode: this.currentMode,
            query: query,
            filters: this.filters,
            sortBy: this.sortBy,
            sortDir: this.sortDir
        });

        // Build search params
        const params = {
            searchMode: this.currentMode,
            searchValue: query,
            sortBy: this.sortBy,
            sortDir: this.sortDir
        };

        // Add filters for Query mode
        if (this.currentMode === 'QUERY' && this.filters.length > 0) {
            params.filters = JSON.stringify(this.filters.map(f => ({
                field: f.field,
                operator: f.operator,
                value: f.value
            })));
        }

        // Trigger search in Players module
        await Players.search(params);
    },

    // ==================== QUERY MODE METHODS ====================

    /**
     * Show autocomplete dropdown
     */
    showAutocomplete() {
        if (this.isAutocompleteOpen) return; // Prevent re-entry
        this.isAutocompleteOpen = true;
        this.autocompleteIndex = -1;
        this.updateAutocomplete(this.currentQuery);
    },

    /**
     * Hide autocomplete dropdown
     */
    hideAutocomplete() {
        this.isAutocompleteOpen = false;
        this.autocompleteIndex = -1;
        if (this.elements.autocomplete) {
            this.elements.autocomplete.style.display = 'none';
        }
    },

    /**
     * Update autocomplete items based on input
     */
    updateAutocomplete(query) {
        if (!this.elements.autocomplete) return;

        const searchTerm = query.toLowerCase().split(/\s+/)[0] || ''; // Just the attribute part

        // Filter matching attributes
        const matching = searchTerm ? this.attributes.filter(attr =>
            attr.field.toLowerCase().includes(searchTerm) ||
            attr.displayName.toLowerCase().includes(searchTerm)
        ) : [];

        // Build HTML once
        let html = '';

        // Matching section
        if (matching.length > 0) {
            html += `<div class="autocomplete-section">
                <div class="autocomplete-section-title">Matching</div>
                <div class="autocomplete-items">
                    ${matching.map((attr, i) => this.renderAutocompleteItem(attr, i)).join('')}
                </div>
            </div>`;
        }

        // All attributes section
        html += `<div class="autocomplete-section">
            <div class="autocomplete-section-title">All Attributes</div>
            <div class="autocomplete-items">
                ${this.attributes.map((attr, i) => this.renderAutocompleteItem(attr, matching.length + i)).join('')}
            </div>
        </div>`;

        this.elements.autocomplete.innerHTML = html;
        // Show the dropdown
        this.elements.autocomplete.style.display = 'block';
    },

    /**
     * Setup autocomplete event delegation (called once in init)
     */
    setupAutocompleteEvents() {
        if (!this.elements.autocomplete) return;

        // Use event delegation - single listener for all items
        this.elements.autocomplete.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                const field = item.dataset.field;
                this.selectAttribute(field);
            }
        });
    },

    /**
     * Render a single autocomplete item
     */
    renderAutocompleteItem(attr, index) {
        const typeClass = attr.type ? attr.type.toLowerCase() : 'string';
        return `
            <div class="autocomplete-item" data-field="${attr.field}" data-index="${index}">
                <div class="autocomplete-item-main">
                    <span class="autocomplete-field">${attr.field}</span>
                    <span class="autocomplete-type ${typeClass}">${attr.type}</span>
                    <span class="autocomplete-example">${attr.example || ''}</span>
                </div>
                <div class="autocomplete-desc">${attr.displayName}</div>
            </div>
        `;
    },

    /**
     * Navigate autocomplete with arrow keys
     */
    navigateAutocomplete(direction) {
        const items = this.elements.autocomplete?.querySelectorAll('.autocomplete-item');
        if (!items || items.length === 0) return;

        // Remove current highlight
        items[this.autocompleteIndex]?.classList.remove('highlighted');

        // Update index
        this.autocompleteIndex += direction;
        if (this.autocompleteIndex < 0) this.autocompleteIndex = items.length - 1;
        if (this.autocompleteIndex >= items.length) this.autocompleteIndex = 0;

        // Add new highlight
        items[this.autocompleteIndex]?.classList.add('highlighted');
        items[this.autocompleteIndex]?.scrollIntoView({ block: 'nearest' });
    },

    /**
     * Select autocomplete item
     */
    selectAutocompleteItem() {
        const items = this.elements.autocomplete?.querySelectorAll('.autocomplete-item');
        if (this.autocompleteIndex >= 0 && items?.[this.autocompleteIndex]) {
            const field = items[this.autocompleteIndex].dataset.field;
            this.selectAttribute(field);
        }
    },

    /**
     * Select an attribute and fill input
     */
    selectAttribute(field) {
        if (this.elements.input) {
            this.elements.input.value = field + ' ';
            this.currentQuery = field + ' ';
            this.elements.input.focus();
        }
        this.hideAutocomplete();
    },

    /**
     * Check if query expression is valid
     */
    isValidQueryExpression(expr) {
        // Pattern: field operator value
        const pattern = /^(\w+)\s*(=|!=|>|>=|<|<=)\s*(.+)$/;
        const match = expr.trim().match(pattern);

        if (!match) return false;

        const [, field, operator, value] = match;
        const attr = this.attributes.find(a => a.field === field);

        if (!attr) return false;
        if (!attr.operators.includes(operator)) return false;

        return true;
    },

    /**
     * Parse query expression into filter object
     */
    parseQueryExpression(expr) {
        const pattern = /^(\w+)\s*(=|!=|>|>=|<|<=)\s*(.+)$/;
        const match = expr.trim().match(pattern);

        if (!match) return null;

        const [, field, operator, value] = match;
        const attr = this.attributes.find(a => a.field === field);

        return {
            field,
            operator,
            value: value.trim(),
            displayName: attr?.displayName || field,
            type: attr?.type || 'STRING'
        };
    },

    /**
     * Add a filter tag
     */
    addFilter(expression) {
        const filter = this.parseQueryExpression(expression);
        if (!filter) {
            Toast.error('Invalid query expression');
            return;
        }

        // Check for duplicate
        const exists = this.filters.some(f =>
            f.field === filter.field && f.operator === filter.operator && f.value === filter.value
        );
        if (exists) {
            Toast.warning('Filter already exists');
            return;
        }

        this.filters.push(filter);
        this.renderFilterTags();
        this.clearInput();

        // Notify players module about dynamic columns
        Players.addDynamicColumn(filter.field, filter.displayName, filter.type);

        console.log('[Search] Filter added:', filter);

        // Execute search with the new filter
        this.executeSearch(true);
    },

    /**
     * Remove a filter by index
     */
    removeFilter(index) {
        const filter = this.filters[index];
        if (filter) {
            Players.removeDynamicColumn(filter.field);
        }

        this.filters.splice(index, 1);
        this.renderFilterTags();

        // Re-execute search with updated filters
        if (this.filters.length > 0) {
            this.executeSearch();
        } else {
            Players.clearResults();
        }
    },

    /**
     * Clear all filters
     */
    clearAllFilters() {
        // Remove all dynamic columns
        this.filters.forEach(f => Players.removeDynamicColumn(f.field));

        this.filters = [];
        this.renderFilterTags();
        Players.clearResults();
    },

    /**
     * Render filter tags
     */
    renderFilterTags() {
        if (!this.elements.filterTags) return;

        const html = this.filters.map((filter, index) => `
            <div class="filter-tag" data-index="${index}">
                <span class="filter-tag-text">${filter.field} ${filter.operator} ${filter.value}</span>
                <button class="filter-tag-remove" type="button" data-index="${index}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `).join('');

        this.elements.filterTags.innerHTML = html;

        // Show/hide container based on filters
        const hasFilters = this.filters.length > 0;
        if (this.elements.filterTagsContainer) {
            this.elements.filterTagsContainer.classList.toggle('has-filters', hasFilters);
        }

        // Add remove handlers
        this.elements.filterTags.querySelectorAll('.filter-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.removeFilter(index);
            });
        });
    },

    // ==================== SORT METHODS ====================

    /**
     * Set sort column
     */
    setSort(column, direction = null) {
        if (this.sortBy === column) {
            // Toggle direction or clear
            if (direction) {
                this.sortDir = direction;
            } else if (this.sortDir === 'ASC') {
                this.sortDir = 'DESC';
            } else {
                // Third click clears sort
                this.sortBy = null;
                this.sortDir = 'ASC';
                return;
            }
        } else {
            this.sortBy = column;
            this.sortDir = direction || 'ASC';
        }

        console.log('[Search] Sort set to:', this.sortBy, this.sortDir);
    },

    /**
     * Get current search state
     */
    getState() {
        return {
            mode: this.currentMode,
            query: this.currentQuery,
            filters: [...this.filters],
            sortBy: this.sortBy,
            sortDir: this.sortDir
        };
    },

    // ==================== ITEM MODE METHODS ====================

    /**
     * Fetch item autocomplete suggestions from the API
     */
    async fetchItemSuggestions(query) {
        if (!query || query.trim().length < 2) {
            this.hideAutocomplete();
            return;
        }

        try {
            const response = await API.search.itemSuggest(query.trim(), 15);
            const suggestions = response.suggestions || [];

            if (suggestions.length === 0) {
                this.hideAutocomplete();
                return;
            }

            this.renderItemAutocomplete(suggestions);
        } catch (error) {
            console.warn('[Search] Item suggest failed:', error);
        }
    },

    /**
     * Render item autocomplete dropdown
     */
    renderItemAutocomplete(suggestions) {
        if (!this.elements.autocomplete) return;

        const html = `
            <div class="autocomplete-section">
                <div class="autocomplete-section-title">Items</div>
                <div class="autocomplete-items">
                    ${suggestions.map((item, i) => `
                        <div class="autocomplete-item item-suggest" data-item-id="${item.id}" data-item-name="${Utils.escapeHtml(item.name)}" data-index="${i}">
                            <div class="autocomplete-item-main">
                                <span class="autocomplete-field">${Utils.escapeHtml(item.name)}</span>
                                <span class="autocomplete-type number">ID: ${item.id}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;

        this.elements.autocomplete.innerHTML = html;
        this.elements.autocomplete.style.display = 'block';
        this.isAutocompleteOpen = true;
        this.autocompleteIndex = -1;

        // Add click handlers for item suggestions
        this.elements.autocomplete.querySelectorAll('.item-suggest').forEach(el => {
            el.addEventListener('click', () => {
                this.selectItem(parseInt(el.dataset.itemId), el.dataset.itemName);
            });
        });
    },

    /**
     * Select an item from autocomplete
     */
    selectItem(id, name) {
        this.selectedItem = { id, name };
        if (this.elements.input) {
            this.elements.input.value = `${name} (${id})`;
            this.currentQuery = `${name} (${id})`;
        }
        this.hideAutocomplete();
        this.updateItemFilterBar();
        console.log('[Search] Item selected:', id, name);
    },

    /**
     * Select item autocomplete by keyboard
     */
    selectItemAutocompleteItem() {
        const items = this.elements.autocomplete?.querySelectorAll('.item-suggest');
        if (this.autocompleteIndex >= 0 && items?.[this.autocompleteIndex]) {
            const el = items[this.autocompleteIndex];
            this.selectItem(parseInt(el.dataset.itemId), el.dataset.itemName);
        }
    },

    /**
     * Update item filter bar (min qty + location) visibility and state
     */
    updateItemFilterBar() {
        const bar = document.getElementById('itemFilterBar');
        if (!bar) return;

        if (this.currentMode === 'ITEM') {
            bar.style.display = 'flex';

            // Update values from inputs
            const qtyInput = bar.querySelector('#itemMinQty');
            const locSelect = bar.querySelector('#itemLocation');

            if (qtyInput && !qtyInput.dataset.initialized) {
                qtyInput.value = this.itemMinQty;
                qtyInput.addEventListener('change', () => {
                    this.itemMinQty = Math.max(1, parseInt(qtyInput.value) || 1);
                });
                qtyInput.dataset.initialized = 'true';
            }
            if (locSelect && !locSelect.dataset.initialized) {
                locSelect.value = this.itemLocation;
                locSelect.addEventListener('change', () => {
                    this.itemLocation = locSelect.value;
                });
                locSelect.dataset.initialized = 'true';
            }

            // Show selected item info
            const selectedInfo = bar.querySelector('#itemSelectedInfo');
            if (selectedInfo) {
                selectedInfo.textContent = this.selectedItem
                    ? `${this.selectedItem.name} (ID: ${this.selectedItem.id})`
                    : 'No item selected';
                selectedInfo.classList.toggle('has-item', !!this.selectedItem);
            }
        } else {
            bar.style.display = 'none';
        }
    },

    /**
     * Toggle results visibility based on mode
     */
    updateResultsVisibility(mode) {
        const playerResults = document.getElementById('playersTable');
        const itemResults = document.getElementById('itemSearchResults');
        const hiscoreResults = document.getElementById('hiscoreSearchResults');

        if (mode === 'ITEM') {
            if (playerResults) playerResults.style.display = 'none';
            if (itemResults) itemResults.style.display = 'block';
            if (hiscoreResults) hiscoreResults.style.display = 'none';
        } else if (mode === 'HISCORES') {
            if (playerResults) playerResults.style.display = 'none';
            if (itemResults) itemResults.style.display = 'none';
            if (hiscoreResults) hiscoreResults.style.display = 'block';
        } else {
            if (playerResults) playerResults.style.display = '';
            if (itemResults) itemResults.style.display = 'none';
            if (hiscoreResults) hiscoreResults.style.display = 'none';
        }
    },

    // ==================== HISCORES MODE METHODS ====================

    /**
     * Update hiscores condition builder visibility
     */
    updateHiscoresBuilder() {
        const builder = document.getElementById('hiscoresBuilder');
        if (!builder) return;

        if (this.currentMode === 'HISCORES') {
            builder.style.display = 'block';
            this.renderHiscoresConditions();
        } else {
            builder.style.display = 'none';
        }
    },

    /**
     * Add a hiscore condition
     */
    addHiscoreCondition() {
        const skillSelect = document.getElementById('hiscoreSkill');
        const opSelect = document.getElementById('hiscoreOp');
        const valueInput = document.getElementById('hiscoreValue');
        const minInput = document.getElementById('hiscoreMinValue');
        const maxInput = document.getElementById('hiscoreMaxValue');

        if (!skillSelect || !opSelect) return;

        const skillId = parseInt(skillSelect.value);
        const op = opSelect.value;
        const skill = SKILLS.find(s => s.id === skillId);
        if (!skill) return;

        let condition;
        if (op === 'between') {
            const minVal = parseInt(minInput?.value) || 1;
            const maxVal = parseInt(maxInput?.value) || 99;
            condition = {
                skillId, op, minValue: minVal, maxValue: maxVal,
                label: `${skill.name} ${minVal}-${maxVal}`
            };
        } else {
            const value = parseInt(valueInput?.value) || 1;
            condition = {
                skillId, op, value,
                label: `${skill.name} ${op} ${value}`
            };
        }

        // Check for duplicate skill+op
        const exists = this.hiscoreConditions.some(c => c.skillId === skillId && c.op === op);
        if (exists) {
            Toast.warning('Condition for this skill and operator already exists');
            return;
        }

        this.hiscoreConditions.push(condition);
        this.renderHiscoresConditions();

        // Reset value inputs
        if (valueInput) valueInput.value = '99';
        if (minInput) minInput.value = '1';
        if (maxInput) maxInput.value = '99';
    },

    /**
     * Remove a hiscore condition
     */
    removeHiscoreCondition(index) {
        this.hiscoreConditions.splice(index, 1);
        this.renderHiscoresConditions();
    },

    /**
     * Render hiscore condition tags
     */
    renderHiscoresConditions() {
        const container = document.getElementById('hiscoreConditions');
        if (!container) return;

        if (this.hiscoreConditions.length === 0) {
            container.innerHTML = '<span class="hiscore-empty">No conditions added yet</span>';
            return;
        }

        container.innerHTML = this.hiscoreConditions.map((c, i) => `
            <div class="filter-tag hiscore-tag">
                <span class="filter-tag-text">${Utils.escapeHtml(c.label)}</span>
                <button class="filter-tag-remove" type="button" onclick="Search.removeHiscoreCondition(${i})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    /**
     * Toggle between value and range inputs for hiscores operator
     */
    onHiscoreOpChange() {
        const op = document.getElementById('hiscoreOp')?.value;
        const singleGroup = document.getElementById('hiscoreSingleValue');
        const rangeGroup = document.getElementById('hiscoreRangeValue');

        if (singleGroup && rangeGroup) {
            singleGroup.style.display = op === 'between' ? 'none' : 'flex';
            rangeGroup.style.display = op === 'between' ? 'flex' : 'none';
        }
    }
};

// Toast notification helper
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const colors = {
            success: 'var(--success)',
            error: 'var(--error)',
            warning: 'var(--warning)',
            info: 'var(--info)'
        };

        toast.style.cssText = `
            padding: 12px 16px;
            background-color: var(--bg-elevated);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: 14px;
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            border-left: 3px solid ${colors[type] || colors.info};
        `;

        toast.textContent = message;
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Search, Toast };
}
