/**
 * Elderos Vote Page — Configuration
 * Now bridges to the shared Auth module for token storage.
 */
const CONFIG = {
    API_BASE: Auth.API_BASE,
    TOKEN_KEY: Auth.TOKEN_KEY,
    POLL_INTERVAL: 30000,       // 30s — poll for vote status after voting
    COOLDOWN_TICK: 1000,        // 1s — cooldown timer update interval
};
