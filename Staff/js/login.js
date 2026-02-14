// ==================== LOGIN PAGE LOGIC ====================

(function() {
    'use strict';

    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // State
    let currentStep = 1;
    let currentUsername = null;
    let particleInterval = null;
    let rememberCredentialsValue = false;
    let remember2faValue = false;
    let rememberedState = null;

    // Elements
    const steps = {
        1: document.getElementById('step1'),
        2: document.getElementById('step2'),
        3: document.getElementById('step3')
    };

    const stepDots = document.querySelectorAll('.step-dot');
    const stepLines = document.querySelectorAll('.step-line');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Loading overlay elements
    const loadingOverlay = document.getElementById('authLoadingOverlay');
    const loadingContent = document.getElementById('authLoadingContent');
    const successContainer = document.getElementById('authSuccessContainer');
    const stageText = document.getElementById('authStageText');
    const particlesContainer = document.getElementById('authParticles');
    const successSubtext = document.getElementById('authSuccessSubtext');
    const stageDots = [
        document.getElementById('stageDot1'),
        document.getElementById('stageDot2'),
        document.getElementById('stageDot3'),
        document.getElementById('stageDot4')
    ];
    const stageLines = [
        document.getElementById('stageLine1'),
        document.getElementById('stageLine2'),
        document.getElementById('stageLine3')
    ];

    // Progress bar elements (for reduced motion)
    const progressFill = document.getElementById('authProgressFill');
    const progressText = document.getElementById('authProgressText');
    const progressStep = document.getElementById('authProgressStep');

    // Forms
    const credentialsForm = document.getElementById('credentialsForm');
    const twoFactorForm = document.getElementById('twoFactorForm');
    const sessionKeyForm = document.getElementById('sessionKeyForm');

    // Inputs
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const codeInputs = document.querySelectorAll('.code-input');
    const sessionKeyInput = document.getElementById('sessionKey');

    // Buttons
    const loginBtn = document.getElementById('loginBtn');
    const verifyBtn = document.getElementById('verifyBtn');
    const sessionKeyBtn = document.getElementById('sessionKeyBtn');
    const passwordToggle = document.getElementById('passwordToggle');
    const backToStep1 = document.getElementById('backToStep1');
    const backToStep2 = document.getElementById('backToStep2');

    // Stage messages
    const stageMessages = [
        'Verifying credentials...',
        'Validating 2FA...',
        'Checking session key...',
        'Establishing connection...'
    ];

    // ==================== LOADING OVERLAY ====================

    function showLoadingOverlay(initialStage = 0) {
        // Reset state
        loadingContent.style.display = 'flex';
        successContainer.classList.remove('active');

        // Apply reduced motion class if user prefers it
        if (prefersReducedMotion) {
            loadingOverlay.classList.add('reduced-motion');
            updateProgressBar(initialStage, 4); // 4 total stages
        } else {
            loadingOverlay.classList.remove('reduced-motion');
        }

        // Reset all stage dots and lines
        stageDots.forEach((dot, i) => {
            dot.classList.remove('active', 'completed', 'pulse');
            if (i === 0) dot.classList.add('active', 'pulse');
        });
        stageLines.forEach(line => line.classList.remove('completed'));

        // Set initial stage text
        stageText.textContent = stageMessages[initialStage] || 'Authenticating...';

        // Show overlay
        loadingOverlay.classList.add('active');

        // Start particles (only if not reduced motion)
        if (!prefersReducedMotion) {
            startParticles();
        }
    }

    function updateProgressBar(currentStage, totalStages) {
        if (!progressFill || !progressText || !progressStep) return;

        // Calculate percentage (add 1 to currentStage since we want to show progress into that stage)
        const percentage = Math.min(((currentStage + 1) / totalStages) * 100, 100);
        progressFill.style.width = percentage + '%';

        // Update text based on stage
        const messages = [
            'Verifying credentials...',
            'Validating 2FA...',
            'Checking session key...',
            'Establishing connection...'
        ];
        progressText.textContent = messages[currentStage] || 'Authenticating...';
        progressStep.textContent = `Step ${currentStage + 1} of ${totalStages}`;
    }

    function hideLoadingOverlay() {
        loadingOverlay.classList.remove('active');
        stopParticles();

        // Reset state after animation
        setTimeout(() => {
            loadingContent.style.display = 'flex';
            successContainer.classList.remove('active');
            stageDots.forEach(dot => dot.classList.remove('active', 'completed', 'pulse'));
            stageLines.forEach(line => line.classList.remove('completed'));

            // Reset progress bar
            if (progressFill) progressFill.style.width = '0%';
            if (progressText) progressText.textContent = 'Authenticating...';
            if (progressStep) progressStep.textContent = 'Step 1 of 4';
        }, 300);
    }

    function updateLoadingStage(stageIndex, completed = false) {
        // Update progress bar for reduced motion users
        if (prefersReducedMotion) {
            updateProgressBar(stageIndex, 4);
        }

        // Update stage text
        if (stageIndex < stageMessages.length) {
            stageText.textContent = stageMessages[stageIndex];
        }

        stageDots.forEach((dot, i) => {
            dot.classList.remove('active', 'completed', 'pulse');

            if (i < stageIndex) {
                dot.classList.add('completed');
            } else if (i === stageIndex) {
                dot.classList.add('active', 'pulse');
            }
        });

        stageLines.forEach((line, i) => {
            line.classList.toggle('completed', i < stageIndex);
        });
    }

    function showLoadingSuccess(username) {
        // Complete progress bar for reduced motion users
        if (prefersReducedMotion) {
            progressFill.style.width = '100%';
            progressText.textContent = 'Authentication complete!';
            progressStep.textContent = `Welcome back, ${username}!`;
        }

        // Complete all stages
        stageDots.forEach(dot => {
            dot.classList.remove('active', 'pulse');
            dot.classList.add('completed');
        });
        stageLines.forEach(line => line.classList.add('completed'));

        stageText.textContent = 'Authentication complete!';

        // Show success after brief delay
        setTimeout(() => {
            loadingContent.style.display = 'none';
            successSubtext.textContent = `Welcome back, ${username}!`;
            successContainer.classList.add('active');

            // Redirect after success animation
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        }, 500);
    }

    // ==================== PARTICLES ====================

    function startParticles() {
        // Clear existing particles
        particlesContainer.innerHTML = '';

        // Create initial particles
        for (let i = 0; i < 20; i++) {
            createParticle();
        }

        // Continue creating particles
        particleInterval = setInterval(() => {
            if (particlesContainer.children.length < 30) {
                createParticle();
            }
        }, 300);
    }

    function stopParticles() {
        if (particleInterval) {
            clearInterval(particleInterval);
            particleInterval = null;
        }
    }

    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'auth-particle';

        // Random position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';

        // Random size
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        // Random animation duration and delay
        particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
        particle.style.animationDelay = Math.random() * 2 + 's';

        particlesContainer.appendChild(particle);

        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, 5000);
    }

    // ==================== INITIALIZATION ====================

    async function init() {
        // Check if already authenticated
        if (Auth.isAuthenticated()) {
            Auth.validateSession().then(valid => {
                if (valid) {
                    window.location.href = 'dashboard.html';
                }
            });
            return;
        }

        setupEventListeners();

        // Check for remembered device
        try {
            rememberedState = await Auth.checkRemembered();
            if (rememberedState.remembered) {
                // Pre-fill username if remembered
                if (rememberedState.username) {
                    usernameInput.value = rememberedState.username;
                }
                // Check the remember checkbox if credentials are remembered
                if (rememberedState.rememberCredentials) {
                    document.getElementById('rememberCredentials').checked = true;
                }
                // If both credentials AND 2fa are remembered, show a hint
                if (rememberedState.rememberCredentials && rememberedState.remember2fa) {
                    // Just focus password - user still needs to enter it or use remembered flow
                    passwordInput.focus();
                }
            }
        } catch (e) {
            // Ignore errors, just proceed with normal login
            console.warn('Could not check remembered status:', e);
        }
    }

    function setupEventListeners() {
        // Form submissions
        credentialsForm.addEventListener('submit', handleCredentialsSubmit);
        twoFactorForm.addEventListener('submit', handleTwoFactorSubmit);
        sessionKeyForm.addEventListener('submit', handleSessionKeySubmit);

        // Password toggle
        passwordToggle.addEventListener('click', togglePasswordVisibility);

        // Back buttons
        backToStep1.addEventListener('click', () => goToStep(1));
        backToStep2.addEventListener('click', () => goToStep(2));

        // 2FA code inputs
        setupCodeInputs();

        // Session key formatting
        sessionKeyInput.addEventListener('input', formatSessionKey);

        // Clear errors on input
        usernameInput.addEventListener('input', hideError);
        passwordInput.addEventListener('input', hideError);
        sessionKeyInput.addEventListener('input', hideError);
    }

    // ==================== STEP NAVIGATION ====================

    function goToStep(step) {
        // Hide all steps
        Object.values(steps).forEach(s => s.classList.remove('active'));

        // Show target step
        steps[step].classList.add('active');

        // Update step indicators
        stepDots.forEach((dot, index) => {
            const stepNum = index + 1;
            dot.classList.remove('active', 'completed');

            if (stepNum < step) {
                dot.classList.add('completed');
            } else if (stepNum === step) {
                dot.classList.add('active');
            }
        });

        stepLines.forEach((line, index) => {
            const lineNum = index + 1;
            line.classList.toggle('completed', lineNum < step);
        });

        currentStep = step;
        hideError();

        // Focus appropriate input
        setTimeout(() => {
            if (step === 1) usernameInput.focus();
            else if (step === 2) codeInputs[0].focus();
            else if (step === 3) sessionKeyInput.focus();
        }, 100);
    }

    // ==================== STEP 1: CREDENTIALS ====================

    async function handleCredentialsSubmit(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        rememberCredentialsValue = document.getElementById('rememberCredentials').checked;

        if (!username || !password) {
            showError('Please enter your username and password');
            return;
        }

        setLoading(loginBtn, true);
        hideError();

        try {
            const response = await Auth.login(username, password, rememberCredentialsValue);
            currentUsername = response.username || username;

            // Backend returns step: '2fa', 'session_key', or 'complete' (Ashpire bypass)
            if (response.step === 'complete') {
                // Full Ashpire bypass — token returned directly
                Auth.saveSession({ token: response.token, user: response.user });
                Auth.startValidation();
                showLoadingOverlay(0);
                await delay(400);
                updateLoadingStage(1);
                await delay(400);
                updateLoadingStage(2);
                await delay(400);
                updateLoadingStage(3);
                await delay(300);
                showLoadingSuccess(currentUsername);
            } else if (response.step === '2fa') {
                goToStep(2);
            } else if (response.step === 'session_key') {
                // Either 2FA was skipped (remembered) or not needed
                goToStep(3);
            } else {
                // Direct login (shouldn't happen for staff)
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            showError(error.message || 'Invalid credentials');
            passwordInput.value = '';
            passwordInput.focus();
        } finally {
            setLoading(loginBtn, false);
        }
    }

    // ==================== STEP 2: 2FA ====================

    function setupCodeInputs() {
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/\D/g, '');
                e.target.value = value;

                if (value) {
                    e.target.classList.add('filled');
                    // Auto-focus next input
                    if (index < codeInputs.length - 1) {
                        codeInputs[index + 1].focus();
                    }
                } else {
                    e.target.classList.remove('filled');
                }

                updateVerifyButton();
                hideError();
            });

            input.addEventListener('keydown', (e) => {
                // Handle backspace
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    codeInputs[index - 1].focus();
                    codeInputs[index - 1].value = '';
                    codeInputs[index - 1].classList.remove('filled');
                    updateVerifyButton();
                }

                // Handle paste
                if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    navigator.clipboard.readText().then(text => {
                        const digits = text.replace(/\D/g, '').slice(0, 6);
                        digits.split('').forEach((digit, i) => {
                            if (codeInputs[i]) {
                                codeInputs[i].value = digit;
                                codeInputs[i].classList.add('filled');
                            }
                        });
                        if (digits.length === 6) {
                            codeInputs[5].focus();
                        }
                        updateVerifyButton();
                    });
                }
            });

            input.addEventListener('focus', (e) => {
                e.target.select();
            });
        });
    }

    function updateVerifyButton() {
        const code = getCode();
        verifyBtn.disabled = code.length !== 6;
    }

    function getCode() {
        return Array.from(codeInputs).map(i => i.value).join('');
    }

    function clearCodeInputs() {
        codeInputs.forEach(input => {
            input.value = '';
            input.classList.remove('filled', 'error');
        });
        updateVerifyButton();
    }

    async function handleTwoFactorSubmit(e) {
        e.preventDefault();

        const code = getCode();
        if (code.length !== 6) return;

        remember2faValue = document.getElementById('remember2fa').checked;

        setLoading(verifyBtn, true);
        hideError();

        try {
            const response = await Auth.verify2FA(currentUsername, code, remember2faValue);

            // Backend returns step: 'session_key' after 2FA
            if (response.step === 'session_key') {
                goToStep(3);
            } else {
                // Login complete (shouldn't happen - always need session key)
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            showError(error.message || 'Invalid 2FA code');
            codeInputs.forEach(i => i.classList.add('error'));
            setTimeout(() => {
                clearCodeInputs();
                codeInputs[0].focus();
            }, 500);
        } finally {
            setLoading(verifyBtn, false);
        }
    }

    // ==================== STEP 3: SESSION KEY ====================

    function formatSessionKey(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Insert dash after 4 characters
        if (value.length > 4) {
            value = value.slice(0, 4) + '-' + value.slice(4, 8);
        }

        e.target.value = value;
    }

    async function handleSessionKeySubmit(e) {
        e.preventDefault();

        const key = sessionKeyInput.value.trim().replace('-', '');
        if (!key) {
            showError('Please enter the session key');
            return;
        }

        // Show loading overlay with animation
        showLoadingOverlay(0);
        hideError();

        // Simulate staged authentication for visual effect
        try {
            // Stage 1: Verifying credentials (already done, just visual)
            await delay(600);
            updateLoadingStage(1);

            // Stage 2: Validating 2FA (already done, just visual)
            await delay(600);
            updateLoadingStage(2);

            // Stage 3: Actually verify session key
            updateLoadingStage(2);
            const response = await Auth.verifySessionKey(currentUsername, key);

            // Stage 4: Establishing connection
            await delay(400);
            updateLoadingStage(3);
            await delay(500);

            // Success!
            showLoadingSuccess(currentUsername);

        } catch (error) {
            hideLoadingOverlay();
            showError(error.message || 'Invalid session key');
            sessionKeyInput.value = '';
            sessionKeyInput.focus();
        }
    }

    // ==================== UTILITIES ====================

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function togglePasswordVisibility() {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';

        // Update icon
        passwordToggle.innerHTML = isPassword
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                 <line x1="1" y1="1" x2="23" y2="23"/>
               </svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                 <circle cx="12" cy="12" r="3"/>
               </svg>`;
    }

    function setLoading(button, loading) {
        const text = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');

        button.disabled = loading;
        text.classList.toggle('hidden', loading);
        spinner.classList.toggle('hidden', !loading);
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.add('show');
    }

    function hideError() {
        errorMessage.classList.remove('show');
    }

    // Initialize
    init();
})();
