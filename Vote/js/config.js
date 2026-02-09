/**
 * Elderos Vote Page — Configuration
 */
const CONFIG = {
    API_BASE: (function() {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:')
            return 'http://localhost:8084';
        return 'https://api.elderos.io';
    })(),
    TOKEN_KEY: 'elderos_vote_token',
    POLL_INTERVAL: 30000,       // 30s — poll for vote status after voting
    COOLDOWN_TICK: 1000,        // 1s — cooldown timer update interval
};
