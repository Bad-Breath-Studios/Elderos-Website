/**
 * Elderos — Site Lockdown Pre-render Hide
 * Loaded in <head> BEFORE page renders. Hides the document on non-homepage
 * subdomains so navbar.js can check lockdown status without a flash of content.
 * navbar.js will reveal the page after the check passes, or redirect if locked.
 */
(function () {
    var h = location.hostname;
    if (h !== 'elderos.io' && h !== 'www.elderos.io' && h !== 'localhost') {
        document.documentElement.style.visibility = 'hidden';
    }
})();
