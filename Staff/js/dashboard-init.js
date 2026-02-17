// Initialize dashboard
(async function() {
    'use strict';
    console.log('[Dashboard] Script started');

    // Check authentication
    console.log('[Dashboard] Checking auth...');
    const isValid = await Auth.requireAuth();
    console.log('[Dashboard] Auth result:', isValid);
    if (!isValid) {
        console.log('[Dashboard] Auth failed, returning early');
        return;
    }

    // Initialize session manager (idle timeout + draft protection)
    SessionManager.init();

    // Preload item sprite data (non-blocking)
    if (typeof ItemData !== 'undefined') ItemData.load();

    // Initialize modules
    console.log('[Dashboard] Initializing modules...');
    Router.init();
    console.log('[Dashboard] Router initialized');
    Search.init();
    console.log('[Dashboard] Search initialized');
    Players.init();
    console.log('[Dashboard] Players initialized');
    Popup.init();
    console.log('[Dashboard] Popup initialized');
    PlayerView.init();
    console.log('[Dashboard] PlayerView initialized');
    News.init();
    console.log('[Dashboard] News initialized');
    FieldConfig.init();
    console.log('[Dashboard] FieldConfig initialized');
    Widgets.init();
    console.log('[Dashboard] Widgets initialized');
    Telemetry.init();
    console.log('[Dashboard] Telemetry initialized');
    Worlds.init();
    console.log('[Dashboard] Worlds initialized');
    Commands.init();
    console.log('[Dashboard] Commands initialized');
    StaffLogs.init();
    console.log('[Dashboard] StaffLogs initialized');
    Bans.init();
    console.log('[Dashboard] Bans initialized');
    Mutes.init();
    console.log('[Dashboard] Mutes initialized');
    Timeouts.init();
    console.log('[Dashboard] Timeouts initialized');
    PlayerLogs.init();
    console.log('[Dashboard] PlayerLogs initialized');
    ChatLogs.init();
    console.log('[Dashboard] ChatLogs initialized');
    SystemLogs.init();
    console.log('[Dashboard] SystemLogs initialized');
    StoreConfig.init();
    console.log('[Dashboard] StoreConfig initialized');
    AshpireRevenue.init();
    console.log('[Dashboard] AshpireRevenue initialized');
    AshpireControls.init();
    console.log('[Dashboard] AshpireControls initialized');
    HubConfig.init();
    console.log('[Dashboard] HubConfig initialized');
    VoteConfigEditor.init();
    console.log('[Dashboard] VoteConfigEditor initialized');
    WorldsConfig.init();
    console.log('[Dashboard] WorldsConfig initialized');
    Events.init();
    console.log('[Dashboard] Events initialized');
    Animations.init();
    console.log('[Dashboard] Animations initialized');

    // Generate stub pages for future phases
    generateStubPages();

    // Setup user info
    setupUserInfo();

    // Setup event listeners
    setupEventListeners();

    // Load initial dashboard via widgets
    Widgets.onPageLoad();

    function setupUserInfo() {
        const user = Auth.getUser();
        if (!user) return;

        // Username
        document.getElementById('userName').textContent = user.username;

        // Role badge
        const roleEl = document.getElementById('userRole');
        roleEl.innerHTML = Utils.getRoleBadge(user.role);

        // Rank-based pill styling
        const userPill = document.getElementById('userPill');
        if (userPill && user.role) {
            userPill.dataset.rank = user.role.toLowerCase();
        }

        // Avatar
        const avatarUrl = Auth.getAvatarUrl();
        const avatarEl = document.getElementById('userAvatar');
        const initialEl = document.getElementById('userInitial');

        if (avatarUrl) {
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = user.username;
            img.onerror = () => {
                img.remove();
                initialEl.style.display = '';
            };
            initialEl.style.display = 'none';
            avatarEl.appendChild(img);
        } else {
            initialEl.textContent = user.username.charAt(0).toUpperCase();
        }

        // News create button visibility
        if (Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_CREATE)) {
            document.getElementById('createNewsBtn').style.display = '';
        }

        // Setup sidebar navigation visibility based on permissions
        setupNavVisibility();
    }

    function generateStubPages() {
        // All stub pages now have real implementations (Phase 8)
        console.log('[Dashboard] All pages implemented');
    }

    function setupNavVisibility() {
        const user = Auth.getUser();
        if (!user) return;

        function showSection(id, condition) {
            const el = document.getElementById(id);
            if (el && condition) el.style.display = '';
        }

        function showNavItem(page, condition) {
            const el = document.querySelector(`.nav-item[data-page="${page}"]`);
            if (el) el.style.display = condition ? '' : 'none';
        }

        // Main — always visible, but gate individual items
        showNavItem('players', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_PLAYERS));

        // Moderation
        const hasMod = Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_REPORTS) ||
                       Auth.canManageBans() || Auth.canManageMutes() ||
                       Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_TIMEOUTS);
        showSection('nav-section-moderation', hasMod);
        showNavItem('reports', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_REPORTS));
        showNavItem('bans', Auth.canManageBans());
        showNavItem('mutes', Auth.canManageMutes());
        showNavItem('timeouts', Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_TIMEOUTS));

        // Logs
        const hasLogs = Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_LOGS) ||
                        Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_PLAYER_LOGS) ||
                        Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_CHAT_LOGS);
        showSection('nav-section-logs', hasLogs);
        showNavItem('staff-logs', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_LOGS));
        showNavItem('player-logs', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_PLAYER_LOGS));
        showNavItem('chat-logs', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_CHAT_LOGS));

        // Content
        const hasContent = Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_CREATE) ||
                           Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_EVENTS);
        showSection('nav-section-content', hasContent);
        showNavItem('news', Auth.hasPermission(CONFIG.PERMISSIONS.NEWS_CREATE));
        showNavItem('events', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_EVENTS));

        // Worlds
        const hasWorlds = Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_WORLDS) ||
                          Auth.hasPermission(CONFIG.PERMISSIONS.EXECUTE_COMMANDS);
        showSection('nav-section-worlds', hasWorlds);
        showNavItem('worlds-overview', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_WORLDS));
        showNavItem('worlds-commands', Auth.hasPermission(CONFIG.PERMISSIONS.EXECUTE_COMMANDS));

        // System (Developer+ role)
        const isDev = user.role === 'DEVELOPER' || user.role === 'OWNER';
        showSection('nav-section-system', isDev);
        showNavItem('store-config', Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_STORE));
        showNavItem('system-logs', Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_SYSTEM_LOGS));
        showNavItem('vote-config', isDev);
        showNavItem('hub-config', isDev);
        showNavItem('worlds-config', isDev);

        // Ashpire
        showSection('nav-section-ashpire', Auth.isAshpire());

        console.log('[Dashboard] Nav visibility configured');
    }

    function setupEventListeners() {
        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', toggleSidebar);
        document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            Auth.logout();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    Router.navigate(page);
                    closeSidebar();
                }
            });
        });
    }

    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('show');
    }

    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }

})();
