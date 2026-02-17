/**
 * Elderos — Shared Footer
 * Self-initializing footer component. Finds #footer and injects full HTML.
 */
(function () {
    'use strict';

    function buildFooterHTML() {
        return `
        <div class="shared-footer">
            <div class="footer-fade"></div>
            <div class="footer-body">
                <div class="footer-accent-line"></div>

                <!-- Brand Bar -->
                <div class="footer-brand">
                    <div class="footer-brand-left">
                        <img src="/assets/logo.png" alt="Elderos" class="footer-brand-logo">
                        <div class="footer-brand-text">
                            <span class="footer-brand-name">ELDEROS</span>
                            <span class="footer-brand-tagline">OSRS Done Right</span>
                        </div>
                    </div>
                    <div class="footer-socials">
                        <a href="https://discord.gg/MwkvVMFmfg" class="footer-social-icon" target="_blank" aria-label="Discord">
                            <img src="/assets/discord-icon.png" alt="Discord">
                        </a>
                        <a href="https://www.youtube.com/@Elderos-PS" rel="noopener noreferrer" class="footer-social-icon" target="_blank" aria-label="YouTube">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </a>
                    </div>
                </div>

                <!-- Link Columns -->
                <div class="footer-columns">
                    <div class="footer-col">
                        <div class="footer-col-title">Play</div>
                        <a href="https://play.elderos.io">Download Launcher</a>
                        <a href="https://elderos.io/pages/getting-started.html">Getting Started</a>
                        <a href="https://wiki.elderos.io" target="_blank">Wiki</a>
                    </div>
                    <div class="footer-col">
                        <div class="footer-col-title">Community</div>
                        <a href="https://discord.gg/MwkvVMFmfg" target="_blank">Discord</a>
                        <a href="https://hiscores.elderos.io">Hiscores</a>
                        <a href="https://vote.elderos.io">Vote</a>
                    </div>
                    <div class="footer-col">
                        <div class="footer-col-title">Support</div>
                        <a href="https://elderos.io/pages/faq.html">FAQ</a>
                        <a href="https://elderos.io/pages/contact.html">Contact Us</a>
                    </div>
                    <div class="footer-col">
                        <div class="footer-col-title">About</div>
                        <a href="https://elderos.io/pages/about.html">Our Story</a>
                        <a href="https://elderos.io/pages/affiliate.html">Affiliate Program</a>
                    </div>
                </div>

                <!-- Copyright Bar -->
                <div class="footer-copyright">
                    <span class="footer-copyright-text">ELDEROS &middot; &copy; 2026 Elderos</span>
                    <div class="footer-legal-links">
                        <a href="https://elderos.io/pages/terms.html">Terms</a>
                        <a href="https://elderos.io/pages/privacy.html">Privacy</a>
                        <a href="https://elderos.io/pages/refund.html">Refund Policy</a>
                        <a href="https://elderos.io/pages/cookies.html">Cookies</a>
                    </div>
                </div>

                <!-- Jagex Disclaimer -->
                <div class="footer-disclaimer">
                    Elderos is a fan-made project and is not affiliated with, endorsed by, or associated with Jagex Ltd. Old School RuneScape and RuneScape are trademarks of Jagex Ltd. All game assets and imagery are the property of their respective owners.
                </div>
            </div>
        </div>`;
    }

    function init() {
        const container = document.getElementById('footer');
        if (!container) return;
        container.innerHTML = buildFooterHTML();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
