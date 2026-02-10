/**
 * Elderos — Site Lockdown Pre-render Hide
 * Loaded in <head> BEFORE page renders. Hides the document on non-homepage
 * subdomains so navbar.js can check lockdown status without a flash of content.
 * navbar.js will reveal the page after the check passes, or redirect if locked.
 *
 * Safety: auto-reveals after 4 seconds if navbar.js never calls reveal,
 * preventing permanent black screens from script load failures or errors.
 */
(function () {
    var h = location.hostname;
    if (h !== 'elderos.io' && h !== 'www.elderos.io' && h !== 'localhost') {
        document.documentElement.style.visibility = 'hidden';
        // Safety net — reveal page if navbar.js fails to do so within 4 seconds
        window.__lockdownRevealTimer = setTimeout(function () {
            document.documentElement.style.visibility = '';
        }, 4000);
    }
})();
