/**
 * Elderos Creators v2 — Single scrollable page.
 * Layout: Header → Video Feed (left) + Sidebar (right) → Bottom (affiliate or dashboard)
 */
(function () {
    'use strict';

    const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:8084' : 'https://api.elderos.io';
    const API = API_BASE + '/api/v1/creators';

    // State
    let _isAdmin = false;
    let _isCreator = false;
    let _channelData = null;
    let _currentOffset = 0;
    let _hasMore = true;
    const VIDEOS_PER_PAGE = 10;

    // ── Helpers ─────────────────────────────────────────

    function authHeaders() {
        const h = { 'Content-Type': 'application/json' };
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const token = Auth.getToken();
            if (token) h['Authorization'] = 'Bearer ' + token;
        }
        return h;
    }

    async function apiFetch(path, opts = {}) {
        const url = path.startsWith('http') ? path : API + path;
        const res = await fetch(url, { headers: authHeaders(), ...opts });
        return res.json();
    }

    async function apiPost(path, body) {
        return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
    }

    async function apiDelete(path) {
        return apiFetch(path, { method: 'DELETE' });
    }

    async function apiPatch(path) {
        return apiFetch(path, { method: 'PATCH' });
    }

    function formatNumber(n) {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return String(n);
    }

    function timeAgo(ms) {
        const diff = Date.now() - ms;
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return mins + 'm ago';
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + 'h ago';
        const days = Math.floor(hours / 24);
        if (days < 30) return days + 'd ago';
        const months = Math.floor(days / 30);
        return months + 'mo ago';
    }

    function formatDate(ms) {
        return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function esc(s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function showToast(msg, type = 'info') {
        const el = document.createElement('div');
        el.className = 'toast ' + type;
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }

    // ── Page Init ────────────────────────────────────────

    async function init() {
        const root = document.getElementById('creators-root');
        if (!root) return;

        // Build the page skeleton
        root.innerHTML = `
            <div class="page-content">
                <div class="page-hero">
                    <div class="page-title"><span class="page-title-accent">Creators</span></div>
                    <div class="page-sub">Community content creators, videos, and giveaways</div>
                </div>
                <div class="main-layout">
                    <div class="videos-section">
                        <div class="section-label">Latest Videos</div>
                        <div id="video-list" class="video-list"><div class="loading-spinner"></div></div>
                        <div id="load-more-row" class="load-more-row" style="display:none">
                            <button class="load-more-btn" id="load-more-btn">Load More</button>
                        </div>
                    </div>
                    <div class="sidebar">
                        <div class="section-label">Active Giveaways</div>
                        <div id="sidebar-giveaways" class="giveaways-sidebar"><div class="loading-spinner"></div></div>
                        <div class="section-label" style="margin-top:4px">Our Creators</div>
                        <div id="sidebar-creators" class="creators-card"><div class="loading-spinner"></div></div>
                    </div>
                </div>
                <div id="bottom-section"></div>
            </div>`;

        document.getElementById('load-more-btn').addEventListener('click', loadMoreVideos);

        // Fetch data in parallel
        const promises = [
            loadVideos(),
            loadFeatured()
        ];

        // Check creator status if logged in
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            promises.push(checkCreatorStatus());
        }

        await Promise.all(promises);

        // Render bottom section after we know the user's role
        renderBottomSection();
    }

    // ── Check Creator Status ─────────────────────────────

    async function checkCreatorStatus() {
        try {
            const data = await apiFetch('/channel');
            if (data.success) {
                _isCreator = true;
                _isAdmin = data.isAdmin === true;
                _channelData = data.channel;
            }
        } catch {
            // Not a creator or not logged in
        }
    }

    // ── Video Feed ──────────────────────────────────────

    async function loadVideos() {
        const list = document.getElementById('video-list');
        if (!list) return;

        try {
            const data = await apiFetch(`/public/videos?limit=${VIDEOS_PER_PAGE}&offset=0`);
            if (!data.success || !data.videos || !data.videos.length) {
                list.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.18);font-size:13px">No videos yet. Check back once creators sync their content.</div>';
                return;
            }
            _currentOffset = data.videos.length;
            _hasMore = data.hasMore === true;
            list.innerHTML = data.videos.map(v => videoCardHtml(v)).join('');
            bindVideoCards(list);
            updateLoadMoreButton();
        } catch (err) {
            list.innerHTML = '<div style="text-align:center;padding:40px;color:#f87171;font-size:13px">Failed to load videos</div>';
        }
    }

    async function loadMoreVideos() {
        const btn = document.getElementById('load-more-btn');
        const list = document.getElementById('video-list');
        if (!btn || !list) return;

        btn.disabled = true;
        btn.textContent = 'Loading...';

        try {
            const data = await apiFetch(`/public/videos?limit=${VIDEOS_PER_PAGE}&offset=${_currentOffset}`);
            if (data.success && data.videos && data.videos.length) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = data.videos.map(v => videoCardHtml(v)).join('');
                while (tempDiv.firstChild) {
                    list.appendChild(tempDiv.firstChild);
                }
                bindVideoCards(list);
                _currentOffset += data.videos.length;
                _hasMore = data.hasMore === true;
            } else {
                _hasMore = false;
            }
        } catch {
            showToast('Failed to load more videos', 'error');
        }

        btn.disabled = false;
        btn.textContent = 'Load More';
        updateLoadMoreButton();
    }

    function updateLoadMoreButton() {
        const row = document.getElementById('load-more-row');
        if (row) row.style.display = _hasMore ? '' : 'none';
    }

    function videoCardHtml(v) {
        const giveaway = v.giveaway;
        let gaBadge = '';
        if (giveaway) {
            if (giveaway.status === 'ACTIVE') {
                let detail = giveaway.winnerCount + ' winner' + (giveaway.winnerCount !== 1 ? 's' : '');
                if (giveaway.deadline) detail += ' &middot; ends ' + formatDate(giveaway.deadline);
                gaBadge = `
                    <div class="video-giveaway">
                        <span class="giveaway-pill active">&#127873; Active</span>
                        <span class="giveaway-prize">${esc(giveaway.prize || '')}</span>
                        <span class="giveaway-detail-text">&middot; ${detail}</span>
                    </div>`;
            } else if (giveaway.status === 'COMPLETED' && giveaway.winners && giveaway.winners.length) {
                const names = giveaway.winners.map(w => esc(w)).join(', ');
                gaBadge = `
                    <div class="video-giveaway">
                        <span class="giveaway-pill ended">Ended</span>
                        <span class="giveaway-detail-text" style="color:var(--text-secondary)">Won by: ${names}</span>
                    </div>`;
            }
        }

        const adminBtn = _isAdmin
            ? `<div class="video-admin-remove" data-yt-id="${esc(v.youtubeVideoId)}" title="Remove from feed">&times;</div>`
            : '';

        return `
            <div class="video-card" data-video-id="${esc(v.youtubeVideoId)}">
                ${adminBtn}
                <div class="video-thumb">
                    ${v.thumbnailUrl ? `<img src="${esc(v.thumbnailUrl)}" alt="" loading="lazy">` : ''}
                    ${v.duration ? `<span class="video-duration">${esc(v.duration)}</span>` : ''}
                </div>
                <div class="video-info">
                    <div class="video-title">${esc(v.title)}</div>
                    <div class="video-meta">
                        <span class="video-creator-name">${esc(v.creatorName || 'Creator')}</span>
                        <span class="video-meta-sep"></span>
                        <span>${formatNumber(v.viewCount || 0)} views</span>
                        <span class="video-meta-sep"></span>
                        <span>${timeAgo(v.publishedAt)}</span>
                    </div>
                    ${gaBadge}
                </div>
            </div>`;
    }

    function bindVideoCards(container) {
        container.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.video-admin-remove')) return;
                window.open('https://www.youtube.com/watch?v=' + card.dataset.videoId, '_blank');
            });
        });
        container.querySelectorAll('.video-admin-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleAdminHide(btn.dataset.ytId, btn.closest('.video-card'));
            });
        });
    }

    async function handleAdminHide(ytVideoId, cardEl) {
        if (!confirm('Remove this video from the Creators page? It stays on YouTube \u2014 this only hides it from Elderos.')) return;
        try {
            const data = await apiPatch('/admin/videos/' + ytVideoId + '/hide');
            if (data.success) {
                cardEl.style.transition = 'opacity 300ms';
                cardEl.style.opacity = '0';
                setTimeout(() => cardEl.remove(), 300);
                showToast('Video hidden', 'success');
            } else {
                showToast(data.message || 'Failed to hide video', 'error');
            }
        } catch {
            showToast('Failed to hide video', 'error');
        }
    }

    // ── Sidebar ─────────────────────────────────────────

    async function loadFeatured() {
        try {
            const data = await apiFetch('/public/featured');
            if (!data.success) return;
            renderSidebarGiveaways(data.activeGiveaways || []);
            renderSidebarCreators(data.creators || []);
        } catch {
            // Silently fail sidebar
        }
    }

    function renderSidebarGiveaways(giveaways) {
        const el = document.getElementById('sidebar-giveaways');
        if (!el) return;
        if (!giveaways.length) {
            el.innerHTML = '<div class="sidebar-empty">No active giveaways</div>';
            return;
        }
        el.innerHTML = giveaways.map(g => `
            <div class="giveaway-sidebar-item">
                <div class="giveaway-sidebar-thumb">
                    ${g.videoThumbnail ? `<img src="${esc(g.videoThumbnail)}" alt="" loading="lazy">` : ''}
                </div>
                <div class="giveaway-sidebar-info">
                    <div class="giveaway-sidebar-prize">${esc(g.prize || 'Giveaway')}</div>
                    <div class="giveaway-sidebar-meta">${g.winnerCount} winner${g.winnerCount !== 1 ? 's' : ''}${g.deadline ? ' &middot; Ends ' + formatDate(g.deadline) : ''}</div>
                </div>
            </div>`).join('');
    }

    function renderSidebarCreators(creators) {
        const el = document.getElementById('sidebar-creators');
        if (!el) return;
        if (!creators.length) {
            el.innerHTML = '<div class="sidebar-empty">No creators yet</div>';
            return;
        }
        el.innerHTML = '<div class="creator-list">' + creators.map(c => {
            const initial = (c.channelName || '?').charAt(0).toUpperCase();
            const avatar = c.channelAvatar
                ? `<div class="creator-avatar"><img src="${esc(c.channelAvatar)}" alt="" loading="lazy"></div>`
                : `<div class="creator-avatar-placeholder">${initial}</div>`;
            return `
                <a href="https://www.youtube.com/channel/${esc(c.youtubeChannelId)}" target="_blank" class="creator-item">
                    ${avatar}
                    <div class="creator-info">
                        <div class="creator-name">${esc(c.channelName)}</div>
                        <div class="creator-subs">${formatNumber(c.subscriberCount)} subs</div>
                        ${c.ign ? `<div class="creator-ign">IGN: ${esc(c.ign)}</div>` : ''}
                    </div>
                </a>`;
        }).join('') + '</div>';
    }

    // ── Bottom Section (rank-gated) ──────────────────────

    function renderBottomSection() {
        const el = document.getElementById('bottom-section');
        if (!el) return;

        if (_isCreator) {
            renderDashboardSection(el);
        } else {
            renderAffiliateSection(el);
        }
    }

    function renderAffiliateSection(el) {
        el.innerHTML = `
            <div class="section-divider">
                <div class="section-divider-line"></div>
                <span class="section-divider-label">For Creators</span>
                <div class="section-divider-line"></div>
            </div>
            <div class="mgmt-section">
                <div class="affiliate-banner">
                    <div class="affiliate-icon">&#127916;</div>
                    <div class="affiliate-content">
                        <div class="affiliate-title">Join the Partner Program</div>
                        <div class="affiliate-desc">Create Elderos content and earn exclusive rewards. Get the YouTuber rank, promote your channel to every player, and run automated giveaways.</div>
                        <div class="affiliate-perks">
                            <span class="affiliate-perk">&#128081; YouTuber Rank</span>
                            <span class="affiliate-perk">&#128226; Channel Promotion</span>
                            <span class="affiliate-perk">&#127873; Giveaway Tools</span>
                            <span class="affiliate-perk">&#128176; Monthly Rewards</span>
                        </div>
                        <a href="https://elderos.io/pages/affiliate.html" class="affiliate-btn">Learn More &rarr;</a>
                    </div>
                </div>
            </div>`;
    }

    function renderDashboardSection(el) {
        el.innerHTML = `
            <div class="section-divider">
                <div class="section-divider-line"></div>
                <span class="section-divider-label">Creator Dashboard</span>
                <div class="section-divider-line"></div>
            </div>
            <div class="mgmt-section">
                <div class="dashboard-toggle">
                    <button class="dashboard-btn" id="dash-toggle-btn">
                        &#9881;&#65039; Manage Your Channel &amp; Giveaways <span class="dash-arrow">&#9660;</span>
                    </button>
                </div>
                <div class="dashboard-panel" id="dashboard-panel">
                    <div id="dash-content"><div class="loading-spinner"></div></div>
                </div>
            </div>`;

        document.getElementById('dash-toggle-btn').addEventListener('click', () => {
            const panel = document.getElementById('dashboard-panel');
            const arrow = document.querySelector('.dash-arrow');
            panel.classList.toggle('open');
            arrow.textContent = panel.classList.contains('open') ? '\u25B2' : '\u25BC';
            if (panel.classList.contains('open') && panel.querySelector('.loading-spinner')) {
                loadDashboard();
            }
        });
    }

    // ── Dashboard Content ────────────────────────────────

    async function loadDashboard() {
        const container = document.getElementById('dash-content');
        if (!container) return;

        if (_channelData) {
            renderDashboardLinked(container, _channelData);
        } else {
            renderDashboardUnlinked(container);
        }
    }

    function renderDashboardUnlinked(container) {
        container.innerHTML = `
            <div class="dash-link-form">
                <p>Link your YouTube channel to start syncing videos and creating giveaways.</p>
                <div class="dash-link-row">
                    <input type="text" id="link-channel-id" placeholder="YouTube Channel ID (e.g. UC1234abcd...)">
                    <button class="dash-btn dash-btn-primary" id="link-channel-btn">Link Channel</button>
                </div>
            </div>`;
        document.getElementById('link-channel-btn').addEventListener('click', handleLinkChannel);
    }

    function renderDashboardLinked(container, ch) {
        container.innerHTML = `
            <div class="dash-header">
                <div class="dash-header-left">
                    <div class="dash-channel-avatar">
                        ${ch.channelAvatar ? `<img src="${esc(ch.channelAvatar)}" alt="">` : ''}
                    </div>
                    <div>
                        <div class="dash-channel-name">${esc(ch.channelName)}</div>
                        <div class="dash-channel-subs">${formatNumber(ch.subscriberCount)} subscribers${ch.videoCount ? ' &middot; ' + ch.videoCount + ' videos synced' : ''}</div>
                    </div>
                </div>
                <div class="dash-actions">
                    <button class="dash-btn dash-btn-secondary" id="sync-videos-btn">Sync Videos</button>
                    <button class="dash-btn dash-btn-secondary" id="sync-channel-btn">Sync Channel</button>
                    <button class="dash-btn dash-btn-danger" id="unlink-btn">Unlink</button>
                </div>
            </div>
            <div class="dash-notice">
                <span class="dash-notice-icon">&#8505;&#65039;</span>
                <div class="dash-notice-content">
                    <div class="dash-notice-title">Video Tagging Required</div>
                    <div class="dash-notice-text">
                        Only videos containing your creator code will appear on the Elderos Creators page. Add the following code anywhere in your video <strong>title</strong> or <strong>description</strong>:
                        <br><br>
                        <span class="dash-notice-code">#ELDEROS</span>
                        <br><br>
                        Videos without this tag won't be synced. This ensures only Elderos content is promoted.
                    </div>
                </div>
            </div>
            <div class="dash-notice warning">
                <span class="dash-notice-icon">&#9888;&#65039;</span>
                <div class="dash-notice-content">
                    <div class="dash-notice-title">Strict Tag Policy</div>
                    <div class="dash-notice-text">
                        The <span class="dash-notice-code">#ELDEROS</span> tag must <strong>only</strong> be used on Elderos content. Using this tag on videos promoting other servers &mdash; even accidentally &mdash; will result in <strong>immediate revocation of your Creator status</strong> and removal from the partner program. Double-check every upload. No exceptions, no warnings.
                    </div>
                </div>
            </div>
            <div class="dash-section">
                <div class="dash-section-title">
                    <span>Your Giveaways</span>
                    <button class="dash-create-btn" id="create-ga-btn">+ Create Giveaway</button>
                </div>
                <div id="dash-giveaways-content"><div class="loading-spinner"></div></div>
            </div>`;

        document.getElementById('sync-videos-btn').addEventListener('click', handleSyncVideos);
        document.getElementById('sync-channel-btn').addEventListener('click', handleSyncChannel);
        document.getElementById('unlink-btn').addEventListener('click', handleUnlink);
        document.getElementById('create-ga-btn').addEventListener('click', showCreateGiveawayModal);

        loadDashGiveaways();
    }

    // ── Dashboard Actions ─────────────────────────────────

    async function handleLinkChannel() {
        const input = document.getElementById('link-channel-id');
        const btn = document.getElementById('link-channel-btn');
        if (!input || !input.value.trim()) return showToast('Enter a channel ID', 'error');

        btn.disabled = true;
        btn.textContent = 'Linking...';
        try {
            const data = await apiPost('/channel/link', { channelId: input.value.trim() });
            if (data.success) {
                showToast('Channel linked: ' + data.channelName, 'success');
                // Reload dashboard
                await checkCreatorStatus();
                loadDashboard();
            } else {
                showToast(data.message || 'Failed to link channel', 'error');
            }
        } catch {
            showToast('Failed to link channel', 'error');
        }
        btn.disabled = false;
        btn.textContent = 'Link Channel';
    }

    async function handleSyncVideos() {
        const btn = document.getElementById('sync-videos-btn');
        btn.disabled = true;
        btn.textContent = 'Syncing...';
        try {
            const data = await apiPost('/videos/sync', {});
            if (data.success) {
                let msg = `Synced: ${data.newVideos} new, ${data.updatedVideos} updated`;
                if (data.skippedNoTag > 0) msg += `, ${data.skippedNoTag} skipped (no #ELDEROS tag)`;
                if (data.autoHidden > 0) msg += `, ${data.autoHidden} auto-hidden`;
                showToast(msg, 'success');
                // Reload the video feed
                _currentOffset = 0;
                _hasMore = true;
                loadVideos();
            } else {
                showToast(data.message || 'Sync failed', 'error');
            }
        } catch {
            showToast('Sync failed', 'error');
        }
        btn.disabled = false;
        btn.textContent = 'Sync Videos';
    }

    async function handleSyncChannel() {
        const btn = document.getElementById('sync-channel-btn');
        btn.disabled = true;
        btn.textContent = 'Syncing...';
        try {
            const data = await apiPost('/channel/sync', {});
            if (data.success) {
                showToast('Channel synced', 'success');
                await checkCreatorStatus();
                loadDashboard();
            } else {
                showToast(data.message || 'Sync failed', 'error');
            }
        } catch {
            showToast('Sync failed', 'error');
        }
        btn.disabled = false;
        btn.textContent = 'Sync Channel';
    }

    async function handleUnlink() {
        if (!confirm('Unlink your channel? This will delete all cached videos.')) return;
        try {
            const data = await apiDelete('/channel');
            if (data.success) {
                showToast('Channel unlinked', 'success');
                _channelData = null;
                loadDashboard();
                loadVideos();
            } else {
                showToast(data.message || 'Failed to unlink', 'error');
            }
        } catch {
            showToast('Failed to unlink', 'error');
        }
    }

    // ── Dashboard Giveaways ───────────────────────────────

    async function loadDashGiveaways() {
        const el = document.getElementById('dash-giveaways-content');
        if (!el) return;

        try {
            const data = await apiFetch('/giveaways');
            if (!data.success || !data.giveaways || !data.giveaways.length) {
                el.innerHTML = '<div class="dash-empty">No giveaways yet. Create one to get started!</div>';
                return;
            }

            el.innerHTML = `<table class="dash-table">
                <thead><tr><th>Video</th><th>Prize</th><th>Winners</th><th>Entries</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>${data.giveaways.map(g => `<tr>
                    <td class="video-title-cell">${esc(g.videoTitle || g.youtubeVideoId)}</td>
                    <td class="prize-cell">${esc(g.prizeName || g.prizeId)}</td>
                    <td>${g.winnerCount}</td>
                    <td>${g.validEntries || 0}</td>
                    <td><span class="status-pill ${g.status.toLowerCase()}">${g.status}</span></td>
                    <td><div class="dash-action-btns">
                        <button class="dash-action-btn view-ga" data-id="${g.id}">View</button>
                        ${g.status === 'ACTIVE' ? `
                            <button class="dash-action-btn roll roll-ga" data-id="${g.id}">Roll</button>
                            <button class="dash-action-btn cancel cancel-ga" data-id="${g.id}">Cancel</button>
                        ` : ''}
                    </div></td>
                </tr>`).join('')}</tbody>
            </table>`;

            el.querySelectorAll('.view-ga').forEach(btn => btn.addEventListener('click', () => showGiveawayDetailModal(btn.dataset.id)));
            el.querySelectorAll('.roll-ga').forEach(btn => btn.addEventListener('click', () => handleRollGiveaway(btn.dataset.id)));
            el.querySelectorAll('.cancel-ga').forEach(btn => btn.addEventListener('click', () => handleCancelGiveaway(btn.dataset.id)));
        } catch {
            el.innerHTML = '<div class="dash-empty">Failed to load giveaways</div>';
        }
    }

    async function showGiveawayDetailModal(id) {
        const data = await apiFetch('/giveaways/' + id);
        if (!data.success) return showToast('Failed to load giveaway', 'error');

        const g = data.giveaway;
        const entries = g.entries || [];
        const valid = entries.filter(e => e.isValid);
        const winners = entries.filter(e => e.isWinner);

        let entriesHtml = '';
        if (entries.length) {
            entriesHtml = `<div style="max-height:300px;overflow-y:auto;margin-top:16px">
                <table class="dash-table"><thead><tr><th>IGN</th><th>YouTube</th><th>Valid</th><th>Winner</th></tr></thead><tbody>
                ${entries.map(e => `<tr>
                    <td>${esc(e.ign)}</td>
                    <td style="color:var(--text-muted)">${esc(e.youtubeDisplayName)}</td>
                    <td>${e.isValid ? '<span style="color:#4ade80">Yes</span>' : '<span style="color:#f87171">' + esc(e.invalidReason || 'No') + '</span>'}</td>
                    <td>${e.isWinner ? '<span style="color:var(--accent-light)">WINNER</span>' : ''}</td>
                </tr>`).join('')}
                </tbody></table></div>`;
        }

        showModal(`
            <h2>${esc(g.videoTitle || 'Giveaway #' + g.id)}</h2>
            <div class="stat-pills" style="margin-bottom:16px">
                <div class="stat-pill"><div class="label">Status</div><div class="value"><span class="status-pill ${g.status.toLowerCase()}">${g.status}</span></div></div>
                <div class="stat-pill"><div class="label">Prize</div><div class="value gold">${esc(g.prizeName || g.prizeId)}</div></div>
                <div class="stat-pill"><div class="label">Entries</div><div class="value green">${valid.length}</div></div>
                <div class="stat-pill"><div class="label">Winners</div><div class="value blue">${winners.length}/${g.winnerCount}</div></div>
            </div>
            ${entriesHtml}
            <div class="form-actions"><button class="dash-btn dash-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button></div>
        `);
    }

    async function handleRollGiveaway(id) {
        if (!confirm('Roll this giveaway? This will scan comments, pick winners, and mark it as completed.')) return;
        showToast('Rolling giveaway... this may take a moment', 'info');

        try {
            const data = await apiPost('/giveaways/' + id + '/roll', {});
            if (data.success) {
                const winnerNames = (data.winners || []).map(w => w.ign).join(', ');
                showToast(`Rolled! ${data.winnersSelected} winner(s): ${winnerNames}`, 'success');
                loadDashGiveaways();
                loadVideos(); // Refresh to show giveaway badges
            } else {
                showToast(data.message || 'Roll failed', 'error');
            }
        } catch {
            showToast('Roll failed', 'error');
        }
    }

    async function handleCancelGiveaway(id) {
        if (!confirm('Cancel this giveaway? All entries will be deleted.')) return;
        try {
            const data = await apiPost('/giveaways/' + id + '/cancel', {});
            if (data.success) {
                showToast('Giveaway cancelled', 'success');
                loadDashGiveaways();
            } else {
                showToast(data.message || 'Cancel failed', 'error');
            }
        } catch {
            showToast('Cancel failed', 'error');
        }
    }

    async function showCreateGiveawayModal() {
        let videosData, prizesData;
        try {
            [videosData, prizesData] = await Promise.all([
                apiFetch('/videos?limit=50'),
                apiFetch('/prizes')
            ]);
        } catch (err) {
            return showToast('Failed to load videos or prizes', 'error');
        }

        const videos = videosData.videos || [];
        const prizes = prizesData.prizes || [];

        if (!videos.length) return showToast('Sync your videos first before creating a giveaway', 'error');
        if (!prizes.length) return showToast('No prize tiers configured \u2014 add giveaway_prizes to hub_configurations.yaml', 'error');

        const videoOptions = videos.map(v => `<option value="${esc(v.youtubeVideoId)}">${esc(v.title)}</option>`).join('');
        const prizeOptions = prizes.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');

        showModal(`
            <h2>Create Giveaway</h2>
            <div class="form-group">
                <label>Video</label>
                <select id="ga-video">${videoOptions}</select>
            </div>
            <div class="form-group">
                <label>Prize Tier</label>
                <select id="ga-prize">${prizeOptions}</select>
            </div>
            <div class="form-group">
                <label>Number of Winners</label>
                <input type="number" id="ga-winners" value="1" min="1" max="50">
            </div>
            <div class="form-group">
                <label>Comment Pattern (regex)</label>
                <input type="text" id="ga-pattern" placeholder="IGN:\\s*([a-zA-Z0-9_ -]{1,12})">
                <div class="hint">Group 1 captures the IGN. Leave blank for default.</div>
            </div>
            <div class="form-actions">
                <button class="dash-btn dash-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="dash-btn dash-btn-primary" id="ga-create-btn">Create</button>
            </div>
        `);

        document.getElementById('ga-create-btn').addEventListener('click', async () => {
            const btn = document.getElementById('ga-create-btn');
            btn.disabled = true;
            btn.textContent = 'Creating...';

            const body = {
                videoId: document.getElementById('ga-video').value,
                prizeId: document.getElementById('ga-prize').value,
                winnerCount: parseInt(document.getElementById('ga-winners').value) || 1,
            };
            const pattern = document.getElementById('ga-pattern').value.trim();
            if (pattern) body.commentPattern = pattern;

            try {
                const data = await apiPost('/giveaways', body);
                if (data.success) {
                    document.querySelector('.modal-overlay').remove();
                    showToast('Giveaway created!', 'success');
                    loadDashGiveaways();
                } else {
                    showToast(data.message || 'Failed to create giveaway', 'error');
                }
            } catch {
                showToast('Failed to create giveaway', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Create';
        });
    }

    // ── Modal Utility ────────────────────────────────────

    function showModal(innerHtml) {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    // ── Init ─────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
