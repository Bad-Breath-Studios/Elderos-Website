/**
 * Elderos Vote Page — Main Application Logic (Reskin v2)
 */
const Vote = {
    state: {
        sites: [],
        streak: {},
        today: {},
        pendingRewards: 0,
        totalVotes: 0,
        donatorProgress: {},
        leaderboard: [],
        rewards: null,
        donatorRanks: [],
        activeWorldTypes: [],
        loading: true,
        selectedWorldType: null,
    },

    timers: {
        cooldown: null,
        poll: null,
        leaderboardCountdown: null,
    },

    nextResetAt: 0,

    // === Initialization ===

    async init() {
        this.setupLoginForm();
        this.setupMobileMenu();

        // Always load public data
        await this.loadPublicData();

        if (Auth.isAuthenticated()) {
            this.hideLoginOverlay();
            this.showUserInfo();
            await this.loadAuthenticatedData();
            this.startPolling();
        } else {
            this.showLoginOverlay();
            this.renderUnauthenticatedState();
        }

        this.startCooldownTimers();
        this.startLeaderboardCountdown();
    },

    // === Data Loading ===

    async loadPublicData() {
        try {
            const [lbRes, rewardsRes] = await Promise.all([
                API.vote.getWeeklyLeaderboard(),
                API.vote.getRewardsPreview(),
            ]);

            if (lbRes.success) {
                this.state.leaderboard = lbRes.leaderboard || [];
                this.nextResetAt = lbRes.nextResetAt || 0;
                this.renderLeaderboard();
            }

            if (rewardsRes.success) {
                this.state.rewards = rewardsRes.rewards;
                this.state.donatorRanks = rewardsRes.donatorRanks || [];
                this.state.activeWorldTypes = rewardsRes.activeWorldTypes || [];
                this.state.selectedWorldType = this.state.activeWorldTypes[0] || 'economy';
                this.renderRewardsPanel();
            }
        } catch (e) {
            console.error('Failed to load public data:', e);
        }
    },

    async loadAuthenticatedData() {
        try {
            const statusRes = await API.vote.getStatus();
            if (!statusRes.success) return;

            this.state.sites = statusRes.sites || [];
            this.state.today = statusRes.today || {};
            this.state.streak = statusRes.streak || {};
            this.state.pendingRewards = statusRes.pendingRewards || 0;
            this.state.totalVotes = statusRes.totalVotes || 0;
            this.state.donatorProgress = statusRes.donatorProgress || {};
            this.state.loading = false;

            this.renderStatusBanner();
            this.renderVoteSites();
            this.renderDailyProgress();
            this.renderClaimBanner();
            this.renderRankProgress();
            this.renderRewardsPanel(); // re-render to update streak timeline state
        } catch (e) {
            console.error('Failed to load authenticated data:', e);
            if (e.message === 'Session expired') return;
            this.showError('Failed to load vote data. Please refresh.');
        }
    },

    // === Login ===

    setupLoginForm() {
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                const errorEl = document.getElementById('login-error');
                const btn = form.querySelector('button[type="submit"]');

                if (!username || !password) {
                    errorEl.textContent = 'Please enter your username and password.';
                    errorEl.style.display = 'block';
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Logging in...';
                errorEl.style.display = 'none';

                try {
                    const result = await Auth.login(username, password);
                    if (result.success) {
                        window.location.reload();
                    } else if (result.requires2FA) {
                        this.show2FAStep();
                    } else {
                        errorEl.textContent = result.message;
                        errorEl.style.display = 'block';
                    }
                } catch (err) {
                    errorEl.textContent = 'Connection failed. Please try again.';
                    errorEl.style.display = 'block';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Log In';
                }
            });
        }

        const tfaForm = document.getElementById('twofa-form');
        if (tfaForm) {
            tfaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const digits = tfaForm.querySelectorAll('.twofa-digit');
                const code = Array.from(digits).map(d => d.value).join('');
                const errorEl = document.getElementById('twofa-error');
                const btn = document.getElementById('twofa-btn');

                if (code.length !== 6) {
                    errorEl.textContent = 'Please enter all 6 digits.';
                    errorEl.style.display = 'block';
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Verifying...';
                errorEl.style.display = 'none';

                try {
                    const result = await Auth.verify2FA(code);
                    if (result.success) {
                        window.location.reload();
                    } else {
                        errorEl.textContent = result.message;
                        errorEl.style.display = 'block';
                        digits.forEach(d => d.value = '');
                        digits[0].focus();
                    }
                } catch (err) {
                    errorEl.textContent = 'Connection failed. Please try again.';
                    errorEl.style.display = 'block';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Verify';
                }
            });

            this.setup2FAInputs();
        }

        const backBtn = document.getElementById('twofa-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showCredentialsStep());
        }
    },

    show2FAStep() {
        document.getElementById('login-step-credentials').style.display = 'none';
        document.getElementById('login-step-2fa').style.display = 'block';
        const firstDigit = document.querySelector('.twofa-digit[data-index="0"]');
        if (firstDigit) firstDigit.focus();
    },

    showCredentialsStep() {
        document.getElementById('login-step-2fa').style.display = 'none';
        document.getElementById('login-step-credentials').style.display = 'block';
        document.getElementById('twofa-error').style.display = 'none';
        document.querySelectorAll('.twofa-digit').forEach(d => d.value = '');
        Auth._tempToken = null;
    },

    setup2FAInputs() {
        const digits = document.querySelectorAll('.twofa-digit');
        digits.forEach((input, i) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/\D/g, '');
                e.target.value = val.slice(0, 1);
                if (val && i < 5) digits[i + 1].focus();
                if (i === 5 && val) {
                    const code = Array.from(digits).map(d => d.value).join('');
                    if (code.length === 6) document.getElementById('twofa-form').requestSubmit();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && i > 0) {
                    digits[i - 1].focus();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                paste.split('').forEach((ch, j) => {
                    if (digits[j]) digits[j].value = ch;
                });
                const nextEmpty = paste.length < 6 ? paste.length : 5;
                digits[nextEmpty].focus();
                if (paste.length === 6) document.getElementById('twofa-form').requestSubmit();
            });
        });
    },

    showLoginOverlay() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.classList.add('active');
    },

    hideLoginOverlay() {
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.classList.remove('active');
    },

    showUserInfo() {
        const username = Auth.getUsername();
        const el = document.getElementById('user-info');
        if (el && username) {
            el.innerHTML = `<span class="user-name">${this.escapeHtml(username)}</span><button class="logout-btn" onclick="Vote.logout()">Logout</button>`;
            el.style.display = 'flex';
        }
    },

    logout() {
        Auth.logout();
    },

    // === Render: Status Banner (3-section horizontal card) ===

    renderStatusBanner() {
        const container = document.getElementById('status-banner');
        if (!container) return;

        const { streak, today, sites } = this.state;
        const currentStreak = streak.current || 0;
        const longestStreak = streak.longest || 0;
        const enabledSites = sites.filter(s => s.voted !== undefined);
        const votedCount = today.voted || 0;
        const requiredCount = today.required || enabledSites.length || 3;

        // Find next streak milestone
        const milestones = this._getStreakMilestones();
        const nextMilestone = milestones.find(m => m.days > currentStreak);
        const daysUntil = nextMilestone ? nextMilestone.days - currentStreak : 0;

        // Streak section
        let streakHtml;
        if (currentStreak === 0) {
            streakHtml = `
                <div class="streak-display">
                    <span class="streak-fire">&#128293;</span>
                    <span class="streak-number">0</span>
                    <span class="streak-label">day streak</span>
                </div>
                <div class="streak-sub">Start your streak by voting today!</div>
            `;
        } else {
            streakHtml = `
                <div class="streak-display">
                    <span class="streak-fire">&#128293;</span>
                    <span class="streak-number">${currentStreak}</span>
                    <span class="streak-label">day streak</span>
                </div>
                <div class="streak-sub">Longest: ${longestStreak} days</div>
            `;
        }

        // Next milestone section
        let milestoneHtml;
        if (nextMilestone) {
            const rewardPreview = this._getMilestoneRewardPreview(nextMilestone);
            milestoneHtml = `
                <div class="milestone-tag">NEXT MILESTONE</div>
                <div class="milestone-name">${nextMilestone.days}-Day Streak</div>
                <div class="milestone-detail">${daysUntil} more day${daysUntil !== 1 ? 's' : ''} ${rewardPreview ? '&rarr; ' + rewardPreview : ''}</div>
            `;
        } else {
            milestoneHtml = `
                <div class="milestone-tag">MILESTONES</div>
                <div class="milestone-name">All Complete!</div>
                <div class="milestone-detail">You've reached every milestone</div>
            `;
        }

        // Today's votes dots
        const dotsHtml = enabledSites.map((s, i) =>
            `<div class="today-dot ${s.voted ? 'voted' : ''}">${s.voted ? '&#10003;' : (i + 1)}</div>`
        ).join('');

        container.innerHTML = `
            <div class="status-banner-card">
                <div class="status-section">
                    ${streakHtml}
                </div>
                <div class="status-divider"></div>
                <div class="status-section">
                    ${milestoneHtml}
                </div>
                <div class="status-divider"></div>
                <div class="status-section">
                    <div class="today-tag">TODAY'S VOTES</div>
                    <div class="today-dots">${dotsHtml}</div>
                    <div class="today-counter">${votedCount}/${requiredCount} complete</div>
                </div>
            </div>
        `;
        container.style.display = 'block';
    },

    // === Render: Vote Sites (accent bars, pulsing dots, timer/READY text) ===

    renderVoteSites() {
        const container = document.getElementById('vote-sites');
        if (!container) return;

        if (!Auth.isAuthenticated()) {
            container.innerHTML = '<div class="auth-message">Log in to start voting and earning rewards</div>';
            return;
        }

        const { sites } = this.state;
        container.dataset.count = sites.length;
        container.innerHTML = sites.map(site => {
            const voted = site.voted;
            const onCooldown = site.cooldownRemaining > 0 && !voted;
            let statusClass = 'ready';
            let statusText = 'Ready to vote';
            let dotClass = 'ready';
            let timerHtml = '<div class="vote-timer ready-text">READY</div>';
            let btnHtml = `<button class="vote-btn ready" data-site-id="${this.escapeHtml(site.id)}" data-vote-url="${this.escapeHtml(site.voteUrl)}" onclick="Vote.openVoteSite(this)">VOTE &rarr;</button>`;

            if (voted) {
                statusClass = 'voted';
                statusText = 'Voted';
                dotClass = 'voted';
                const remaining = (site.cooldownEndsAt || 0) - Date.now();
                timerHtml = `<div class="vote-timer">${remaining > 0 ? this.formatCountdown(remaining) : '---'}</div>`;
                btnHtml = `<button class="vote-btn voted" disabled>&#10003; Voted</button>`;
            } else if (onCooldown) {
                statusClass = 'cooldown';
                statusText = 'On cooldown';
                dotClass = '';
                timerHtml = `<div class="vote-timer" data-cooldown-end="${site.cooldownEndsAt || 0}">${this.formatCountdown(site.cooldownRemaining)}</div>`;
                btnHtml = `<button class="vote-btn cooldown" disabled>Cooldown</button>`;
            }

            return `
                <div class="vote-card ${statusClass}">
                    <div class="vote-card-header">
                        <div class="vote-site-icon">${this.getSiteEmoji(site.id)}</div>
                        <div class="vote-site-info">
                            <div class="vote-site-name">${this.escapeHtml(site.name)}</div>
                            <div class="vote-site-status">
                                ${dotClass ? `<span class="status-dot ${dotClass}"></span>` : ''}
                                ${statusText}
                            </div>
                        </div>
                    </div>
                    ${timerHtml}
                    ${btnHtml}
                </div>
            `;
        }).join('');
    },

    openVoteSite(btn) {
        const url = btn.dataset.voteUrl;
        if (url && /^https?:\/\//i.test(url)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    },

    // === Render: Daily Progress ===

    renderDailyProgress() {
        const container = document.getElementById('daily-progress');
        if (!container) return;

        const { today } = this.state;
        const voted = today.voted || 0;
        const required = today.required || 3;
        const pct = required > 0 ? Math.round((voted / required) * 100) : 0;
        const completed = today.completed;
        const remaining = required - voted;

        const labelText = completed
            ? 'All sites voted! &#10003;'
            : `${voted}/${required} sites &mdash; ${remaining} more to complete today`;

        container.innerHTML = `
            <div class="progress-header">
                <span class="progress-label">${labelText}</span>
                <span class="progress-count">${pct}%</span>
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill ${completed ? 'complete' : ''}" style="width: ${pct}%"></div>
            </div>
            ${completed ? '<div class="progress-complete">Daily vote complete! Rewards queued.</div>' : ''}
        `;
    },

    // === Render: Rewards Panel (daily + streak timeline inside) ===

    renderRewardsPanel() {
        const container = document.getElementById('rewards-panel');
        if (!container || !this.state.rewards) return;

        const types = this.state.activeWorldTypes;
        const selected = this.state.selectedWorldType || types[0];
        const rewards = this.state.rewards[selected];
        if (!rewards) return;

        // World type tabs (only if multiple types)
        let tabsHtml = '';
        if (types.length > 1) {
            tabsHtml = `
                <div class="rewards-tabs">
                    ${types.map(t =>
                        `<button class="reward-tab ${t === selected ? 'active' : ''}" onclick="Vote.selectWorldType('${t}')">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`
                    ).join('')}
                </div>
            `;
        }

        // Daily reward card
        const daily = rewards.daily;
        let dailyRows = '';
        if (daily.items && daily.items.length > 0) {
            dailyRows += daily.items.map(i =>
                `<div class="daily-reward-row">
                    <span class="daily-reward-icon">&#127873;</span>
                    <span class="daily-reward-name">${i.quantity}x ${this.formatItemName(i.id)}</span>
                </div>`
            ).join('');
        }
        if (daily.voteTokens > 0) {
            dailyRows += `<div class="daily-reward-row">
                <span class="daily-reward-icon">&#11088;</span>
                <span class="daily-reward-name">Vote Tokens</span>
                <span class="daily-reward-value">${daily.voteTokens}</span>
            </div>`;
        }
        if (daily.donatorValue > 0) {
            dailyRows += `<div class="daily-reward-row">
                <span class="daily-reward-icon">&#128176;</span>
                <span class="daily-reward-name">Rank Progress</span>
                <span class="daily-reward-value">+$${(daily.donatorValue / 100).toFixed(2)}</span>
            </div>`;
        }

        const dailyHtml = `
            <div class="daily-reward-card">
                <div class="daily-reward-title">Daily Completion</div>
                ${dailyRows}
            </div>
        `;

        // Streak timeline
        const streakTimelineHtml = this._renderStreakTimeline(rewards.streaks || []);

        container.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">Rewards</div>
                ${tabsHtml}
            </div>
            ${dailyHtml}
            ${streakTimelineHtml}
        `;
    },

    _renderStreakTimeline(streaks) {
        if (!streaks || streaks.length === 0) return '';

        const currentStreak = this.state.streak.current || 0;
        const todayCompleted = this.state.today.completed || false;

        const items = streaks.map((s, i) => {
            const completed = currentStreak >= s.days;
            const isCurrent = !completed && (i === 0 || currentStreak >= (streaks[i - 1]?.days || 0));
            const daysAway = s.days - currentStreak;
            const isLast = i === streaks.length - 1;

            let dotClass = 'future';
            let connectorClass = '';
            let dayClass = 'future';
            let descClass = '';
            let badgeHtml = '';

            if (completed) {
                dotClass = 'completed';
                connectorClass = 'completed';
                dayClass = 'completed';
                descClass = 'completed';
                badgeHtml = '<span class="timeline-badge claimed">CLAIMED</span>';
            } else if (isCurrent) {
                dotClass = 'current';
                connectorClass = 'current';
                dayClass = 'current';
                if (todayCompleted) {
                    badgeHtml = '<span class="timeline-badge here">Claim with ::claimvote</span>';
                } else {
                    badgeHtml = '<span class="timeline-badge here">&#8592; YOU ARE HERE</span>';
                }
            } else {
                badgeHtml = `<span class="timeline-badge future">${daysAway} more day${daysAway !== 1 ? 's' : ''}</span>`;
            }

            // Reward description
            const rewardParts = [];
            if (s.items && s.items.length > 0) {
                rewardParts.push(s.items.map(it => `${it.quantity}x ${this.formatItemName(it.id)}`).join(', '));
            }
            if (s.voteTokens > 0) rewardParts.push(`${s.voteTokens} tokens`);
            if (s.donatorValue > 0) rewardParts.push(`+$${(s.donatorValue / 100).toFixed(2)} rank`);
            const rewardDesc = rewardParts.join(' + ');

            return `
                <div class="timeline-item">
                    <div class="timeline-dot-col">
                        <div class="timeline-dot ${dotClass}"></div>
                        ${!isLast ? `<div class="timeline-connector ${connectorClass}"></div>` : ''}
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-day ${dayClass}">${s.days}-Day Streak</div>
                        <div class="timeline-desc ${descClass}">${rewardDesc}</div>
                        ${badgeHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="streak-timeline-title">Streak Milestones</div>
            <div class="streak-timeline">
                ${items}
            </div>
        `;
    },

    selectWorldType(type) {
        this.state.selectedWorldType = type;
        this.renderRewardsPanel();
    },

    // === Render: Leaderboard ===

    renderLeaderboard() {
        const container = document.getElementById('leaderboard');
        if (!container) return;

        const entries = this.state.leaderboard;

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="panel-header">
                    <div class="panel-title">Weekly Voters</div>
                    <div class="panel-subtitle" id="lb-countdown"></div>
                </div>
                <div class="lb-empty">No votes this week yet. Be the first!</div>
            `;
            return;
        }

        const podium = entries.slice(0, 3);
        const rows = entries.slice(3, 10);
        const username = Auth.isAuthenticated() ? Auth.getUsername() : null;

        const podiumHtml = podium.length > 0 ? `
            <div class="lb-podium">
                ${podium.map((p, i) => {
                    const isUser = p.username === username;
                    return `
                        <div class="lb-podium-item rank-${i + 1} ${isUser ? 'highlight' : ''}">
                            <div class="lb-podium-rank">${this.getRankEmoji(i + 1)}</div>
                            <div class="lb-podium-name">${this.escapeHtml(p.username)}${isUser ? '<span class="lb-you-badge">YOU</span>' : ''}</div>
                            <div class="lb-podium-score">${p.completions}/${7} days</div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        const rowsHtml = rows.map(r => {
            const isUser = r.username === username;
            return `
                <div class="lb-row ${isUser ? 'highlight' : ''}">
                    <span class="lb-rank">#${r.rank}</span>
                    <span class="lb-name">${this.escapeHtml(r.username)}${isUser ? '<span class="lb-you-badge">YOU</span>' : ''}</span>
                    <span class="lb-score">${r.completions}</span>
                </div>
            `;
        }).join('');

        // Check if user is in leaderboard
        let userRankHtml = '';
        if (username) {
            const userEntry = entries.find(e => e.username === username);
            if (!userEntry) {
                // User not in top entries - we don't have their rank data from API, skip
            }
        }

        container.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">Weekly Voters</div>
                <div class="panel-subtitle" id="lb-countdown"></div>
            </div>
            ${podiumHtml}
            <div class="lb-rows">${rowsHtml}</div>
            ${userRankHtml}
        `;
    },

    // === Render: Rank Progress (full-width card with color dots) ===

    renderRankProgress() {
        const container = document.getElementById('rank-progress');
        if (!container) return;

        if (!Auth.isAuthenticated()) {
            container.innerHTML = '';
            return;
        }

        const dp = this.state.donatorProgress;
        if (!dp || dp.maxRankReached) {
            container.innerHTML = dp?.maxRankReached
                ? '<div class="rank-card"><div class="rank-max">Maximum donator rank achieved!</div></div>'
                : '';
            return;
        }

        const current = dp.currentRank || 'none';
        const next = dp.nextRank;
        const pct = dp.progressPercent || 0;
        const spent = ((dp.totalSpentCents || 0) / 100).toFixed(2);
        const threshold = ((dp.nextThresholdCents || 0) / 100).toFixed(2);
        const currentColor = dp.currentColor || 'var(--text-muted)';
        const nextColor = dp.nextColor || 'var(--accent)';

        container.innerHTML = `
            <div class="rank-card">
                <div class="rank-card-header">
                    <div class="rank-card-title">Donator Rank Progress</div>
                    <div class="rank-card-earned"><strong>$${spent}</strong> earned from voting</div>
                </div>
                <div class="rank-bar-labels">
                    <span class="rank-current"><span class="rank-color-dot" style="background: ${currentColor}"></span> ${this.capitalize(current)}</span>
                    <span class="rank-next" style="color: ${nextColor}"><span class="rank-color-dot" style="background: ${nextColor}"></span> ${this.capitalize(next)}</span>
                </div>
                <div class="rank-bar-track">
                    <div class="rank-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${currentColor}, ${nextColor})"></div>
                </div>
                <div class="rank-bar-detail">$${spent} / $${threshold}</div>
            </div>
        `;
    },

    // === Render: Claim Banner ===

    renderClaimBanner() {
        const container = document.getElementById('claim-banner');
        if (!container) return;

        if (this.state.pendingRewards > 0) {
            const count = this.state.pendingRewards;
            container.innerHTML = `
                <div class="claim-content">
                    <div class="claim-icon">&#128230;</div>
                    <div class="claim-text">
                        <div class="claim-title">${count} Unclaimed Reward${count > 1 ? 's' : ''}</div>
                        <div class="claim-desc">Claim on your preferred world &mdash; rewards are world-type specific</div>
                    </div>
                    <div class="claim-code">::claimvote</div>
                </div>
            `;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    },

    renderUnauthenticatedState() {
        const statusBanner = document.getElementById('status-banner');
        if (statusBanner) statusBanner.style.display = 'none';

        const sites = document.getElementById('vote-sites');
        if (sites) sites.innerHTML = '<div class="auth-message">Log in to start voting and earning rewards</div>';

        const progress = document.getElementById('daily-progress');
        if (progress) progress.innerHTML = '';

        const claimBanner = document.getElementById('claim-banner');
        if (claimBanner) claimBanner.style.display = 'none';

        const rankProgress = document.getElementById('rank-progress');
        if (rankProgress) rankProgress.innerHTML = '';
    },

    // === Timers ===

    startCooldownTimers() {
        if (this.timers.cooldown) clearInterval(this.timers.cooldown);
        this.timers.cooldown = setInterval(() => {
            // Update vote card timers
            document.querySelectorAll('.vote-timer[data-cooldown-end]').forEach(timer => {
                const endAt = parseInt(timer.dataset.cooldownEnd);
                if (!endAt) return;
                const remaining = endAt - Date.now();
                if (remaining <= 0) {
                    timer.textContent = 'READY';
                    timer.classList.add('ready-text');
                    // Update the card and button
                    const card = timer.closest('.vote-card');
                    if (card) {
                        card.classList.remove('cooldown', 'voted');
                        card.classList.add('ready');
                        const btn = card.querySelector('.vote-btn');
                        if (btn) {
                            btn.className = 'vote-btn ready';
                            btn.disabled = false;
                            btn.innerHTML = 'VOTE &rarr;';
                        }
                    }
                } else {
                    timer.textContent = this.formatCountdown(remaining);
                }
            });

            // Also update voted card timers (no data-cooldown-end attribute)
            document.querySelectorAll('.vote-card.voted .vote-timer:not([data-cooldown-end])').forEach(timer => {
                const card = timer.closest('.vote-card');
                if (!card) return;
                const btn = card.querySelector('.vote-btn');
                if (!btn) return;
                // These are already voted, just need timer display from the site data
            });
        }, CONFIG.COOLDOWN_TICK);
    },

    startLeaderboardCountdown() {
        if (this.timers.leaderboardCountdown) clearInterval(this.timers.leaderboardCountdown);
        this.timers.leaderboardCountdown = setInterval(() => {
            const el = document.getElementById('lb-countdown');
            if (!el || !this.nextResetAt) return;
            const remaining = this.nextResetAt - Date.now();
            if (remaining <= 0) {
                el.textContent = 'Resetting...';
            } else {
                el.textContent = `Resets in ${this.formatDuration(remaining)}`;
            }
        }, 1000);
    },

    startPolling() {
        if (this.timers.poll) clearInterval(this.timers.poll);
        this.timers.poll = setInterval(() => {
            this.loadAuthenticatedData();
        }, CONFIG.POLL_INTERVAL);
    },

    // === Mobile Menu ===

    setupMobileMenu() {
        const hamburger = document.getElementById('hamburger');
        const mobileMenu = document.getElementById('mobileMenu');
        if (hamburger && mobileMenu) {
            hamburger.addEventListener('click', () => {
                mobileMenu.classList.toggle('open');
                hamburger.classList.toggle('active');
            });
        }
    },

    // === Helper: Get streak milestones from rewards config ===

    _getStreakMilestones() {
        const selected = this.state.selectedWorldType || this.state.activeWorldTypes[0] || 'economy';
        const rewards = this.state.rewards?.[selected];
        if (!rewards?.streaks) return [{ days: 3 }, { days: 7 }, { days: 14 }, { days: 30 }];
        return rewards.streaks;
    },

    _getMilestoneRewardPreview(milestone) {
        const parts = [];
        if (milestone.items && milestone.items.length > 0) {
            parts.push(milestone.items.map(i => this.formatItemName(i.id)).join(', '));
        }
        if (milestone.donatorValue > 0) {
            parts.push(`$${(milestone.donatorValue / 100).toFixed(2)} rank`);
        }
        return parts.join(' + ');
    },

    // === Utility ===

    showError(msg) {
        const el = document.getElementById('error-banner');
        if (el) {
            el.textContent = msg;
            el.style.display = 'block';
        }
    },

    formatCountdown(ms) {
        if (ms <= 0) return 'READY';
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        if (hours > 0) return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
        if (mins > 0) return `${mins}m ${String(secs).padStart(2, '0')}s`;
        return `${secs}s`;
    },

    formatDuration(ms) {
        const days = Math.floor(ms / 86400000);
        const hours = Math.floor((ms % 86400000) / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        parts.push(`${mins}m`);
        return parts.join(' ');
    },

    formatItemName(id) {
        return String(id).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },

    capitalize(str) {
        if (!str || str === 'none') return 'None';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    getSiteEmoji(siteId) {
        const emojis = { topg: '&#9650;', runelocus: '&#9670;', rsps_list: '&#9733;' };
        return emojis[siteId] || '&#9679;';
    },

    getRankEmoji(rank) {
        if (rank === 1) return '&#129351;';
        if (rank === 2) return '&#129352;';
        if (rank === 3) return '&#129353;';
        return `#${rank}`;
    },

    escapeHtml(str) {
        if (!str) return '';
        const el = document.createElement('span');
        el.textContent = str;
        return el.innerHTML;
    },
};

// === Boot ===
document.addEventListener('DOMContentLoaded', () => Vote.init());
