/**
 * Elderos Vote Page — Authentication Bridge
 * Delegates to the shared Auth module (loaded from /shared/auth.js).
 * Adds `isAuthenticated()` alias expected by vote.js.
 */
if (typeof Auth !== 'undefined' && !Auth.isAuthenticated) {
    Auth.isAuthenticated = Auth.isLoggedIn;
}
