/**
 * Elderos — Shared Navbar
 * Self-initializing navbar component. Finds #navbar and injects full HTML.
 * Requires: shared/auth.js to be loaded first.
 */
(function () {
    'use strict';

    // Detect active page from hostname + path
    function getActivePage() {
        const host = window.location.hostname;
        const path = window.location.pathname;
        if (host.includes('hiscores')) return 'hiscores';
        if (host.includes('vote')) return 'vote';
        if (host.includes('play')) return 'play';
        if (host.includes('staff')) return 'staff';
        // Home page or content pages under /pages/
        if (path === '/' || path === '/index.html' || path.startsWith('/pages/')) return 'home';
        return 'home';
    }

    function activeClass(page) {
        return getActivePage() === page ? ' active' : '';
    }

    function buildNavHTML() {
        const page = getActivePage();
        const isLoggedIn = typeof Auth !== 'undefined' && Auth.isLoggedIn();
        const user = isLoggedIn ? Auth.getUser() : null;
        const username = isLoggedIn ? Auth.getUsername() : null;
        const initial = username ? username.charAt(0).toUpperCase() : '?';

        // Auth section for desktop
        let authHTML = '';
        if (isLoggedIn) {
            authHTML = `
                <div class="nav-auth">
                    <button class="nav-user-btn" id="nav-user-btn">
                        <div class="nav-avatar">${initial}</div>
                        <span class="nav-username">${username || 'Player'}</span>
                        <svg class="nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="nav-dropdown" id="nav-dropdown">
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
                        <div class="nav-avatar">${initial}</div>
                        <span class="nav-mobile-user-name">${username || 'Player'}</span>
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
                <div class="nav-left">
                    <a href="https://elderos.io#features" class="nav-link${activeClass('features')}">Features</a>
                    <a href="https://wiki.elderos.io" class="nav-link" target="_blank">Wiki</a>
                    <a href="https://hiscores.elderos.io" class="nav-link${activeClass('hiscores')}">Hiscores</a>
                    <a href="https://vote.elderos.io" class="nav-link${activeClass('vote')}">Vote</a>
                </div>

                <div class="nav-center">
                    <a href="https://elderos.io" class="nav-logo">
                        <img src="/assets/logo.png" alt="Elderos" class="nav-logo-img">
                    </a>
                </div>

                <div class="nav-right">
                    <a href="https://discord.gg/MwkvVMFmfg" class="nav-link" target="_blank">Discord</a>
                    <a href="https://play.elderos.io" class="nav-cta${activeClass('play')}">Play Now</a>
                    ${authHTML}
                </div>

                <button class="nav-hamburger" id="nav-hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>

            <div class="nav-mobile-menu" id="nav-mobile-menu">
                <a href="https://elderos.io#features" class="nav-link">Features</a>
                <a href="https://wiki.elderos.io" class="nav-link" target="_blank">Wiki</a>
                <a href="https://hiscores.elderos.io" class="nav-link${activeClass('hiscores')}">Hiscores</a>
                <a href="https://vote.elderos.io" class="nav-link${activeClass('vote')}">Vote</a>
                <a href="https://discord.gg/MwkvVMFmfg" class="nav-link" target="_blank">Discord</a>
                <a href="https://play.elderos.io" class="nav-cta${activeClass('play')}">Play Now</a>
                ${mobileAuthHTML}
            </div>

            <!-- Login Modal -->
            <div class="nav-login-modal" id="nav-login-modal">
                <div class="nav-login-card">
                    <button class="nav-login-close" id="nav-login-close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>

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

    function init() {
        const container = document.getElementById('navbar');
        if (!container) return;

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
        const openLogin = () => { if (loginModal) loginModal.classList.add('active'); };
        const closeLogin = () => {
            if (loginModal) loginModal.classList.remove('active');
            resetLoginForm();
        };

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
