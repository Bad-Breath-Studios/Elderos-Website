/* ============================================================
   ELDEROS STAFF PANEL - ITEM SEARCH & HISCORES MODULE
   Handles item search results + hiscores search results
   ============================================================ */
console.log('[ItemSearch] Loading item-search.js...');

const ItemSearch = {
    // Item search state
    itemResults: [],
    itemPage: 1,
    itemTotalPages: 1,
    itemTotalResults: 0,
    itemIsLoading: false,
    lastItemId: null,
    lastItemName: '',
    lastMinQty: 1,
    lastLocation: 'all',

    // Hiscores search state
    hiscoreResults: [],
    hiscorePage: 1,
    hiscoreTotalPages: 1,
    hiscoreTotalResults: 0,
    hiscoreIsLoading: false,
    hiscoreRequestedSkills: [],

    /**
     * Execute item search
     */
    async execute(itemId, itemName, minQty, location, page) {
        if (this.itemIsLoading) return;

        this.itemIsLoading = true;
        this.lastItemId = itemId;
        this.lastItemName = itemName;
        this.lastMinQty = minQty;
        this.lastLocation = location;
        this.itemPage = page || 1;

        const body = document.getElementById('itemSearchBody');
        const title = document.getElementById('itemSearchTitle');
        if (title) title.textContent = `Item Search: ${Utils.escapeHtml(itemName)} (ID: ${itemId})`;

        // Show loading
        if (body) {
            body.innerHTML = `<tr><td colspan="7"><div class="table-loading"><div class="spinner spinner-lg"></div></div></td></tr>`;
        }

        try {
            const response = await API.search.items(itemId, {
                minQty, location, page: this.itemPage, limit: CONFIG.DEFAULT_PAGE_SIZE
            });

            this.itemResults = response.results || [];
            this.itemTotalResults = response.pagination?.totalElements || 0;
            this.itemTotalPages = response.pagination?.totalPages || 1;
            this.itemPage = response.pagination?.page || page;

            this.renderItemHeader();
            this.renderItemResults();
            this.renderItemPagination();
            this.updateItemInfo();

        } catch (error) {
            console.error('[ItemSearch] Search error:', error);
            Toast.error(error.message || 'Item search failed');
            if (body) {
                body.innerHTML = `<tr><td colspan="7"><div class="table-empty"><div class="table-empty-title">Search failed</div></div></td></tr>`;
            }
        } finally {
            this.itemIsLoading = false;
        }
    },

    /**
     * Render item search table header
     */
    renderItemHeader() {
        const head = document.getElementById('itemSearchHead');
        if (!head) return;

        head.innerHTML = `
            <th class="sortable">Player</th>
            <th class="sortable">Quantity</th>
            <th>Location</th>
            <th class="hide-mobile">Game Mode</th>
            <th class="hide-mobile">Rank</th>
            <th class="hide-mobile">Last Login</th>
            <th>Actions</th>
        `;
    },

    /**
     * Render item search results
     */
    renderItemResults() {
        const body = document.getElementById('itemSearchBody');
        if (!body) return;

        if (this.itemResults.length === 0) {
            body.innerHTML = `
                <tr><td colspan="7">
                    <div class="table-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                        <div class="table-empty-title">No players found with this item</div>
                        <div class="table-empty-text">Try adjusting your search criteria</div>
                    </div>
                </td></tr>`;
            return;
        }

        body.innerHTML = this.itemResults.map(r => `
            <tr class="clickable" data-player-id="${r.accountId}">
                <td>
                    <div class="cell-player">
                        <div class="cell-player-avatar">
                            <span class="cell-player-avatar-initial">${(r.username || '?').charAt(0).toUpperCase()}</span>
                        </div>
                        <div class="cell-player-info">
                            <span class="cell-player-name">${Utils.escapeHtml(r.displayName || r.username)}</span>
                            <span class="cell-player-meta">ID: ${r.accountId}</span>
                        </div>
                    </div>
                </td>
                <td><span class="item-qty">${Utils.formatNumber(r.quantity)}</span></td>
                <td><span class="badge badge-${r.location}">${Utils.capitalize(r.location)}</span></td>
                <td class="hide-mobile"><span class="badge badge-mode">${r.gameMode || 'NORMAL'}</span></td>
                <td class="hide-mobile"><span class="badge badge-${(r.rank || 'none').toLowerCase()}">${Utils.capitalize(r.rank || 'None')}</span></td>
                <td class="hide-mobile cell-date">${Utils.formatRelativeTime(r.lastLogin)}</td>
                <td>
                    <div class="cell-actions">
                        <button class="cell-action-btn" title="View Details" onclick="PlayerView.open('${r.accountId}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Click handlers
        body.querySelectorAll('tr.clickable').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.cell-action-btn')) return;
                const id = row.dataset.playerId;
                if (id) PlayerView.open(id);
            });
        });
    },

    /**
     * Render item search pagination
     */
    renderItemPagination() {
        const container = document.getElementById('itemSearchPagination');
        if (!container) return;

        if (this.itemTotalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this._buildPaginationHtml(
            this.itemPage, this.itemTotalPages, 'ItemSearch.goToItemPage'
        );
    },

    /**
     * Update item search info text
     */
    updateItemInfo() {
        const info = document.getElementById('itemSearchInfo');
        if (!info) return;

        const start = this.itemTotalResults === 0 ? 0 : (this.itemPage - 1) * CONFIG.DEFAULT_PAGE_SIZE + 1;
        const end = Math.min(this.itemPage * CONFIG.DEFAULT_PAGE_SIZE, this.itemTotalResults);
        info.innerHTML = `Showing <strong>${start}-${end}</strong> of <strong>${this.itemTotalResults}</strong> results`;
    },

    /**
     * Go to item search page
     */
    goToItemPage(page) {
        if (page < 1 || page > this.itemTotalPages || page === this.itemPage) return;
        this.execute(this.lastItemId, this.lastItemName, this.lastMinQty, this.lastLocation, page);
    },

    // ==================== HISCORES SEARCH ====================

    /**
     * Execute hiscores search
     */
    async executeHiscores(conditions, page) {
        if (this.hiscoreIsLoading) return;

        this.hiscoreIsLoading = true;
        this.hiscorePage = page || 1;

        const body = document.getElementById('hiscoreSearchBody');
        const title = document.getElementById('hiscoreSearchTitle');
        if (title) title.textContent = 'Hiscores Search Results';

        if (body) {
            body.innerHTML = `<tr><td colspan="8"><div class="table-loading"><div class="spinner spinner-lg"></div></div></td></tr>`;
        }

        try {
            // Build conditions for API
            const apiConditions = conditions.map(c => {
                const cond = { skillId: c.skillId, op: c.op };
                if (c.op === 'between') {
                    cond.minValue = c.minValue;
                    cond.maxValue = c.maxValue;
                } else {
                    cond.value = c.value;
                }
                return cond;
            });

            const response = await API.search.hiscores(apiConditions, {
                page: this.hiscorePage,
                limit: CONFIG.DEFAULT_PAGE_SIZE
            });

            this.hiscoreResults = response.results || [];
            this.hiscoreTotalResults = response.pagination?.totalElements || 0;
            this.hiscoreTotalPages = response.pagination?.totalPages || 1;
            this.hiscorePage = response.pagination?.page || page;
            this.hiscoreRequestedSkills = response.requestedSkills || [];

            this.renderHiscoreHeader();
            this.renderHiscoreResults();
            this.renderHiscorePagination();
            this.updateHiscoreInfo();

        } catch (error) {
            console.error('[ItemSearch] Hiscores search error:', error);
            Toast.error(error.message || 'Hiscores search failed');
            if (body) {
                body.innerHTML = `<tr><td colspan="8"><div class="table-empty"><div class="table-empty-title">Search failed</div></div></td></tr>`;
            }
        } finally {
            this.hiscoreIsLoading = false;
        }
    },

    /**
     * Render hiscores table header with dynamic skill columns
     */
    renderHiscoreHeader() {
        const head = document.getElementById('hiscoreSearchHead');
        if (!head) return;

        let html = '<th>Player</th><th>Total Level</th><th class="hide-mobile">Total XP</th>';

        for (const skillId of this.hiscoreRequestedSkills) {
            const skill = SKILLS.find(s => s.id === skillId);
            const name = skill ? skill.name : `Skill ${skillId}`;
            html += `<th>${name}</th>`;
        }

        html += '<th class="hide-mobile">Game Mode</th><th class="hide-mobile">Last Login</th><th>Actions</th>';
        head.innerHTML = html;
    },

    /**
     * Render hiscores results
     */
    renderHiscoreResults() {
        const body = document.getElementById('hiscoreSearchBody');
        if (!body) return;

        const colCount = 5 + this.hiscoreRequestedSkills.length;

        if (this.hiscoreResults.length === 0) {
            body.innerHTML = `
                <tr><td colspan="${colCount}">
                    <div class="table-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="20" x2="18" y2="10"/>
                            <line x1="12" y1="20" x2="12" y2="4"/>
                            <line x1="6" y1="20" x2="6" y2="14"/>
                        </svg>
                        <div class="table-empty-title">No players match these conditions</div>
                        <div class="table-empty-text">Try adjusting your skill requirements</div>
                    </div>
                </td></tr>`;
            return;
        }

        body.innerHTML = this.hiscoreResults.map(r => {
            let skillCells = '';
            for (const skillId of this.hiscoreRequestedSkills) {
                const sk = (r.skills || []).find(s => s.id === skillId);
                if (sk) {
                    skillCells += `<td><span class="skill-level">${sk.level}</span> <span class="skill-xp">(${Utils.formatNumber(sk.xp)} xp)</span></td>`;
                } else {
                    skillCells += '<td>-</td>';
                }
            }

            return `
                <tr class="clickable" data-player-id="${r.accountId}">
                    <td>
                        <div class="cell-player">
                            <div class="cell-player-avatar">
                                <span class="cell-player-avatar-initial">${(r.username || '?').charAt(0).toUpperCase()}</span>
                            </div>
                            <div class="cell-player-info">
                                <span class="cell-player-name">${Utils.escapeHtml(r.displayName || r.username)}</span>
                                <span class="cell-player-meta">ID: ${r.accountId}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="total-level">${r.totalLevel || 0}</span></td>
                    <td class="hide-mobile">${Utils.formatNumber(r.totalXp || 0)}</td>
                    ${skillCells}
                    <td class="hide-mobile"><span class="badge badge-mode">${r.gameMode || 'NORMAL'}</span></td>
                    <td class="hide-mobile cell-date">${Utils.formatRelativeTime(r.lastLogin)}</td>
                    <td>
                        <div class="cell-actions">
                            <button class="cell-action-btn" title="View Details" onclick="PlayerView.open('${r.accountId}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Click handlers
        body.querySelectorAll('tr.clickable').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.cell-action-btn')) return;
                const id = row.dataset.playerId;
                if (id) PlayerView.open(id);
            });
        });
    },

    /**
     * Render hiscores pagination
     */
    renderHiscorePagination() {
        const container = document.getElementById('hiscoreSearchPagination');
        if (!container) return;

        if (this.hiscoreTotalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this._buildPaginationHtml(
            this.hiscorePage, this.hiscoreTotalPages, 'ItemSearch.goToHiscorePage'
        );
    },

    /**
     * Update hiscores info text
     */
    updateHiscoreInfo() {
        const info = document.getElementById('hiscoreSearchInfo');
        if (!info) return;

        const start = this.hiscoreTotalResults === 0 ? 0 : (this.hiscorePage - 1) * CONFIG.DEFAULT_PAGE_SIZE + 1;
        const end = Math.min(this.hiscorePage * CONFIG.DEFAULT_PAGE_SIZE, this.hiscoreTotalResults);
        info.innerHTML = `Showing <strong>${start}-${end}</strong> of <strong>${this.hiscoreTotalResults}</strong> results`;
    },

    /**
     * Go to hiscores page
     */
    goToHiscorePage(page) {
        if (page < 1 || page > this.hiscoreTotalPages || page === this.hiscorePage) return;
        this.executeHiscores(Search.hiscoreConditions, page);
    },

    // ==================== SHARED HELPERS ====================

    /**
     * Build pagination HTML (shared between item and hiscores)
     */
    _buildPaginationHtml(currentPage, totalPages, callbackName) {
        let html = '';

        html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${callbackName}(${currentPage - 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>`;

        const pages = this._getVisiblePages(currentPage, totalPages);
        pages.forEach(p => {
            if (p === '...') {
                html += '<span class="pagination-ellipsis">...</span>';
            } else {
                html += `<button class="pagination-btn page-number ${p === currentPage ? 'active' : ''}" onclick="${callbackName}(${p})">${p}</button>`;
            }
        });

        html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${callbackName}(${currentPage + 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>`;

        return html;
    },

    _getVisiblePages(current, total) {
        const pages = [];
        const maxVisible = 5;

        if (total <= maxVisible) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current > 3) pages.push('...');
            const start = Math.max(2, current - 1);
            const end = Math.min(total - 1, current + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (current < total - 2) pages.push('...');
            pages.push(total);
        }

        return pages;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemSearch;
}
