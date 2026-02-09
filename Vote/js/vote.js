/**
 * Elderos Vote Page — Main Application Logic
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
            this.renderStreakRoadmap();
        } catch (e) {
            console.error('Failed to load authenticated data:', e);
            if (e.message === 'Session expired') return;
            this.showError('Failed to load vote data. Please refresh.');
        }
    },

    // === Login ===

    setupLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

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

    // === Render: Status Banner ===

    renderStatusBanner() {
        const container = document.getElementById('status-banner');
        if (!container) return;

        const { streak, today, sites } = this.state;
        const enabledSites = sites.filter(s => s.voted !== undefined);

        // Find next streak milestone
        const milestones = [3, 7, 14, 30];
        const nextMilestone = milestones.find(m => m > (streak.current || 0)) || 30;
        const daysUntil = nextMilestone - (streak.current || 0);

        container.innerHTML = `
            <div class="status-cards">
                <div class="status-card">
                    <div class="status-value">${streak.current || 0}</div>
                    <div class="status-label">Day Streak</div>
                </div>
                <div class="status-card">
                    <div class="status-value">${streak.longest || 0}</div>
                    <div class="status-label">Best Streak</div>
                </div>
                <div class="status-card">
                    <div class="status-value">${this.state.totalVotes}</div>
                    <div class="status-label">Total Votes</div>
                </div>
                <div class="status-card accent">
                    <div class="status-value">${daysUntil}</div>
                    <div class="status-label">Days to ${nextMilestone}-day bonus</div>
                </div>
            </div>
        `;
        container.style.display = 'block';
    },

    // === Render: Vote Sites ===

    renderVoteSites() {
        const container = document.getElementById('vote-sites');
        if (!container) return;

        if (!Auth.isAuthenticated()) {
            container.innerHTML = '<div class="auth-message">Log in to vote and earn rewards</div>';
            return;
        }

        const { sites } = this.state;
        container.innerHTML = sites.map(site => {
            const voted = site.voted;
            const onCooldown = site.cooldownRemaining > 0 && !voted;
            let statusClass = 'ready';
            let btnText = 'VOTE';
            let btnDisabled = '';

            if (voted) {
                statusClass = 'voted';
                btnText = 'VOTED';
                btnDisabled = 'disabled';
            } else if (onCooldown) {
                statusClass = 'cooldown';
                btnText = this.formatCountdown(site.cooldownRemaining);
                btnDisabled = 'disabled';
            }

            return `
                <div class="vote-card ${statusClass}">
                    <div class="vote-card-header">
                        <div class="vote-site-icon">${this.getSiteEmoji(site.id)}</div>
                        <div class="vote-site-info">
                            <div class="vote-site-name">${this.escapeHtml(site.name)}</div>
                            <div class="vote-site-status">${voted ? 'Voted today' : onCooldown ? 'On cooldown' : 'Ready to vote'}</div>
                        </div>
                    </div>
                    <button class="vote-btn ${statusClass}" ${btnDisabled}
                            data-site-id="${site.id}"
                            data-vote-url="${this.escapeHtml(site.voteUrl)}"
                            data-cooldown-end="${site.cooldownEndsAt || 0}"
                            onclick="Vote.openVoteSite(this)">
                        ${btnText}
                    </button>
                </div>
            `;
        }).join('');
    },

    openVoteSite(btn) {
        const url = btn.dataset.voteUrl;
        if (url) window.open(url, '_blank');
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

        container.innerHTML = `
            <div class="progress-header">
                <span>Daily Progress</span>
                <span class="progress-count">${voted}/${required} sites</span>
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill ${completed ? 'complete' : ''}" style="width: ${pct}%"></div>
            </div>
            ${completed ? '<div class="progress-complete">Daily vote complete! Rewards queued.</div>' : ''}
        `;
    },

    // === Render: Rewards Panel ===

    renderRewardsPanel() {
        const container = document.getElementById('rewards-panel');
        if (!container || !this.state.rewards) return;

        const types = this.state.activeWorldTypes;
        const selected = this.state.selectedWorldType || types[0];
        const rewards = this.state.rewards[selected];
        if (!rewards) return;

        // World type tabs
        const tabs = types.map(t =>
            `<button class="reward-tab ${t === selected ? 'active' : ''}" onclick="Vote.selectWorldType('${t}')">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`
        ).join('');

        // Daily reward
        const daily = rewards.daily;
        const dailyHtml = `
            <div class="reward-section">
                <h4>Daily Reward</h4>
                <div class="reward-item-card">
                    <div class="reward-desc">${this.escapeHtml(daily.description)}</div>
                    <div class="reward-details">
                        ${daily.voteTokens > 0 ? `<span class="reward-tag token">${daily.voteTokens} Vote Tokens</span>` : ''}
                        ${daily.donatorValue > 0 ? `<span class="reward-tag donator">+$${(daily.donatorValue / 100).toFixed(2)} rank progress</span>` : ''}
                    </div>
                    <div class="reward-items">${daily.items.map(i => `<span class="item-pill">${i.quantity}x ${this.formatItemName(i.id)}</span>`).join('')}</div>
                </div>
            </div>
        `;

        // Streak rewards
        const streaksHtml = `
            <div class="reward-section">
                <h4>Streak Bonuses</h4>
                ${rewards.streaks.map(s => `
                    <div class="reward-item-card streak">
                        <div class="reward-milestone">${s.days}-Day</div>
                        <div class="reward-desc">${this.escapeHtml(s.description)}</div>
                        <div class="reward-details">
                            ${s.voteTokens > 0 ? `<span class="reward-tag token">${s.voteTokens} Tokens</span>` : ''}
                        </div>
                        <div class="reward-items">${s.items.map(i => `<span class="item-pill">${i.quantity}x ${this.formatItemName(i.id)}</span>`).join('')}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Weekly top
        const weeklyHtml = `
            <div class="reward-section">
                <h4>Weekly Top Voters</h4>
                ${rewards.weeklyTop.map(w => {
                    const label = w.rank ? `#${w.rank}` : (w.rankRange ? `#${w.rankRange[0]}-${w.rankRange[1]}` : '');
                    return `
                        <div class="reward-item-card weekly">
                            <div class="reward-milestone">${label}</div>
                            <div class="reward-desc">${this.escapeHtml(w.description)}</div>
                            <div class="reward-details">
                                ${w.voteTokens > 0 ? `<span class="reward-tag token">${w.voteTokens} Tokens</span>` : ''}
                            </div>
                            <div class="reward-items">${w.items.map(i => `<span class="item-pill">${i.quantity}x ${this.formatItemName(i.id)}</span>`).join('')}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = `
            <div class="rewards-tabs">${tabs}</div>
            ${dailyHtml}
            ${streaksHtml}
            ${weeklyHtml}
        `;
    },

    selectWorldType(type) {
        this.state.selectedWorldType = type;
        this.renderRewardsPanel();
    },

    // === Render: Streak Roadmap ===

    renderStreakRoadmap() {
        const container = document.getElementById('streak-roadmap');
        if (!container) return;

        const current = this.state.streak.current || 0;
        const milestones = [3, 7, 14, 30];

        container.innerHTML = `
            <h3 class="section-title">Streak Roadmap</h3>
            <div class="roadmap">
                ${milestones.map(m => {
                    const completed = current >= m;
                    const isCurrent = !completed && (milestones.indexOf(m) === 0 || current >= milestones[milestones.indexOf(m) - 1]);
                    return `
                        <div class="roadmap-node ${completed ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                            <div class="roadmap-dot"></div>
                            <div class="roadmap-label">${m} Days</div>
                            ${completed ? '<div class="roadmap-check">&#10003;</div>' : ''}
                        </div>
                    `;
                }).join('<div class="roadmap-line"></div>')}
            </div>
        `;
    },

    // === Render: Leaderboard ===

    renderLeaderboard() {
        const container = document.getElementById('leaderboard');
        if (!container) return;

        const entries = this.state.leaderboard;

        if (entries.length === 0) {
            container.innerHTML = '<div class="lb-empty">No votes this week yet. Be the first!</div>';
            return;
        }

        // Podium (top 3)
        const podium = entries.slice(0, 3);
        const rows = entries.slice(3, 10);
        const username = Auth.getUsername();

        const podiumHtml = podium.length > 0 ? `
            <div class="lb-podium">
                ${podium.map((p, i) => `
                    <div class="lb-podium-item rank-${i + 1} ${p.username === username ? 'highlight' : ''}">
                        <div class="lb-podium-rank">${this.getRankEmoji(i + 1)}</div>
                        <div class="lb-podium-name">${this.escapeHtml(p.username)}</div>
                        <div class="lb-podium-score">${p.completions} days</div>
                    </div>
                `).join('')}
            </div>
        ` : '';

        const rowsHtml = rows.map(r => `
            <div class="lb-row ${r.username === username ? 'highlight' : ''}">
                <span class="lb-rank">#${r.rank}</span>
                <span class="lb-name">${this.escapeHtml(r.username)}</span>
                <span class="lb-score">${r.completions}</span>
            </div>
        `).join('');

        container.innerHTML = `
            ${podiumHtml}
            <div class="lb-rows">${rowsHtml}</div>
            <div class="lb-reset" id="lb-countdown"></div>
        `;
    },

    // === Render: Rank Progress ===

    renderRankProgress() {
        const container = document.getElementById('rank-progress');
        if (!container) return;

        const dp = this.state.donatorProgress;
        if (!dp || dp.maxRankReached) {
            container.innerHTML = dp?.maxRankReached
                ? '<div class="rank-max">Maximum rank achieved!</div>'
                : '';
            return;
        }

        const current = dp.currentRank || 'none';
        const next = dp.nextRank;
        const pct = dp.progressPercent || 0;
        const spent = ((dp.totalSpentCents || 0) / 100).toFixed(2);
        const threshold = ((dp.nextThresholdCents || 0) / 100).toFixed(2);

        container.innerHTML = `
            <h3 class="section-title">Donator Rank Progress</h3>
            <div class="rank-bar-wrapper">
                <div class="rank-bar-labels">
                    <span class="rank-current">${this.capitalize(current)}</span>
                    <span class="rank-next" style="color: ${dp.nextColor || 'var(--text-dim)'}">${this.capitalize(next)}</span>
                </div>
                <div class="rank-bar-track">
                    <div class="rank-bar-fill" style="width: ${pct}%; background: ${dp.nextColor || 'var(--accent)'}"></div>
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
            container.innerHTML = `
                <div class="claim-content">
                    <div class="claim-icon">&#127873;</div>
                    <div class="claim-text">
                        <div class="claim-title">You have ${this.state.pendingRewards} pending reward${this.state.pendingRewards > 1 ? 's' : ''}!</div>
                        <div class="claim-desc">Type <code>::claimvote</code> in-game to collect your rewards.</div>
                    </div>
                </div>
            `;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    },

    renderUnauthenticatedState() {
        // Show placeholder content for unauthenticated users
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

        const streakRoadmap = document.getElementById('streak-roadmap');
        if (streakRoadmap) streakRoadmap.innerHTML = '';
    },

    // === Timers ===

    startCooldownTimers() {
        if (this.timers.cooldown) clearInterval(this.timers.cooldown);
        this.timers.cooldown = setInterval(() => {
            document.querySelectorAll('.vote-btn.cooldown').forEach(btn => {
                const endAt = parseInt(btn.dataset.cooldownEnd);
                if (!endAt) return;
                const remaining = endAt - Date.now();
                if (remaining <= 0) {
                    btn.textContent = 'VOTE';
                    btn.classList.remove('cooldown');
                    btn.classList.add('ready');
                    btn.disabled = false;
                } else {
                    btn.textContent = this.formatCountdown(remaining);
                }
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

    // === Utility ===

    showError(msg) {
        const el = document.getElementById('error-banner');
        if (el) {
            el.textContent = msg;
            el.style.display = 'block';
        }
    },

    formatCountdown(ms) {
        if (ms <= 0) return 'VOTE';
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        if (hours > 0) return `${hours}h ${mins}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
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
        return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
