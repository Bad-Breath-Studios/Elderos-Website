/* ============================================================
   ELDEROS STAFF PANEL - CONFIGURATION
   ============================================================ */
console.log('[Config] Loading config.js...');

const CONFIG = {
    // API Configuration
    // Use localhost for development (including file:// protocol), production URL for deployed site
    API_BASE: (function() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        // Use localhost for: localhost, 127.0.0.1, empty hostname (file://), or file protocol
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || protocol === 'file:') {
            return 'http://localhost:8084/api/v1/staff';
        }
        return 'https://api.elderos.io/api/v1/staff';
    })(),

    // Session Configuration
    SESSION_KEY: 'elderos_staff_session',
    TOKEN_KEY: 'elderos_staff_token',

    // Timeouts
    REQUEST_TIMEOUT: 30000,
    SESSION_CHECK_INTERVAL: 60000, // 1 minute

    // Pagination
    DEFAULT_PAGE_SIZE: 30,
    MAX_PAGE_SIZE: 100,

    // Cache TTL (milliseconds)
    CACHE_TTL: {
        players: 30000,      // 30 seconds
        stats: 60000,        // 1 minute
        news: 300000,        // 5 minutes
        reports: 30000,      // 30 seconds
    },

    // Staff Roles (hierarchical order)
    ROLES: {
        OWNER: { level: 5, color: '#ef4444', label: 'Owner' },
        DEVELOPER: { level: 4, color: '#8b5cf6', label: 'Developer' },
        ADMINISTRATOR: { level: 3, color: '#3b82f6', label: 'Administrator' },
        MODERATOR: { level: 2, color: '#22c55e', label: 'Moderator' },
        SUPPORT: { level: 1, color: '#06b6d4', label: 'Support' }
    },

    // Permissions — must match backend Permission.java enum names exactly
    PERMISSIONS: {
        // View
        VIEW_PLAYERS: 'VIEW_PLAYERS',
        VIEW_PLAYER_DETAILS: 'VIEW_PLAYER_DETAILS',
        VIEW_LOGS: 'VIEW_LOGS',
        VIEW_IP: 'VIEW_IP',
        VIEW_HARDWARE_ID: 'VIEW_HARDWARE_ID',
        // Advanced search
        QUERY_PLAYERS: 'QUERY_PLAYERS',
        // Communication
        SEND_MESSAGE: 'SEND_MESSAGE',
        // Moderation
        ISSUE_WARNING: 'ISSUE_WARNING',
        MUTE_PLAYER: 'MUTE_PLAYER',
        UNMUTE_PLAYER: 'UNMUTE_PLAYER',
        KICK_PLAYER: 'KICK_PLAYER',
        TEMP_BAN: 'TEMP_BAN',
        PERM_BAN: 'PERM_BAN',
        IP_BAN: 'IP_BAN',
        UNBAN: 'UNBAN',
        // Teleportation
        TELEPORT_TO: 'TELEPORT_TO',
        TELEPORT_PLAYER: 'TELEPORT_PLAYER',
        // Reports
        VIEW_REPORTS: 'VIEW_REPORTS',
        CLAIM_REPORT: 'CLAIM_REPORT',
        RESOLVE_REPORT: 'RESOLVE_REPORT',
        DISMISS_REPORT: 'DISMISS_REPORT',
        // Notes
        VIEW_NOTES: 'VIEW_NOTES',
        ADD_NOTE: 'ADD_NOTE',
        DELETE_NOTE: 'DELETE_NOTE',
        // Data
        MODIFY_PLAYER_DATA: 'MODIFY_PLAYER_DATA',
        EDIT_CONTAINERS: 'EDIT_CONTAINERS',
        // Staff
        VIEW_STAFF: 'VIEW_STAFF',
        MANAGE_STAFF: 'MANAGE_STAFF',
        // News
        NEWS_CREATE: 'NEWS_CREATE',
        NEWS_MANAGE: 'NEWS_MANAGE',
        // Worlds (Phase 2+)
        VIEW_WORLDS: 'VIEW_WORLDS',
        MANAGE_WORLDS: 'MANAGE_WORLDS',
        // Commands (Phase 3+)
        EXECUTE_COMMANDS: 'EXECUTE_COMMANDS',
        // Granular logs (Phase 4+)
        VIEW_CHAT_LOGS: 'VIEW_CHAT_LOGS',
        VIEW_PLAYER_LOGS: 'VIEW_PLAYER_LOGS',
        VIEW_SYSTEM_LOGS: 'VIEW_SYSTEM_LOGS',
        // Store (Phase 6+)
        MANAGE_STORE: 'MANAGE_STORE',
        // Timeouts
        MANAGE_TIMEOUTS: 'MANAGE_TIMEOUTS',
        // Tags
        TAG_PLAYERS: 'TAG_PLAYERS',
        // Search utilities
        SEARCH_ITEMS: 'SEARCH_ITEMS',
        SEARCH_HISCORES: 'SEARCH_HISCORES'
    },

    // Ashpire account ID (owner account for restricted endpoints)
    ASHPIRE_ACCOUNT_ID: 1,

    // Session timeout
    SESSION_IDLE_TIMEOUT_MS: 30 * 60 * 1000,       // 30 minutes
    SESSION_WARNING_BEFORE_MS: 5 * 60 * 1000,      // 5 minutes before timeout
    SESSION_ACTIVITY_THROTTLE_MS: 10 * 1000,        // 10 seconds

    // Search Modes
    SEARCH_MODES: {
        PLAYER: { id: 'player', label: 'Player', placeholder: 'Search by username...' },
        IP: { id: 'ip', label: 'IP Address', placeholder: 'Search by IP address...' },
        MAC: { id: 'mac', label: 'MAC Address', placeholder: 'Search by MAC address...' },
        HWID: { id: 'hwid', label: 'HWID', placeholder: 'Search by hardware ID...' }
    },

    // Punishment Types
    PUNISHMENT_TYPES: {
        BAN: { id: 'BAN', label: 'Ban', color: '#ef4444', icon: 'gavel' },
        MUTE: { id: 'MUTE', label: 'Mute', color: '#f59e0b', icon: 'volume_off' },
        KICK: { id: 'KICK', label: 'Kick', color: '#3b82f6', icon: 'logout' },
        WARN: { id: 'WARN', label: 'Warning', color: '#8b5cf6', icon: 'warning' },
        JAIL: { id: 'JAIL', label: 'Jail', color: '#6b7280', icon: 'lock' }
    },

    // Duration Presets (in minutes)
    DURATION_PRESETS: [
        { label: '1 Hour', value: 60 },
        { label: '6 Hours', value: 360 },
        { label: '12 Hours', value: 720 },
        { label: '1 Day', value: 1440 },
        { label: '3 Days', value: 4320 },
        { label: '7 Days', value: 10080 },
        { label: '14 Days', value: 20160 },
        { label: '30 Days', value: 43200 },
        { label: 'Permanent', value: -1 }
    ],

    // Discord CDN
    DISCORD_CDN: 'https://cdn.discordapp.com',
    DISCORD_AVATAR_SIZE: 64,

    // Animation Durations (for JS animations)
    ANIMATION: {
        fast: 150,
        base: 200,
        slow: 300,
        modal: 250
    }
};

// Debug log for development
console.log('[CONFIG] API_BASE:', CONFIG.API_BASE);
console.log('[CONFIG] Location:', window.location.href);

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.ROLES);
Object.freeze(CONFIG.PERMISSIONS);
Object.freeze(CONFIG.SEARCH_MODES);
Object.freeze(CONFIG.PUNISHMENT_TYPES);
Object.freeze(CONFIG.DURATION_PRESETS);
Object.freeze(CONFIG.CACHE_TTL);
Object.freeze(CONFIG.ANIMATION);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
