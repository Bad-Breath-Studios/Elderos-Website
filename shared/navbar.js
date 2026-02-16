/**
 * Elderos — Shared Navbar
 * Self-initializing navbar component. Finds #navbar and injects full HTML.
 * Requires: shared/auth.js to be loaded first.
 */
(function () {
    'use strict';

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function validateDiscordId(id) {
        return typeof id === 'string' && /^\d{17,20}$/.test(id);
    }

    function validateAvatarHash(hash) {
        return typeof hash === 'string' && /^(a_)?[0-9a-f]{32}$/.test(hash);
    }

    // Detect active page from hostname + path
    function getActivePage() {
        const host = window.location.hostname;
        const path = window.location.pathname;
        if (host.includes('creators')) return 'creators';
        if (host.includes('adventurers')) return 'adventurers';
        if (host.includes('hiscores')) return 'hiscores';
        if (host.includes('vote')) return 'vote';
        if (host.includes('play')) return 'play';
        if (host.includes('staff')) return 'staff';
        if (host.includes('news')) return 'news';
        // Home page or content pages under /pages/
        if (path === '/' || path === '/index.html' || path.startsWith('/pages/')) return 'home';
        return 'home';
    }

    function activeClass(page) {
        return getActivePage() === page ? ' active' : '';
    }

    function getAvatarHTML(user, username, size) {
        const initial = escapeHtml(username ? username.charAt(0).toUpperCase() : '?');
        if (user && validateDiscordId(user.discordId) && validateAvatarHash(user.discordAvatarHash)) {
            const url = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatarHash}.png?size=${size || 64}`;
            return `<img class="nav-avatar nav-avatar-img" src="${url}" alt="${initial}" onerror="this.outerHTML='<div class=\\'nav-avatar\\'>${initial}</div>'">`;
        }
        return `<div class="nav-avatar">${initial}</div>`;
    }

    function buildNavHTML() {
        const page = getActivePage();
        const isLoggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();
        const user = isLoggedIn ? Auth.getUser() : null;
        const username = isLoggedIn ? Auth.getUsername() : null;

        // Auth section for desktop
        let authHTML = '';
        if (isLoggedIn) {
            authHTML = `
                <div class="nav-auth">
                    <button class="nav-user-btn" id="nav-user-btn">
                        ${getAvatarHTML(user, username, 64)}
                        <span class="nav-username">${escapeHtml(username) || 'Player'}</span>
                        <svg class="nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="nav-dropdown" id="nav-dropdown">
                        <a href="https://adventurers.elderos.io/${encodeURIComponent(username || '')}" class="nav-dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
                            My Profile
                        </a>
                        <a href="https://hiscores.elderos.io?player=${encodeURIComponent(username || '')}" class="nav-dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                            My Hiscores
                        </a>
                        <a href="https://vote.elderos.io" class="nav-dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Vote Status
                        </a>
                        <div class="nav-dropdown-divider"></div>
                        <button class="nav-dropdown-item logout" id="nav-logout-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Log Out
                        </button>
                    </div>
                </div>`;
        } else {
            authHTML = `
                <div class="nav-auth">
                    <button class="nav-login-link" id="nav-login-link">Log In</button>
                </div>`;
        }

        // Mobile auth section
        let mobileAuthHTML = '';
        if (isLoggedIn) {
            mobileAuthHTML = `
                <div class="nav-mobile-auth">
                    <div class="nav-mobile-user">
                        ${getAvatarHTML(user, username, 48)}
                        <span class="nav-mobile-user-name">${escapeHtml(username) || 'Player'}</span>
                    </div>
                    <button class="nav-mobile-logout" id="nav-mobile-logout">Log Out</button>
                </div>`;
        } else {
            mobileAuthHTML = `
                <div class="nav-mobile-auth">
                    <button class="nav-login-link" id="nav-mobile-login">Log In</button>
                </div>`;
        }

        return `
            <nav class="shared-nav" id="shared-nav">
                <div class="nav-group">
                    <div class="nav-left">
                        <a href="https://wiki.elderos.io" class="nav-link" target="_blank" rel="noopener noreferrer">Wiki</a>
                        <a href="https://hiscores.elderos.io" class="nav-link${activeClass('hiscores')}">Hiscores</a>
                        <a href="https://news.elderos.io" class="nav-link${activeClass('news')}">News</a>
                    </div>

                    <div class="nav-center">
                        <a href="https://elderos.io" class="nav-logo">
                            <img src="/assets/logo.png" alt="Elderos" class="nav-logo-img">
                        </a>
                        <div class="nav-logo-glow"></div>
                    </div>

                    <div class="nav-right-links">
                        <a href="https://adventurers.elderos.io" class="nav-link${activeClass('adventurers')}">Adventurers</a>
                        <a href="https://creators.elderos.io" class="nav-link${activeClass('creators')}">Creators</a>
                        <a href="https://vote.elderos.io" class="nav-link${activeClass('vote')}">Vote</a>
                        <a href="https://discord.gg/MwkvVMFmfg" class="nav-link" target="_blank" rel="noopener noreferrer">Discord</a>
                    </div>
                </div>

                ${authHTML}

                <button class="nav-hamburger" id="nav-hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>

            <div class="nav-mobile-menu" id="nav-mobile-menu">
                <a href="https://wiki.elderos.io" class="nav-link" target="_blank" rel="noopener noreferrer">Wiki</a>
                <a href="https://hiscores.elderos.io" class="nav-link${activeClass('hiscores')}">Hiscores</a>
                <a href="https://adventurers.elderos.io" class="nav-link${activeClass('adventurers')}">Adventurers</a>
                <a href="https://creators.elderos.io" class="nav-link${activeClass('creators')}">Creators</a>
                <a href="https://news.elderos.io" class="nav-link${activeClass('news')}">News</a>
                <a href="https://vote.elderos.io" class="nav-link${activeClass('vote')}">Vote</a>
                <a href="https://discord.gg/MwkvVMFmfg" class="nav-link" target="_blank" rel="noopener noreferrer">Discord</a>
                ${mobileAuthHTML}
            </div>

            <!-- Login Modal -->
            <div class="nav-login-modal" id="nav-login-modal">
                <div class="nav-login-card">
                    <button class="nav-login-close" id="nav-login-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>

                    <!-- Launcher Auth Card (hidden by default, shown if launcher detected) -->
                    <div id="nav-launcher-auth" style="display:none">
                        <button class="launcher-auth-card" id="nav-launcher-btn">
                            <div class="launcher-auth-avatar" id="nav-launcher-avatar"></div>
                            <div class="launcher-auth-info">
                                <div class="launcher-auth-name" id="nav-launcher-name">Player</div>
                                <div class="launcher-auth-hint">Log in via your launcher</div>
                            </div>
                            <svg class="launcher-auth-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <div class="nav-login-error" id="nav-launcher-error" style="display:none"></div>
                        <div class="launcher-auth-divider">
                            <span>or log in manually</span>
                        </div>
                    </div>

                    <!-- Step 1: Credentials -->
                    <div id="nav-login-step-creds">
                        <h2>Log In</h2>
                        <p class="login-sub">Use your Elderos game account</p>
                        <form id="nav-login-form">
                            <input type="text" class="nav-login-field" id="nav-login-username" placeholder="Username" autocomplete="username">
                            <input type="password" class="nav-login-field" id="nav-login-password" placeholder="Password" autocomplete="current-password">
                            <button type="submit" class="nav-login-btn" id="nav-login-submit">Log In</button>
                            <div class="nav-login-error" id="nav-login-error"></div>
                        </form>
                        <p class="nav-login-note">Don't have an account? <a href="https://play.elderos.io">Download the launcher</a> to create one.</p>
                    </div>

                    <!-- Step 2: 2FA -->
                    <div id="nav-login-step-2fa" style="display:none">
                        <h2>Two-Factor Auth</h2>
                        <p class="login-sub">Enter the 6-digit code from your authenticator app</p>
                        <form id="nav-2fa-form">
                            <div class="nav-2fa-inputs">
                                <input type="text" maxlength="1" class="nav-2fa-digit" data-index="0" inputmode="numeric" autocomplete="one-time-code">
                                <input type="text" maxlength="1" class="nav-2fa-digit" data-index="1" inputmode="numeric">
                                <input type="text" maxlength="1" class="nav-2fa-digit" data-index="2" inputmode="numeric">
                                <input type="text" maxlength="1" class="nav-2fa-digit" data-index="3" inputmode="numeric">
                                <input type="text" maxlength="1" class="nav-2fa-digit" data-index="4" inputmode="numeric">
                                <input type="text" maxlength="1" class="nav-2fa-digit" data-index="5" inputmode="numeric">
                            </div>
                            <button type="submit" class="nav-login-btn" id="nav-2fa-submit">Verify</button>
                            <div class="nav-login-error" id="nav-2fa-error"></div>
                        </form>
                        <button class="nav-login-back" id="nav-2fa-back">Back to login</button>
                    </div>
                </div>
            </div>`;
    }

    // === Launcher Auth Bridge ===

    let _launcherStatus = null;

    async function checkLauncher() {
        try {
            const res = await fetch('http://localhost:47015/status', {
                signal: AbortSignal.timeout(2000)
            });
            const data = await res.json();
            if (data.running && data.loggedIn && data.username) {
                _launcherStatus = data;
                return data;
            }
        } catch (e) {
            // Silent fail — launcher not running
        }
        _launcherStatus = null;
        return null;
    }

    function showLauncherCard(status) {
        const card = document.getElementById('nav-launcher-auth');
        if (!card) return;

        const nameEl = document.getElementById('nav-launcher-name');
        const avatarEl = document.getElementById('nav-launcher-avatar');

        if (nameEl) nameEl.textContent = 'Continue as ' + status.username;
        if (avatarEl) {
            const initial = status.username.charAt(0).toUpperCase();
            avatarEl.textContent = initial;
        }

        card.style.display = '';
    }

    function hideLauncherCard() {
        const card = document.getElementById('nav-launcher-auth');
        if (card) card.style.display = 'none';
    }

    async function handleLauncherAuth() {
        const btn = document.getElementById('nav-launcher-btn');
        const errorEl = document.getElementById('nav-launcher-error');
        if (!btn) return;

        // Disable and show loading
        btn.disabled = true;
        btn.classList.add('loading');
        hideError(errorEl);

        try {
            // Request auth code from launcher (user may take time to approve)
            const codeRes = await fetch('http://localhost:47015/auth/request', {
                method: 'POST',
                signal: AbortSignal.timeout(35000) // 35s — launcher has 30s approval timeout
            });
            const codeData = await codeRes.json();

            if (!codeData.success) {
                const msg = codeData.error === 'user_declined' ? 'Login declined in launcher.'
                    : codeData.error === 'timeout' ? 'Request timed out. Please try again.'
                    : codeData.error === 'not_logged_in' ? 'Not logged in to launcher.'
                    : 'Failed to complete login.';
                showError(errorEl, msg);
                return;
            }

            // Exchange code for JWT via Hub API
            const API_BASE = (typeof Auth !== 'undefined') ? Auth.API_BASE : 'https://api.elderos.io';
            const exchangeRes = await fetch(`${API_BASE}/api/auth/launcher-exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeData.code })
            });
            const exchangeData = await exchangeRes.json();

            if (!exchangeData.success || !exchangeData.token) {
                showError(errorEl, exchangeData.message || 'Failed to complete login.');
                return;
            }

            // Store login and reload
            Auth.storeLogin(exchangeData.token, exchangeData.account);
            window.location.reload();

        } catch (e) {
            if (e.name === 'TimeoutError') {
                showError(errorEl, 'Request timed out. Please try again.');
            } else {
                showError(errorEl, 'Failed to connect to launcher.');
            }
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    }

    function revealPage() {
        // Clear the safety timer from lockdown-check.js
        if (window.__lockdownRevealTimer) {
            clearTimeout(window.__lockdownRevealTimer);
            window.__lockdownRevealTimer = null;
        }
        document.documentElement.style.visibility = '';
    }

    async function init() {
        const container = document.getElementById('navbar');
        if (!container) {
            revealPage();
            return;
        }

        // Site lockdown — redirect non-homepage subdomains
        const host = window.location.hostname;
        const isHomepage = (host === 'elderos.io' || host === 'www.elderos.io' || host === 'localhost');
        if (!isHomepage) {
            try {
                const resp = await fetch('https://api.elderos.io/api/v1/public/site-status');
                const data = await resp.json();
                if (data.lockdown) {
                    // Check if admin bypass is enabled and user qualifies
                    let canBypass = false;
                    if (data.adminBypass && typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
                        const user = Auth.getUser();
                        const bypassRoles = ['ADMINISTRATOR', 'DEVELOPER', 'OWNER'];
                        if (user && user.staffRole && bypassRoles.includes(user.staffRole)) {
                            canBypass = true;
                        }
                    }
                    if (!canBypass) {
                        window.location.href = 'https://elderos.io';
                        return;
                    }
                }
            } catch (e) { /* API unreachable — don't block */ }
        }

        // Reveal page after lockdown check passes (lockdown-check.js hides it in <head>)
        revealPage();

        container.innerHTML = buildNavHTML();

        // Scroll effect
        const nav = document.getElementById('shared-nav');
        if (nav) {
            window.addEventListener('scroll', () => {
                nav.classList.toggle('scrolled', window.scrollY > 40);
            });
        }

        // Mobile hamburger toggle
        const hamburger = document.getElementById('nav-hamburger');
        const mobileMenu = document.getElementById('nav-mobile-menu');
        if (hamburger && mobileMenu) {
            hamburger.addEventListener('click', () => {
                const isOpen = mobileMenu.classList.contains('open');
                if (isOpen) {
                    mobileMenu.style.opacity = '0';
                    mobileMenu.style.transform = 'translateY(-10px)';
                    setTimeout(() => mobileMenu.classList.remove('open'), 300);
                } else {
                    mobileMenu.classList.add('open');
                    requestAnimationFrame(() => {
                        mobileMenu.style.opacity = '1';
                        mobileMenu.style.transform = 'translateY(0)';
                    });
                }
                hamburger.classList.toggle('active');
            });
        }

        // Desktop user dropdown
        const userBtn = document.getElementById('nav-user-btn');
        const dropdown = document.getElementById('nav-dropdown');
        if (userBtn && dropdown) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('open');
                dropdown.classList.toggle('open');
                userBtn.classList.toggle('open');
            });
            document.addEventListener('click', () => {
                dropdown.classList.remove('open');
                userBtn.classList.remove('open');
            });
        }

        // Logout buttons
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

        const mobileLogout = document.getElementById('nav-mobile-logout');
        if (mobileLogout) mobileLogout.addEventListener('click', () => Auth.logout());

        // Login modal open/close
        const loginModal = document.getElementById('nav-login-modal');
        const openLogin = () => {
            if (loginModal) loginModal.classList.add('active');
            // Check for launcher in background
            hideLauncherCard();
            checkLauncher().then(status => {
                if (status) showLauncherCard(status);
            });
        };
        const closeLogin = () => {
            if (loginModal) loginModal.classList.remove('active');
            resetLoginForm();
            hideLauncherCard();
        };

        // Launcher auth button
        const launcherBtn = document.getElementById('nav-launcher-btn');
        if (launcherBtn) launcherBtn.addEventListener('click', handleLauncherAuth);

        const loginLink = document.getElementById('nav-login-link');
        if (loginLink) loginLink.addEventListener('click', openLogin);

        const mobileLogin = document.getElementById('nav-mobile-login');
        if (mobileLogin) mobileLogin.addEventListener('click', openLogin);

        const closeBtn = document.getElementById('nav-login-close');
        if (closeBtn) closeBtn.addEventListener('click', closeLogin);

        if (loginModal) {
            loginModal.addEventListener('click', (e) => {
                if (e.target === loginModal) closeLogin();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && loginModal && loginModal.classList.contains('active')) {
                closeLogin();
            }
        });

        // Login form submission
        const loginForm = document.getElementById('nav-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('nav-login-username').value.trim();
                const password = document.getElementById('nav-login-password').value;
                const submitBtn = document.getElementById('nav-login-submit');
                const errorEl = document.getElementById('nav-login-error');

                if (!username || !password) {
                    showError(errorEl, 'Please enter your username and password.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';
                hideError(errorEl);

                try {
                    const result = await Auth.login(username, password);
                    if (result.success) {
                        window.location.reload();
                        return;
                    }
                    if (result.requires2FA) {
                        show2FAStep();
                        return;
                    }
                    showError(errorEl, result.message);
                } catch (err) {
                    showError(errorEl, 'Connection failed. Please try again.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Log In';
                }
            });
        }

        // 2FA form
        const tfaForm = document.getElementById('nav-2fa-form');
        if (tfaForm) {
            // Auto-advance digit inputs
            const digits = tfaForm.querySelectorAll('.nav-2fa-digit');
            digits.forEach((input, i) => {
                input.addEventListener('input', (e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    e.target.value = val;
                    if (val && i < digits.length - 1) digits[i + 1].focus();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && i > 0) {
                        digits[i - 1].focus();
                    }
                });
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
                    for (let j = 0; j < paste.length; j++) {
                        if (digits[j]) digits[j].value = paste[j];
                    }
                    if (digits[Math.min(paste.length, 5)]) digits[Math.min(paste.length, 5)].focus();
                });
            });

            tfaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = Array.from(digits).map(d => d.value).join('');
                const submitBtn = document.getElementById('nav-2fa-submit');
                const errorEl = document.getElementById('nav-2fa-error');

                if (code.length !== 6) {
                    showError(errorEl, 'Please enter all 6 digits.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Verifying...';
                hideError(errorEl);

                try {
                    const result = await Auth.verify2FA(code);
                    if (result.success) {
                        window.location.reload();
                        return;
                    }
                    showError(errorEl, result.message);
                    digits.forEach(d => d.value = '');
                    digits[0].focus();
                } catch (err) {
                    showError(errorEl, 'Connection failed. Please try again.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Verify';
                }
            });
        }

        // 2FA back button
        const tfaBack = document.getElementById('nav-2fa-back');
        if (tfaBack) {
            tfaBack.addEventListener('click', () => {
                Auth.reset2FA();
                showCredsStep();
            });
        }
    }

    function show2FAStep() {
        const creds = document.getElementById('nav-login-step-creds');
        const tfa = document.getElementById('nav-login-step-2fa');
        if (creds) creds.style.display = 'none';
        if (tfa) {
            tfa.style.display = 'block';
            const firstDigit = tfa.querySelector('.nav-2fa-digit');
            if (firstDigit) firstDigit.focus();
        }
    }

    function showCredsStep() {
        const creds = document.getElementById('nav-login-step-creds');
        const tfa = document.getElementById('nav-login-step-2fa');
        if (tfa) tfa.style.display = 'none';
        if (creds) creds.style.display = 'block';
    }

    function resetLoginForm() {
        showCredsStep();
        const fields = ['nav-login-username', 'nav-login-password'];
        fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const digits = document.querySelectorAll('.nav-2fa-digit');
        digits.forEach(d => d.value = '');
        hideError(document.getElementById('nav-login-error'));
        hideError(document.getElementById('nav-2fa-error'));
        Auth.reset2FA();
    }

    function showError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    function hideError(el) {
        if (!el) return;
        el.style.display = 'none';
        el.textContent = '';
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
