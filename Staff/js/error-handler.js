// Global error handler to catch any JS errors
window.onerror = function(msg, url, line, col, error) {
    console.error('[GLOBAL ERROR]', msg, 'at', url, 'line', line, error);
    return false;
};
window.addEventListener('unhandledrejection', function(event) {
    console.error('[UNHANDLED PROMISE REJECTION]', event.reason);
});

// Graceful image fallback for sidebar logo (CSP blocks inline onerror)
document.addEventListener('DOMContentLoaded', function() {
    var logo = document.getElementById('sidebarLogo');
    if (logo) {
        logo.onerror = function() {
            logo.style.display = 'none';
            logo.parentElement.innerHTML = '<span style="color: var(--accent); font-size: 24px; font-weight: 700;">ELDEROS</span>';
        };
    }
});

console.log('[Boot] Error handlers registered');
