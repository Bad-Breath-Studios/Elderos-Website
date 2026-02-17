/**
 * Elderos Top 10 Clips — Tab module for the Creators page.
 * Registers with CreatorsTabs and lazy-initializes on first tab switch.
 */
(function () {
    'use strict';

    const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:8084' : 'https://api.elderos.io';
    const CLIPS_API = API_BASE + '/api/v1/clips';

    // State
    let _period = null;
    let _featured = null;
    let _submissions = [];
    let _myStats = null;
    let _submissionsPage = 1;
    let _submissionsSort = 'votes';
    let _hasMoreSubs = true;
    let _countdownTimer = null;
    let _hasVotedMap = {};
    let _votePending = {};

    // ── Helpers ────────────────────────────────────────

    function authHeaders() {
        const h = { 'Content-Type': 'application/json' };
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const token = Auth.getToken();
            if (token) h['Authorization'] = 'Bearer ' + token;
        }
        return h;
    }

    async function apiFetch(path, opts = {}) {
        const url = path.startsWith('http') ? path : CLIPS_API + path;
        const res = await fetch(url, { headers: authHeaders(), ...opts });
        return res.json();
    }

    async function apiPost(path, body) {
        return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
    }

    async function apiDelete(path) {
        return apiFetch(path, { method: 'DELETE' });
    }

    function esc(s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatNumber(n) {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return String(n);
    }

    function showToast(msg, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            const el = document.createElement('div');
            el.className = 'toast ' + (type || 'info');
            el.textContent = msg;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 4000);
        }
    }

    function formatDate(ms) {
        return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function isLoggedIn() {
        return typeof Auth !== 'undefined' && Auth.isLoggedIn();
    }

    // ── Init ──────────────────────────────────────────

    async function init() {
        const container = document.getElementById('tab-content-clips');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"></div>';

        // Fetch initial data in parallel
        const promises = [loadPeriod(), loadFeatured()];
        if (isLoggedIn()) promises.push(loadMyStats());
        await Promise.all(promises);

        render();
        startCountdown();
    }

    // ── Data Loading ──────────────────────────────────

    async function loadPeriod() {
        try {
            const data = await apiFetch('/periods/current');
            if (data.success) _period = data.period;
        } catch { /* no active period */ }
    }

    async function loadFeatured() {
        try {
            const data = await apiFetch('/featured');
            if (data.success && data.results && data.results.length) {
                _featured = data;
            }
        } catch { /* no featured */ }
    }

    async function loadMyStats() {
        try {
            const data = await apiFetch('/me/stats');
            if (data.success) _myStats = data;
        } catch { /* not logged in or error */ }
    }

    async function loadSubmissions(append) {
        if (!_period) return;
        try {
            const page = append ? _submissionsPage + 1 : 1;
            const data = await apiFetch('/submissions?period=' + _period.id + '&sort=' + _submissionsSort + '&page=' + page + '&limit=20');
            if (data.success) {
                if (append) {
                    _submissions = _submissions.concat(data.submissions || []);
                } else {
                    _submissions = data.submissions || [];
                }
                _submissionsPage = page;
                _hasMoreSubs = data.hasMore === true;

                // Build hasVoted map
                if (data.submissions) {
                    data.submissions.forEach(s => {
                        if (s.hasVoted !== undefined) _hasVotedMap[s.id] = s.hasVoted;
                    });
                }
            }
        } catch {
            showToast('Failed to load submissions', 'error');
        }
    }

    // ── Countdown ─────────────────────────────────────

    function startCountdown() {
        if (_countdownTimer) clearInterval(_countdownTimer);
        _countdownTimer = setInterval(updateCountdown, 1000);
        updateCountdown();
    }

    function updateCountdown() {
        if (!_period || !_period.endDate) return;
        const now = Date.now();
        const end = _period.endDate;
        let diff = Math.max(0, end - now);

        const d = Math.floor(diff / 86400000); diff %= 86400000;
        const h = Math.floor(diff / 3600000); diff %= 3600000;
        const m = Math.floor(diff / 60000); diff %= 60000;
        const s = Math.floor(diff / 1000);

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val).padStart(2, '0');
        };
        set('cd-days', d);
        set('cd-hours', h);
        set('cd-mins', m);
        set('cd-secs', s);
    }

    // ── Render ────────────────────────────────────────

    function render() {
        const container = document.getElementById('tab-content-clips');
        if (!container) return;

        if (!_period) {
            container.innerHTML = renderNoPeriod();
            return;
        }

        container.innerHTML = `
            ${renderPeriodHeader()}
            <div class="clips-layout">
                <div class="clips-main">
                    ${renderFeaturedSection()}
                    ${renderSubmitCta()}
                    ${renderSortBar()}
                    <div id="clips-submissions" class="clips-submissions"><div class="loading-spinner"></div></div>
                    <div id="clips-load-more" class="load-more-row" style="display:none">
                        <button class="load-more-btn" id="clips-load-more-btn">Load More</button>
                    </div>
                </div>
                <div class="clips-sidebar">
                    ${renderPrizeTiers()}
                    ${renderHowItWorks()}
                    ${renderRules()}
                    ${isLoggedIn() ? renderUserStats() : ''}
                </div>
            </div>`;

        // Bind events
        bindSortButtons();
        bindSubmitButton();
        bindLoadMore();
        bindFeaturedCard();

        // Load submissions
        loadSubmissions(false).then(() => renderSubmissions());
    }

    function renderNoPeriod() {
        let html = '';
        // Show featured from last period if available
        if (_featured && _featured.results && _featured.results.length) {
            html += `<div style="margin-bottom:24px">${renderTop10Results(_featured.results, _featured.periodTitle)}</div>`;
        }
        html += `
            <div class="clips-empty-state">
                <div class="clips-empty-state-icon">&#127916;</div>
                <div class="clips-empty-state-title">No Active Competition</div>
                <div class="clips-empty-state-text">The next Top 10 Clips period hasn't started yet. Check back soon!</div>
            </div>`;
        return html;
    }

    function renderPeriodHeader() {
        const p = _period;
        const startStr = p.startDate ? formatDate(p.startDate) : '';
        const endStr = p.endDate ? formatDate(p.endDate) : '';
        return `
            <div class="period-header">
                <div class="period-info">
                    <div class="period-title">${esc(p.title || 'Top 10 Clips')}</div>
                    <div class="period-dates">${startStr}${endStr ? ' \u2014 ' + endStr : ''}</div>
                </div>
                <div class="period-countdown">
                    <div class="countdown-unit"><span class="countdown-value" id="cd-days">--</span><span class="countdown-label">Days</span></div>
                    <div class="countdown-unit"><span class="countdown-value" id="cd-hours">--</span><span class="countdown-label">Hours</span></div>
                    <div class="countdown-unit"><span class="countdown-value" id="cd-mins">--</span><span class="countdown-label">Mins</span></div>
                    <div class="countdown-unit"><span class="countdown-value" id="cd-secs">--</span><span class="countdown-label">Secs</span></div>
                </div>
            </div>`;
    }

    function renderFeaturedSection() {
        if (!_featured || !_featured.results || !_featured.results.length) return '';
        const winner = _featured.results[0];
        return `
            <div class="featured-card" id="featured-card" data-video-id="${esc(winner.videoId || '')}">
                <div class="featured-label">\uD83C\uDFC6 Previous Winner</div>
                <div class="featured-content">
                    <div class="featured-thumb">
                        ${winner.thumbnailUrl ? `<img src="${esc(winner.thumbnailUrl)}" alt="" loading="lazy">` : ''}
                    </div>
                    <div class="featured-info">
                        <div class="featured-title">${esc(winner.title || 'Untitled')}</div>
                        <div class="featured-meta">by ${esc(winner.username || 'Unknown')} &middot; #1 Winner</div>
                        <div class="featured-votes">\u2B06 ${formatNumber(winner.voteCount || 0)} votes</div>
                    </div>
                </div>
            </div>`;
    }

    function renderTop10Results(results, periodTitle) {
        let html = `<div class="section-label">${esc(periodTitle || 'Previous Winners')}</div><div class="top10-list">`;
        results.forEach((r, i) => {
            const rank = r.rank || (i + 1);
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            html += `
                <div class="top10-item" data-video-id="${esc(r.videoId || '')}">
                    <div class="top10-rank ${rankClass}">#${rank}</div>
                    <div class="top10-thumb">
                        ${r.thumbnailUrl ? `<img src="${esc(r.thumbnailUrl)}" alt="" loading="lazy">` : ''}
                    </div>
                    <div class="top10-info">
                        <div class="top10-title">${esc(r.title || 'Untitled')}</div>
                        <div class="top10-meta">by ${esc(r.username || 'Unknown')}</div>
                    </div>
                    <div class="top10-votes">${formatNumber(r.voteCount || 0)} votes</div>
                </div>`;
        });
        html += '</div>';
        return html;
    }

    function renderSubmitCta() {
        if (!isLoggedIn()) {
            return `<div class="submit-cta">
                <div class="submit-cta-text">Log in to submit your clips and vote for your favorites!</div>
            </div>`;
        }
        return `<div class="submit-cta">
            <div class="submit-cta-text">Got a sick clip? Submit it for a chance to win prizes!</div>
            <button class="submit-btn" id="clips-submit-btn">\u{1F3AC} Submit a Clip</button>
        </div>`;
    }

    function renderSortBar() {
        return `
            <div class="clips-sort-bar">
                <div class="clips-sort-label">Submissions</div>
                <div class="clips-sort-btns">
                    <button class="clips-sort-btn ${_submissionsSort === 'votes' ? 'active' : ''}" data-sort="votes">Top Voted</button>
                    <button class="clips-sort-btn ${_submissionsSort === 'newest' ? 'active' : ''}" data-sort="newest">Newest</button>
                </div>
            </div>`;
    }

    function renderSubmissions() {
        const container = document.getElementById('clips-submissions');
        if (!container) return;

        if (!_submissions.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">No submissions yet. Be the first to submit!</div>';
            return;
        }

        container.innerHTML = _submissions.map(s => renderSubmissionCard(s)).join('');
        bindVoteButtons();
        bindSubmissionCards();
        bindDeleteButtons();

        const loadMoreRow = document.getElementById('clips-load-more');
        if (loadMoreRow) loadMoreRow.style.display = _hasMoreSubs ? '' : 'none';
    }

    function renderSubmissionCard(s) {
        const hasVoted = _hasVotedMap[s.id] === true;
        const isOwn = isLoggedIn() && typeof Auth !== 'undefined' && Auth.getUser() && Auth.getUser().accountId === s.userId;

        return `
            <div class="submission-card" data-sub-id="${s.id}">
                <div class="submission-thumb" data-video-id="${esc(s.youtubeVideoId)}">
                    ${s.thumbnailUrl ? `<img src="${esc(s.thumbnailUrl)}" alt="" loading="lazy">` : ''}
                    ${s.duration ? `<span class="video-duration">${esc(s.duration)}</span>` : ''}
                </div>
                <div class="submission-content">
                    <div class="submission-title" data-video-id="${esc(s.youtubeVideoId)}">${esc(s.title || 'Untitled')}</div>
                    <div class="submission-meta">
                        <span>${esc(s.username || 'Unknown')}</span>
                        <span class="video-meta-sep"></span>
                        <span>${formatNumber(s.viewCount || 0)} views</span>
                    </div>
                    <div class="submission-actions">
                        <button class="vote-btn ${hasVoted ? 'voted' : ''}" data-sub-id="${s.id}" ${!isLoggedIn() ? 'disabled title="Log in to vote"' : ''}>
                            \u2B06 <span class="vote-count" id="vote-count-${s.id}">${s.voteCount || 0}</span>
                        </button>
                        ${isOwn ? `<button class="submission-delete" data-sub-id="${s.id}">Delete</button>` : ''}
                    </div>
                </div>
            </div>`;
    }

    function renderPrizeTiers() {
        const defaultPrizes = [
            { rank: 1, value: '$50' }, { rank: 2, value: '$30' }, { rank: 3, value: '$20' },
            { rank: 4, value: '5000 Eldercoins' }, { rank: 5, value: '3000 Eldercoins' },
            { rank: 6, value: '2000 Eldercoins' }, { rank: 7, value: '1500 Eldercoins' },
            { rank: 8, value: '1000 Eldercoins' }, { rank: 9, value: '750 Eldercoins' },
            { rank: 10, value: '500 Eldercoins' }
        ];

        const prizes = (_period && _period.prizes) ? _period.prizes : defaultPrizes;

        let html = `<div class="sidebar-card"><div class="sidebar-card-title">Prize Pool</div><div class="prize-tiers">`;
        prizes.forEach(p => {
            const cls = p.rank === 1 ? 'gold' : p.rank === 2 ? 'silver' : p.rank === 3 ? 'bronze' : 'default';
            html += `<div class="prize-tier"><span class="prize-rank ${cls}">#${p.rank}</span><span class="prize-value">${esc(p.value)}</span></div>`;
        });
        html += '</div></div>';
        return html;
    }

    function renderHowItWorks() {
        return `
            <div class="sidebar-card">
                <div class="sidebar-card-title">How It Works</div>
                <div class="hiw-steps">
                    <div class="hiw-step"><div class="hiw-num">1</div><div class="hiw-text">Upload your Elderos clip to YouTube with <strong>#ELDEROS</strong> in the title or description</div></div>
                    <div class="hiw-step"><div class="hiw-num">2</div><div class="hiw-text">Submit your YouTube link here during an active competition period</div></div>
                    <div class="hiw-step"><div class="hiw-num">3</div><div class="hiw-text">The community votes for their favorites</div></div>
                    <div class="hiw-step"><div class="hiw-num">4</div><div class="hiw-text">Top 10 clips win prizes when the period ends!</div></div>
                </div>
            </div>`;
    }

    function renderRules() {
        return `
            <div class="sidebar-card">
                <div class="sidebar-card-title">Rules</div>
                <ul class="rules-list">
                    <li>Video must contain <strong>#ELDEROS</strong> tag</li>
                    <li>Max 2 submissions per period</li>
                    <li>No duplicate videos across submissions</li>
                    <li>Account must be at least 7 days old</li>
                    <li>You cannot vote for your own clips</li>
                    <li>Vote manipulation will result in a ban</li>
                </ul>
            </div>`;
    }

    function renderUserStats() {
        if (!_myStats) return '';
        return `
            <div class="sidebar-card">
                <div class="sidebar-card-title">Your Stats</div>
                <div class="user-stats">
                    <div class="user-stat"><div class="user-stat-value">${_myStats.totalSubmissions || 0}</div><div class="user-stat-label">Submissions</div></div>
                    <div class="user-stat"><div class="user-stat-value">${_myStats.totalVotesCast || 0}</div><div class="user-stat-label">Votes Cast</div></div>
                    <div class="user-stat"><div class="user-stat-value">${_myStats.totalWins || 0}</div><div class="user-stat-label">Wins</div></div>
                    <div class="user-stat"><div class="user-stat-value">${_myStats.currentPeriodSubs || 0}/2</div><div class="user-stat-label">This Period</div></div>
                </div>
            </div>`;
    }

    // ── Event Binding ─────────────────────────────────

    function bindSortButtons() {
        document.querySelectorAll('.clips-sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sort = btn.dataset.sort;
                if (sort === _submissionsSort) return;
                _submissionsSort = sort;
                document.querySelectorAll('.clips-sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === sort));
                _submissionsPage = 1;
                _hasMoreSubs = true;
                loadSubmissions(false).then(() => renderSubmissions());
            });
        });
    }

    function bindSubmitButton() {
        const btn = document.getElementById('clips-submit-btn');
        if (btn) btn.addEventListener('click', showSubmitModal);
    }

    function bindLoadMore() {
        const btn = document.getElementById('clips-load-more-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                btn.textContent = 'Loading...';
                await loadSubmissions(true);
                renderSubmissions();
                btn.disabled = false;
                btn.textContent = 'Load More';
            });
        }
    }

    function bindFeaturedCard() {
        const card = document.getElementById('featured-card');
        if (card) {
            card.addEventListener('click', () => {
                const vid = card.dataset.videoId;
                if (vid) window.open('https://www.youtube.com/watch?v=' + vid, '_blank');
            });
        }
    }

    function bindVoteButtons() {
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!isLoggedIn()) return showToast('Log in to vote', 'error');

                const subId = btn.dataset.subId;
                if (_votePending[subId]) return;
                _votePending[subId] = true;

                const isVoted = btn.classList.contains('voted');
                const countEl = document.getElementById('vote-count-' + subId);
                const currentCount = parseInt(countEl.textContent) || 0;

                // Optimistic update
                btn.classList.toggle('voted');
                countEl.textContent = isVoted ? Math.max(0, currentCount - 1) : currentCount + 1;

                try {
                    let data;
                    if (isVoted) {
                        data = await apiDelete('/submissions/' + subId + '/vote');
                    } else {
                        data = await apiPost('/submissions/' + subId + '/vote', {});
                    }
                    if (!data.success) {
                        // Revert
                        btn.classList.toggle('voted');
                        countEl.textContent = currentCount;
                        showToast(data.message || 'Vote failed', 'error');
                    } else {
                        _hasVotedMap[subId] = !isVoted;
                    }
                } catch {
                    // Revert
                    btn.classList.toggle('voted');
                    countEl.textContent = currentCount;
                    showToast('Vote failed', 'error');
                }

                _votePending[subId] = false;
            });
        });
    }

    function bindSubmissionCards() {
        document.querySelectorAll('.submission-thumb, .submission-title').forEach(el => {
            el.addEventListener('click', () => {
                const vid = el.dataset.videoId;
                if (vid) window.open('https://www.youtube.com/watch?v=' + vid, '_blank');
            });
        });

        // Top 10 items from featured
        document.querySelectorAll('.top10-item').forEach(item => {
            item.addEventListener('click', () => {
                const vid = item.dataset.videoId;
                if (vid) window.open('https://www.youtube.com/watch?v=' + vid, '_blank');
            });
        });
    }

    function bindDeleteButtons() {
        document.querySelectorAll('.submission-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Delete this submission? This cannot be undone.')) return;
                const subId = btn.dataset.subId;
                try {
                    const data = await apiDelete('/submissions/' + subId);
                    if (data.success) {
                        showToast('Submission deleted', 'success');
                        _submissions = _submissions.filter(s => String(s.id) !== String(subId));
                        renderSubmissions();
                        if (_myStats) {
                            _myStats.currentPeriodSubs = Math.max(0, (_myStats.currentPeriodSubs || 1) - 1);
                        }
                    } else {
                        showToast(data.message || 'Delete failed', 'error');
                    }
                } catch {
                    showToast('Delete failed', 'error');
                }
            });
        });
    }

    // ── Submit Modal ──────────────────────────────────

    function showSubmitModal() {
        // Remove existing modals
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <h2>Submit a Clip</h2>
                <div class="form-group">
                    <label>YouTube Video URL</label>
                    <input type="text" id="clip-url-input" placeholder="https://youtube.com/watch?v=...">
                    <div class="hint">Paste a YouTube link. Video must contain #ELDEROS in the title or description.</div>
                </div>
                <div id="clip-preview" style="display:none;margin-top:12px"></div>
                <div class="form-actions">
                    <button class="dash-btn dash-btn-secondary" id="clip-cancel-btn">Cancel</button>
                    <button class="dash-btn dash-btn-primary" id="clip-submit-confirm-btn">Submit Clip</button>
                </div>
            </div>`;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);

        document.getElementById('clip-cancel-btn').addEventListener('click', () => overlay.remove());

        document.getElementById('clip-submit-confirm-btn').addEventListener('click', async () => {
            const input = document.getElementById('clip-url-input');
            const url = input.value.trim();
            if (!url) return showToast('Enter a YouTube URL', 'error');

            const btn = document.getElementById('clip-submit-confirm-btn');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                const data = await apiPost('/submissions', { youtubeVideoUrl: url });
                if (data.success) {
                    overlay.remove();
                    showToast('Clip submitted successfully!', 'success');
                    // Reload submissions
                    _submissionsPage = 1;
                    await loadSubmissions(false);
                    renderSubmissions();
                    if (_myStats) {
                        _myStats.currentPeriodSubs = (_myStats.currentPeriodSubs || 0) + 1;
                    }
                } else {
                    showToast(data.message || 'Submission failed', 'error');
                }
            } catch {
                showToast('Submission failed', 'error');
            }

            btn.disabled = false;
            btn.textContent = 'Submit Clip';
        });
    }

    // ── Register Tab ──────────────────────────────────

    if (typeof window.CreatorsTabs !== 'undefined') {
        window.CreatorsTabs.register('clips', init);
    }
})();
