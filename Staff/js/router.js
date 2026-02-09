/* ============================================================
   ELDEROS STAFF PANEL - ROUTER
   ============================================================ */
console.log('[Router] Loading router.js...');

const Router = {
    currentPage: 'dashboard',
    pages: [
        'dashboard', 'players',
        'reports', 'bans', 'mutes', 'timeouts',
        'staff-logs', 'player-logs', 'chat-logs',
        'news',
        'worlds-overview', 'worlds-commands',
        'field-config', 'store-config', 'system-logs',
        'ashpire-revenue', 'ashpire-controls', 'hub-config', 'worlds-config'
    ],

    /**
     * Initialize router
     */
    init() {
        // Handle initial route from hash
        const hash = window.location.hash.slice(1);
        if (hash && this.pages.includes(hash)) {
            this.navigate(hash, false);
        }

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && this.pages.includes(hash)) {
                this.navigate(hash, false);
            }
        });

        // Listen for popstate (back/forward)
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.navigate(e.state.page, false);
            }
        });
    },

    /**
     * Navigate to a page
     */
    navigate(page, updateHistory = true) {
        // ALWAYS hide player view first (it's outside the normal page flow)
        const playerViewContainer = document.getElementById('player-view-container');
        if (playerViewContainer && !playerViewContainer.classList.contains('hidden')) {
            playerViewContainer.classList.add('hidden');
            document.body.classList.remove('player-view-edit-mode');
        }

        if (!this.pages.includes(page)) {
            console.warn(`Unknown page: ${page}`);
            return;
        }

        // Notify current page it's being left
        if (this.currentPage === 'dashboard' && typeof Widgets !== 'undefined') {
            Widgets.onPageLeave();
        }
        if (this.currentPage === 'worlds-overview' && typeof Worlds !== 'undefined') {
            Worlds.onPageLeave();
        }
        if (this.currentPage === 'worlds-commands' && typeof Commands !== 'undefined') {
            Commands.onPageLeave();
        }
        if (this.currentPage === 'staff-logs' && typeof StaffLogs !== 'undefined') {
            StaffLogs.onPageLeave();
        }
        if (this.currentPage === 'bans' && typeof Bans !== 'undefined') {
            Bans.onPageLeave();
        }
        if (this.currentPage === 'mutes' && typeof Mutes !== 'undefined') {
            Mutes.onPageLeave();
        }
        if (this.currentPage === 'timeouts' && typeof Timeouts !== 'undefined') {
            Timeouts.onPageLeave();
        }
        if (this.currentPage === 'player-logs' && typeof PlayerLogs !== 'undefined') {
            PlayerLogs.onPageLeave();
        }
        if (this.currentPage === 'chat-logs' && typeof ChatLogs !== 'undefined') {
            ChatLogs.onPageLeave();
        }
        if (this.currentPage === 'system-logs' && typeof SystemLogs !== 'undefined') {
            SystemLogs.onPageLeave();
        }
        if (this.currentPage === 'ashpire-controls' && typeof AshpireControls !== 'undefined') {
            AshpireControls.onPageLeave();
        }
        if (this.currentPage === 'store-config' && typeof StoreConfig !== 'undefined') {
            StoreConfig.onPageLeave();
        }
        if (this.currentPage === 'hub-config' && typeof HubConfig !== 'undefined') {
            HubConfig.onPageLeave();
        }
        if (this.currentPage === 'worlds-config' && typeof WorldsConfig !== 'undefined') {
            WorldsConfig.onPageLeave();
        }
        if (this.currentPage === 'ashpire-revenue' && typeof AshpireRevenue !== 'undefined') {
            AshpireRevenue.onPageLeave();
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
        });

        // Show target page
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.classList.add('animate-fade-in');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            players: 'Players',
            reports: 'Reports',
            bans: 'Ban Management',
            mutes: 'Mute Management',
            timeouts: 'Timeouts',
            'staff-logs': 'Staff Logs',
            'player-logs': 'Player Logs',
            'chat-logs': 'Chat Logs',
            news: 'News Management',
            'worlds-overview': 'Worlds Overview',
            'worlds-commands': 'Game Commands',
            'field-config': 'Field Configuration',
            'store-config': 'Store Configuration',
            'hub-config': 'Hub Configuration',
            'worlds-config': 'Worlds Configuration',
            'system-logs': 'System Logs',
            'ashpire-revenue': 'Revenue Dashboard',
            'ashpire-controls': 'Hub Controls'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;

        // Update history
        if (updateHistory) {
            window.history.pushState({ page }, '', `#${page}`);
        }

        // Fire page change event
        this.currentPage = page;
        this.onPageChange(page);
    },

    /**
     * Handle page change
     */
    onPageChange(page) {
        // Trigger page-specific initialization
        switch (page) {
            case 'dashboard':
                if (typeof Widgets !== 'undefined') {
                    Widgets.onPageLoad();
                }
                break;
            case 'players':
                Players.onPageLoad();
                break;
            case 'reports':
                // Reports.onPageLoad();
                break;
            case 'news':
                News.onPageLoad();
                break;
            case 'field-config':
                if (typeof FieldConfig !== 'undefined') {
                    FieldConfig.onPageLoad();
                }
                break;
            case 'worlds-overview':
                if (typeof Worlds !== 'undefined') { Worlds.onPageLoad(); }
                break;
            case 'worlds-commands':
                if (typeof Commands !== 'undefined') { Commands.onPageLoad(); }
                break;
            case 'staff-logs':
                if (typeof StaffLogs !== 'undefined') { StaffLogs.onPageLoad(); }
                break;
            case 'bans':
                if (typeof Bans !== 'undefined') { Bans.onPageLoad(); }
                break;
            case 'mutes':
                if (typeof Mutes !== 'undefined') { Mutes.onPageLoad(); }
                break;
            case 'timeouts':
                if (typeof Timeouts !== 'undefined') { Timeouts.onPageLoad(); }
                break;
            case 'player-logs':
                if (typeof PlayerLogs !== 'undefined') { PlayerLogs.onPageLoad(); }
                break;
            case 'chat-logs':
                if (typeof ChatLogs !== 'undefined') { ChatLogs.onPageLoad(); }
                break;
            case 'system-logs':
                if (typeof SystemLogs !== 'undefined') { SystemLogs.onPageLoad(); }
                break;
            case 'ashpire-controls':
                if (typeof AshpireControls !== 'undefined') { AshpireControls.onPageLoad(); }
                break;
            case 'store-config':
                if (typeof StoreConfig !== 'undefined') { StoreConfig.onPageLoad(); }
                break;
            case 'hub-config':
                if (typeof HubConfig !== 'undefined') { HubConfig.onPageLoad(); }
                break;
            case 'worlds-config':
                if (typeof WorldsConfig !== 'undefined') { WorldsConfig.onPageLoad(); }
                break;
            case 'ashpire-revenue':
                if (typeof AshpireRevenue !== 'undefined') { AshpireRevenue.onPageLoad(); }
                break;
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('pagechange', { detail: { page } }));
    },

    /**
     * Get current page
     */
    getCurrentPage() {
        return this.currentPage;
    },

    /**
     * Check if on specific page
     */
    isOnPage(page) {
        return this.currentPage === page;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
