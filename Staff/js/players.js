/* ============================================================
   ELDEROS STAFF PANEL - PLAYERS MODULE
   Supports dynamic columns, sorting, and advanced search
   ============================================================ */
console.log('[Players] Loading players.js...');

const Players = {
    // State
    results: [],
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    isLoading: false,

    // Dynamic columns from Query mode
    dynamicColumns: [], // { field, displayName, type }

    // Sort state
    sortBy: null,
    sortDir: 'ASC',

    // Default columns
    defaultColumns: [
        { field: 'username', label: 'Player', sortable: true },
        { field: 'rank', label: 'Rank', sortable: true, hideOnMobile: true },
        { field: 'status', label: 'Status', sortable: true, hideOnMobile: true },
        { field: 'lastLogin', label: 'Last Login', sortable: true, hideOnMobile: true },
        { field: 'actions', label: 'Actions', sortable: false }
    ],

    // Elements
    elements: {},

    /**
     * Initialize players module
     */
    init() {
        console.log('[Players] init() called');
        this.cacheElements();
        this.setupEventListeners();
        this.renderTableHeader();
        console.log('[Players] init() completed');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            tableContainer: document.getElementById('playersTable'),
            tableHead: document.querySelector('#playersTable thead tr'),
            tableBody: document.getElementById('playersTableBody'),
            pagination: document.getElementById('playersPagination'),
            tableInfo: document.querySelector('#playersTable .table-info')
        };
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sort headers are set up in renderTableHeader
    },

    /**
     * Called when players page is loaded
     */
    onPageLoad() {
        console.log('[Players] onPageLoad called');
        console.log('[Players] Current isLoading:', this.isLoading);
        console.log('[Players] Elements:', {
            tableBody: !!this.elements.tableBody,
            tableHead: !!this.elements.tableHead
        });
        // Always load players on page load
        this.loadAllPlayers();
    },

    /**
     * Load all players (paginated)
     */
    async loadAllPlayers(page = 1) {
        console.log('[Players] Loading all players, page:', page, 'sortBy:', this.sortBy, 'sortDir:', this.sortDir);
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            // Use /players/list endpoint for listing all players
            const apiParams = {
                page: page,
                limit: CONFIG.DEFAULT_PAGE_SIZE
            };

            // Include sort parameters if set
            if (this.sortBy) {
                apiParams.sortBy = this.sortBy;
                apiParams.sortDir = this.sortDir || 'ASC';
            }

            const response = await API.get('/players/list', apiParams);
            console.log('[Players] Load all response:', response);

            this.results = response.players || response.data || [];
            this.totalResults = response.pagination?.totalElements || response.total || this.results.length;
            this.totalPages = response.pagination?.totalPages || Math.ceil(this.totalResults / CONFIG.DEFAULT_PAGE_SIZE);
            this.currentPage = response.pagination?.page || page;

            this.renderTableHeader();
            this.renderResults();
            this.renderPagination();
            this.updateTableInfo();

        } catch (error) {
            console.error('[Players] Load all error:', error);
            this.showEmpty('Failed to load players. Please try again.');
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Search players with new params format
     */
    async search(params) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        console.log('[Players] Searching with params:', params);

        try {
            // Build API request
            const apiParams = {
                searchMode: params.searchMode || 'PLAYER',
                query: params.searchValue || '',
                page: params.page || 1,
                limit: CONFIG.DEFAULT_PAGE_SIZE
            };

            // Add filters for Query mode
            if (params.filters) {
                apiParams.filters = params.filters;
            }

            // Add sorting
            if (params.sortBy) {
                apiParams.sortBy = params.sortBy;
                apiParams.sortDir = params.sortDir || 'ASC';
            }

            const response = await API.get('/players/search', apiParams);
            console.log('[Players] Search response:', response);

            this.results = response.players || [];
            this.totalResults = response.pagination?.totalElements || response.total || 0;
            this.totalPages = response.pagination?.totalPages || Math.ceil(this.totalResults / CONFIG.DEFAULT_PAGE_SIZE);
            this.currentPage = response.pagination?.page || params.page || 1;

            // Handle active columns from response (for dynamic columns)
            if (response.activeColumns) {
                this.updateDynamicColumnsFromResponse(response.activeColumns);
            }

            this.renderTableHeader();
            this.renderResults();
            this.renderPagination();
            this.updateTableInfo();

        } catch (error) {
            console.error('[Players] Search error:', error);
            Toast.error(error.message || 'Search failed');
            this.showEmpty('Search failed. Please try again.');
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.tableBody) {
            const colCount = this.getColumnCount();
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="${colCount}">
                        <div class="table-loading">
                            <div class="spinner spinner-lg"></div>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Show empty state
     */
    showEmpty(message = 'No players found') {
        if (this.elements.tableBody) {
            const colCount = this.getColumnCount();
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="${colCount}">
                        <div class="table-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <div class="table-empty-title">${message}</div>
                            <div class="table-empty-text">Try adjusting your search criteria</div>
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Clear results
     */
    clearResults() {
        this.results = [];
        this.totalResults = 0;
        this.totalPages = 1;
        this.currentPage = 1;
        this.showEmpty('Use the search above to find players');
        this.renderPagination();
        this.updateTableInfo();
    },

    /**
     * Get total column count
     */
    getColumnCount() {
        return this.defaultColumns.length + this.dynamicColumns.length;
    },

    /**
     * Get all columns (default + dynamic)
     */
    getAllColumns() {
        // Insert dynamic columns after rank
        const cols = [...this.defaultColumns];
        if (this.dynamicColumns.length > 0) {
            const insertIndex = cols.findIndex(c => c.field === 'status');
            cols.splice(insertIndex, 0, ...this.dynamicColumns.map(dc => ({
                field: dc.field,
                label: dc.displayName,
                sortable: true,
                isDynamic: true,
                type: dc.type
            })));
        }
        return cols;
    },

    // ==================== DYNAMIC COLUMNS ====================

    /**
     * Add a dynamic column from Query filter
     */
    addDynamicColumn(field, displayName, type) {
        // Check if already exists
        if (this.dynamicColumns.some(c => c.field === field)) return;

        this.dynamicColumns.push({ field, displayName, type });
        this.renderTableHeader();
        console.log('[Players] Dynamic column added:', field);
    },

    /**
     * Remove a dynamic column
     */
    removeDynamicColumn(field) {
        const index = this.dynamicColumns.findIndex(c => c.field === field);
        if (index !== -1) {
            this.dynamicColumns.splice(index, 1);
            this.renderTableHeader();
            console.log('[Players] Dynamic column removed:', field);
        }
    },

    /**
     * Update dynamic columns from API response
     */
    updateDynamicColumnsFromResponse(activeColumns) {
        // This syncs the columns with what the server says is active
        // Useful if the server response includes column info
    },

    // ==================== SORTING ====================

    /**
     * Handle column sort click
     */
    handleSort(field) {
        console.log('[Players] handleSort called for field:', field);

        if (this.sortBy === field) {
            // Toggle direction
            if (this.sortDir === 'ASC') {
                this.sortDir = 'DESC';
            } else {
                // Third click clears sort
                this.sortBy = null;
                this.sortDir = 'ASC';
            }
        } else {
            this.sortBy = field;
            this.sortDir = 'ASC';
        }

        console.log('[Players] Sort updated:', this.sortBy, this.sortDir);

        // Update Search module
        Search.setSort(this.sortBy, this.sortDir);

        // Update header UI
        this.updateSortUI();

        // Check if we're in search mode or browsing all players
        const state = Search.getState();
        if (state && state.query && state.query.trim() !== '') {
            // In search mode, re-execute search with new sort
            Search.executeSearch(true);
        } else if (state && state.filters && state.filters.length > 0) {
            // Query mode with filters
            Search.executeSearch(true);
        } else {
            // Browsing all players, reload with current page
            this.loadAllPlayers(this.currentPage);
        }
    },

    /**
     * Update sort indicators in header
     */
    updateSortUI() {
        if (!this.elements.tableHead) return;

        this.elements.tableHead.querySelectorAll('th').forEach(th => {
            const field = th.dataset.sort;
            th.classList.remove('sorted', 'sort-asc', 'sort-desc');

            if (field === this.sortBy) {
                th.classList.add('sorted', this.sortDir === 'ASC' ? 'sort-asc' : 'sort-desc');
            }
        });
    },

    // ==================== RENDERING ====================

    /**
     * Render table header with all columns
     */
    renderTableHeader() {
        if (!this.elements.tableHead) {
            console.warn('[Players] tableHead element not found, re-caching...');
            this.cacheElements();
            if (!this.elements.tableHead) {
                console.error('[Players] Still no tableHead after re-cache');
                return;
            }
        }

        const columns = this.getAllColumns();
        const html = columns.map(col => {
            const sortableClass = col.sortable ? 'sortable' : '';
            const hideClass = col.hideOnMobile ? 'hide-mobile' : '';
            const dynamicClass = col.isDynamic ? 'dynamic-column' : '';
            const sortAttr = col.sortable ? `data-sort="${col.field}"` : '';

            let content = col.label;
            if (col.isDynamic) {
                content += ' <span class="column-badge query">QUERY</span>';
            }

            return `<th class="${sortableClass} ${hideClass} ${dynamicClass}" ${sortAttr}>${content}</th>`;
        }).join('');

        this.elements.tableHead.innerHTML = html;

        // Add click handlers for sortable columns using event delegation on thead
        const sortableHeaders = this.elements.tableHead.querySelectorAll('th.sortable');
        console.log('[Players] Found', sortableHeaders.length, 'sortable columns');

        sortableHeaders.forEach(th => {
            // Remove any existing listeners by cloning
            const newTh = th.cloneNode(true);
            th.parentNode.replaceChild(newTh, th);

            newTh.addEventListener('click', (e) => {
                console.log('[Players] Column header clicked:', newTh.dataset.sort);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const field = newTh.dataset.sort;
                if (field) {
                    console.log('[Players] Calling handleSort for:', field);
                    this.handleSort(field);
                }
                return false;
            }, true); // Use capture phase
        });

        this.updateSortUI();
    },

    /**
     * Render results
     */
    renderResults() {
        if (!this.elements.tableBody) return;

        if (this.results.length === 0) {
            this.showEmpty();
            return;
        }

        const html = this.results.map(player => this.renderPlayerRow(player)).join('');
        this.elements.tableBody.innerHTML = html;

        // Add click handlers for rows
        this.elements.tableBody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.cell-action-btn')) return;
                const playerId = row.dataset.playerId;
                if (playerId) {
                    PlayerView.open(playerId);
                }
            });
        });
    },

    /**
     * Render a single player row
     */
    renderPlayerRow(player) {
        const columns = this.getAllColumns();
        const cells = columns.map(col => this.renderCell(col, player)).join('');

        return `
            <tr class="clickable" data-player-id="${player.id || player.playerId}">
                ${cells}
            </tr>
        `;
    },

    /**
     * Render a single cell
     */
    renderCell(col, player) {
        const hideClass = col.hideOnMobile ? 'hide-mobile' : '';

        switch (col.field) {
            case 'username':
                return `
                    <td>
                        <div class="cell-player">
                            <div class="cell-player-avatar">
                                <span class="cell-player-avatar-initial">${(player.username || player.name || '?').charAt(0).toUpperCase()}</span>
                            </div>
                            <div class="cell-player-info">
                                <span class="cell-player-name">${Utils.escapeHtml(player.username || player.name)}</span>
                                <span class="cell-player-meta">ID: ${player.id || player.playerId}</span>
                            </div>
                        </div>
                    </td>
                `;

            case 'rank':
                const donatorRank = (player.donatorRank || player.rank || 'none').toUpperCase();
                const staffRole = (player.staffRole || 'NONE').toUpperCase();

                // Build rank icons HTML
                let rankIconsHtml = '';

                // Staff rank icon (if not NONE)
                if (staffRole !== 'NONE') {
                    const staffIconFile = this.getStaffRankIcon(staffRole);
                    if (staffIconFile) {
                        rankIconsHtml += `<img src="assets/staff-ranks/${staffIconFile}" alt="${staffRole}" class="rank-icon staff-rank" title="${Utils.capitalize(staffRole.replace('_', ' '))}">`;
                    }
                }

                // Donator rank icon (if not NONE)
                if (donatorRank !== 'NONE') {
                    rankIconsHtml += `<img src="assets/donator-ranks/${donatorRank}.png" alt="${donatorRank}" class="rank-icon donator-rank" title="${Utils.capitalize(donatorRank)} Donator">`;
                }

                // Display text - prioritize staff rank, fall back to donator rank
                let displayRank, rankClass;
                if (staffRole !== 'NONE') {
                    // Show staff rank
                    displayRank = Utils.capitalize(staffRole.replace('_', ' '));
                    rankClass = staffRole.toLowerCase().replace('_', '-');
                } else if (donatorRank !== 'NONE') {
                    // Show donator rank
                    displayRank = Utils.capitalize(donatorRank);
                    rankClass = donatorRank.toLowerCase();
                } else {
                    // No rank
                    displayRank = 'Member';
                    rankClass = 'member';
                }

                return `
                    <td class="${hideClass}">
                        <div class="cell-rank">
                            ${rankIconsHtml}
                            <span class="badge badge-${rankClass}">${displayRank}</span>
                        </div>
                    </td>
                `;

            case 'status':
                const isOnline = player.online || player.status === 'ONLINE' || player.status === 'online';
                const isBanned = player.isBanned || player.banned || player.is_banned;
                const statusDot = isOnline ? 'online' : (isBanned ? 'banned' : 'offline');
                const statusText = isOnline ? 'Online' : (isBanned ? 'Banned' : 'Offline');
                return `
                    <td class="${hideClass}">
                        <div class="cell-status">
                            <span class="status-dot ${statusDot}"></span>
                            <span>${statusText}</span>
                        </div>
                    </td>
                `;

            case 'lastLogin':
                return `
                    <td class="${hideClass} cell-date">
                        ${Utils.formatRelativeTime(player.lastLoginAt || player.lastLogin || player.last_login)}
                    </td>
                `;

            case 'actions':
                return `
                    <td>
                        <div class="cell-actions">
                            <button class="cell-action-btn" title="View Details" onclick="PlayerView.open('${player.id || player.playerId}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                            ${Auth.hasPermission(CONFIG.PERMISSIONS.TEMP_BAN) ? `
                            <button class="cell-action-btn danger" title="Quick Ban" onclick="Popup.quickPunish('${player.id || player.playerId}', 'BAN')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                </svg>
                            </button>
                            ` : ''}
                        </div>
                    </td>
                `;

            default:
                // Dynamic column
                if (col.isDynamic) {
                    const value = player.dynamicColumns?.[col.field] ?? player[col.field] ?? '-';
                    const formattedValue = col.type === 'NUMBER' ? Utils.formatNumber(value) : value;
                    return `
                        <td class="${hideClass} cell-dynamic">
                            ${formattedValue}
                        </td>
                    `;
                }
                return `<td class="${hideClass}">-</td>`;
        }
    },

    /**
     * Render pagination
     */
    renderPagination() {
        if (!this.elements.pagination) return;

        if (this.totalPages <= 1) {
            this.elements.pagination.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="Players.goToPage(${this.currentPage - 1})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>
        `;

        // Page numbers
        const pages = this.getVisiblePages();
        pages.forEach(page => {
            if (page === '...') {
                html += '<span class="pagination-ellipsis">...</span>';
            } else {
                html += `
                    <button class="pagination-btn page-number ${page === this.currentPage ? 'active' : ''}" onclick="Players.goToPage(${page})">
                        ${page}
                    </button>
                `;
            }
        });

        // Next button
        html += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="Players.goToPage(${this.currentPage + 1})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;

        this.elements.pagination.innerHTML = html;
    },

    /**
     * Get visible page numbers
     */
    getVisiblePages() {
        const pages = [];
        const maxVisible = 5;

        if (this.totalPages <= maxVisible) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (this.currentPage > 3) {
                pages.push('...');
            }

            const start = Math.max(2, this.currentPage - 1);
            const end = Math.min(this.totalPages - 1, this.currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (this.currentPage < this.totalPages - 2) {
                pages.push('...');
            }

            pages.push(this.totalPages);
        }

        return pages;
    },

    /**
     * Go to page
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;

        // Check if we're in search mode or browsing all players
        const state = Search.getState();
        if (state && state.searchValue && state.searchValue.trim() !== '') {
            // In search mode, use Search.executeSearch
            Search.executeSearch({ ...state, page });
        } else {
            // Browsing all players, use loadAllPlayers
            this.loadAllPlayers(page);
        }
    },

    /**
     * Update table info text
     */
    updateTableInfo() {
        if (this.elements.tableInfo) {
            const start = this.totalResults === 0 ? 0 : (this.currentPage - 1) * CONFIG.DEFAULT_PAGE_SIZE + 1;
            const end = Math.min(this.currentPage * CONFIG.DEFAULT_PAGE_SIZE, this.totalResults);
            this.elements.tableInfo.innerHTML = `Showing <strong>${start}-${end}</strong> of <strong>${this.totalResults}</strong> players`;
        }
    },

    /**
     * Get staff rank icon filename
     * Maps staff role names to their icon files
     */
    getStaffRankIcon(staffRole) {
        const iconMap = {
            'OWNER': 'OWNER.png',
            'DEVELOPER': 'DEVELOPER.png',
            'MANAGER': 'MANAGER.png',
            'ADMINISTRATOR': 'ADMIN.png',
            'HEAD_MODERATOR': 'MOD.png',
            'MODERATOR': 'MOD.png',
            'SUPPORT': 'SUPPORT.png',
            'YOUTUBER': 'YOUTUBER.png'
        };
        return iconMap[staffRole] || null;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Players;
}
