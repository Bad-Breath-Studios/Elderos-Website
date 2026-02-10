/**
 * Elderos Creators — SPA with hash-based routing.
 * Views: Media Feed (#/), Creator Profile (#/creator/{accountId}),
 *        Giveaway Detail (#/giveaway/{id}), Dashboard (#/dashboard)
 */
(function () {
    'use strict';

    const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:8084' : 'https://api.elderos.io';
    const API = API_BASE + '/api/v1/creators';

    const root = document.getElementById('creators-root');

    // ── Router ──────────────────────────────────────────

    function route() {
        const hash = window.location.hash || '#/';
        if (hash.startsWith('#/dashboard')) renderDashboard();
        else if (hash.startsWith('#/giveaway/')) renderGiveawayDetail(hash.split('/')[2]);
        else if (hash.startsWith('#/creator/')) renderCreatorProfile(hash.split('/')[2]);
        else renderMediaFeed();
    }

    window.addEventListener('hashchange', route);

    // ── Helpers ─────────────────────────────────────────

    function isCreator() {
        return typeof Auth !== 'undefined' && Auth.isLoggedIn();
    }

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

    function escapeHtml(s) {
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

    // ── Media Feed View ─────────────────────────────────

    async function renderMediaFeed() {
        root.innerHTML = `
            <div class="creators-container">
                <div class="page-header">
                    <h1>Creators</h1>
                    <p>Community content creators, videos, and giveaways</p>
                </div>
                <div class="tab-nav">
                    <button class="tab-btn active" data-tab="videos">Videos</button>
                    <button class="tab-btn" data-tab="creators">Creators</button>
                    <button class="tab-btn" data-tab="giveaways">Giveaways</button>
                    ${isCreator() ? '<button class="tab-btn" data-tab="dashboard">Dashboard</button>' : ''}
                </div>
                <div id="feed-content"><div class="loading-spinner"></div></div>
            </div>`;

        // Tab click handlers
        root.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tab === 'dashboard') {
                    window.location.hash = '#/dashboard';
                    return;
                }
                root.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadFeedTab(btn.dataset.tab);
            });
        });

        loadFeedTab('videos');
    }

    async function loadFeedTab(tab) {
        const content = document.getElementById('feed-content');
        if (!content) return;
        content.innerHTML = '<div class="loading-spinner"></div>';

        if (tab === 'videos') {
            const data = await apiFetch('/public/videos?limit=30&offset=0');
            if (!data.success || !data.videos.length) {
                content.innerHTML = '<div class="empty-state"><div class="icon">&#127909;</div><h3>No videos yet</h3><p>Content creators will share their videos here.</p></div>';
                return;
            }
            content.innerHTML = '<div class="media-grid">' + data.videos.map(v => videoCardHtml(v)).join('') + '</div>';
            content.querySelectorAll('.video-card').forEach(card => {
                card.addEventListener('click', () => {
                    window.open('https://www.youtube.com/watch?v=' + card.dataset.videoId, '_blank');
                });
            });
        } else if (tab === 'creators') {
            const data = await apiFetch('/public/creators');
            if (!data.success || !data.creators.length) {
                content.innerHTML = '<div class="empty-state"><div class="icon">&#127908;</div><h3>No creators yet</h3><p>Content creators will appear here once they link their channel.</p></div>';
                return;
            }
            content.innerHTML = '<div class="creator-grid">' + data.creators.map(c => creatorCardHtml(c)).join('') + '</div>';
            content.querySelectorAll('.creator-card').forEach(card => {
                card.addEventListener('click', () => {
                    window.location.hash = '#/creator/' + card.dataset.accountId;
                });
            });
        } else if (tab === 'giveaways') {
            const data = await apiFetch('/public/giveaways');
            if (!data.success || !data.giveaways.length) {
                content.innerHTML = '<div class="empty-state"><div class="icon">&#127873;</div><h3>No active giveaways</h3><p>Check back later for creator giveaways!</p></div>';
                return;
            }
            content.innerHTML = '<div class="giveaway-list">' + data.giveaways.map(g => giveawayBannerHtml(g)).join('') + '</div>';
            content.querySelectorAll('.giveaway-banner').forEach(banner => {
                banner.addEventListener('click', () => {
                    window.location.hash = '#/giveaway/' + banner.dataset.id;
                });
            });
        }
    }

    function videoCardHtml(v) {
        return `
            <div class="video-card" data-video-id="${escapeHtml(v.youtubeVideoId)}">
                <div class="video-thumb">
                    <img src="${escapeHtml(v.thumbnailUrl || '')}" alt="" loading="lazy">
                </div>
                <div class="video-info">
                    <div class="video-title">${escapeHtml(v.title)}</div>
                    <div class="video-meta">
                        <span class="video-creator">${escapeHtml(v.creatorName || 'Creator')}</span>
                        <span class="video-views">${formatNumber(v.viewCount || 0)} views</span>
                        <span class="video-views">${timeAgo(v.publishedAt)}</span>
                    </div>
                </div>
            </div>`;
    }

    function creatorCardHtml(c) {
        const initial = (c.channelName || '?').charAt(0).toUpperCase();
        const avatar = c.channelAvatar
            ? `<img class="creator-avatar" src="${escapeHtml(c.channelAvatar)}" alt="" loading="lazy">`
            : `<div class="creator-avatar-placeholder">${initial}</div>`;
        return `
            <div class="creator-card" data-account-id="${c.accountId}">
                ${avatar}
                <div class="creator-info">
                    <h3>${escapeHtml(c.channelName)}</h3>
                    <div class="creator-stats">
                        <span>${formatNumber(c.subscriberCount)} subs</span>
                        ${c.username ? '<span>' + escapeHtml(c.username) + '</span>' : ''}
                    </div>
                </div>
            </div>`;
    }

    function giveawayBannerHtml(g) {
        return `
            <div class="giveaway-banner" data-id="${g.id}">
                <div class="thumb">
                    ${g.videoThumbnail ? `<img src="${escapeHtml(g.videoThumbnail)}" alt="" loading="lazy">` : ''}
                </div>
                <div class="info">
                    <h3>${escapeHtml(g.videoTitle || 'Giveaway')}</h3>
                    <div class="prize-line">${escapeHtml(g.prizeName || g.prizeId)}</div>
                    <div class="meta-line">
                        ${g.winnerCount} winner${g.winnerCount !== 1 ? 's' : ''} &middot;
                        by ${escapeHtml(g.creatorName || 'Creator')} &middot;
                        <span class="giveaway-status-pill ${g.status.toLowerCase()}">${g.status}</span>
                    </div>
                </div>
            </div>`;
    }

    // ── Creator Profile View ────────────────────────────

    async function renderCreatorProfile(accountId) {
        root.innerHTML = '<div class="creators-container"><div class="loading-spinner"></div></div>';

        const [creatorsData, videosData] = await Promise.all([
            apiFetch('/public/creators'),
            apiFetch('/public/videos?limit=50&offset=0')
        ]);

        const creator = (creatorsData.creators || []).find(c => String(c.accountId) === String(accountId));
        if (!creator) {
            root.innerHTML = '<div class="creators-container"><div class="empty-state"><h3>Creator not found</h3></div></div>';
            return;
        }

        const creatorVideos = (videosData.videos || []).filter(v => String(v.creatorAccountId) === String(accountId));
        const initial = (creator.channelName || '?').charAt(0).toUpperCase();
        const avatarImg = creator.channelAvatar
            ? `<img src="${escapeHtml(creator.channelAvatar)}" alt="">`
            : `<div class="creator-avatar-placeholder" style="width:80px;height:80px;font-size:2rem">${initial}</div>`;

        root.innerHTML = `
            <div class="creators-container">
                <a class="back-link" href="#/">&larr; Back to Creators</a>
                <div class="creator-profile-header">
                    ${avatarImg}
                    <div class="info">
                        <h2>${escapeHtml(creator.channelName)}</h2>
                        <div class="stats">
                            <span><strong>${formatNumber(creator.subscriberCount)}</strong> subscribers</span>
                            <span><strong>${creatorVideos.length}</strong> videos</span>
                            ${creator.username ? '<span>IGN: <strong>' + escapeHtml(creator.username) + '</strong></span>' : ''}
                        </div>
                    </div>
                </div>
                ${creatorVideos.length ? '<div class="media-grid">' + creatorVideos.map(v => videoCardHtml(v)).join('') + '</div>' : '<div class="empty-state"><h3>No videos yet</h3></div>'}
            </div>`;

        root.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                window.open('https://www.youtube.com/watch?v=' + card.dataset.videoId, '_blank');
            });
        });
    }

    // ── Giveaway Detail View ────────────────────────────

    async function renderGiveawayDetail(giveawayId) {
        root.innerHTML = '<div class="creators-container"><div class="loading-spinner"></div></div>';

        const data = await apiFetch('/public/giveaways/' + giveawayId);
        if (!data.success) {
            root.innerHTML = '<div class="creators-container"><div class="empty-state"><h3>Giveaway not found</h3></div></div>';
            return;
        }

        const g = data.giveaway;
        let winnersHtml = '';
        if (g.winners && g.winners.length) {
            winnersHtml = `
                <div class="winners-section">
                    <h3>Winners</h3>
                    <div class="winner-list">
                        ${g.winners.map((w, i) => `
                            <div class="winner-row">
                                <div class="winner-rank">${i + 1}</div>
                                <span class="winner-name">${escapeHtml(w.ign)}</span>
                                <span class="winner-yt">${escapeHtml(w.youtubeDisplayName)}</span>
                            </div>`).join('')}
                    </div>
                </div>`;
        }

        root.innerHTML = `
            <div class="creators-container">
                <a class="back-link" href="#/">&larr; Back to Creators</a>
                <div class="giveaway-detail">
                    <div class="video-embed">
                        <iframe src="https://www.youtube.com/embed/${escapeHtml(g.youtubeVideoId)}"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen></iframe>
                    </div>
                    <div class="detail-header">
                        <h2>${escapeHtml(g.videoTitle || 'Giveaway')}</h2>
                        <span class="giveaway-status-pill ${g.status.toLowerCase()}">${g.status}</span>
                    </div>
                    <div class="stat-pills">
                        <div class="stat-pill">
                            <div class="label">Prize</div>
                            <div class="value gold">${escapeHtml(g.prizeName || g.prizeId)}</div>
                        </div>
                        <div class="stat-pill">
                            <div class="label">Winners</div>
                            <div class="value blue">${g.winnerCount}</div>
                        </div>
                        <div class="stat-pill">
                            <div class="label">Entries</div>
                            <div class="value green">${g.validEntries || 0}</div>
                        </div>
                        ${g.deadline ? `<div class="stat-pill"><div class="label">Deadline</div><div class="value">${new Date(g.deadline).toLocaleDateString()}</div></div>` : ''}
                    </div>
                    ${winnersHtml}
                </div>
            </div>`;
    }

    // ── Dashboard View ──────────────────────────────────

    async function renderDashboard() {
        if (!isCreator()) {
            root.innerHTML = '<div class="creators-container"><div class="empty-state"><h3>Log in to access the Dashboard</h3><p>You need a YOUTUBER rank or above.</p></div></div>';
            return;
        }

        root.innerHTML = `
            <div class="creators-container">
                <a class="back-link" href="#/">&larr; Back to Creators</a>
                <div class="page-header">
                    <h1>Creator Dashboard</h1>
                    <p>Manage your channel, videos, and giveaways</p>
                </div>
                <div id="dash-channel" class="dashboard-section"><div class="loading-spinner"></div></div>
                <div id="dash-videos" class="dashboard-section"></div>
                <div id="dash-giveaways" class="dashboard-section"></div>
            </div>`;

        loadDashChannel();
    }

    async function loadDashChannel() {
        const section = document.getElementById('dash-channel');
        if (!section) return;

        const data = await apiFetch('/channel');
        if (!data.success) {
            if (data.error === 'insufficient_rank') {
                section.innerHTML = '<div class="dashboard-card"><p style="color:var(--text-muted)">You need YOUTUBER rank or above to use this dashboard.</p></div>';
                return;
            }
            section.innerHTML = '<div class="dashboard-card"><p style="color:var(--red)">Failed to load channel info.</p></div>';
            return;
        }

        if (!data.channel) {
            // Not linked yet — show link form
            section.innerHTML = `
                <h2>Link Your Channel</h2>
                <div class="dashboard-card">
                    <p style="color:var(--text-muted);margin:0 0 16px">Enter your YouTube Channel ID to get started.</p>
                    <div class="link-form">
                        <div class="field">
                            <label>YouTube Channel ID</label>
                            <input type="text" id="link-channel-id" placeholder="e.g. UC1234abcd...">
                        </div>
                        <button class="btn btn-primary" id="link-channel-btn">Link Channel</button>
                    </div>
                </div>`;
            document.getElementById('link-channel-btn').addEventListener('click', handleLinkChannel);
            return;
        }

        // Channel is linked
        const ch = data.channel;
        section.innerHTML = `
            <h2>Your Channel</h2>
            <div class="dashboard-card">
                <div class="channel-linked">
                    <img src="${escapeHtml(ch.channelAvatar || '')}" alt="">
                    <div class="channel-info">
                        <h3>${escapeHtml(ch.channelName)}</h3>
                        <p>${formatNumber(ch.subscriberCount)} subscribers${ch.lastSyncedAt ? ' &middot; Last synced ' + timeAgo(ch.lastSyncedAt) : ''}</p>
                    </div>
                    <div class="channel-actions">
                        <button class="btn btn-secondary" id="sync-channel-btn">Sync Channel</button>
                        <button class="btn btn-danger" id="unlink-channel-btn">Unlink</button>
                    </div>
                </div>
            </div>`;

        document.getElementById('sync-channel-btn').addEventListener('click', handleSyncChannel);
        document.getElementById('unlink-channel-btn').addEventListener('click', handleUnlinkChannel);

        // Load videos & giveaways
        loadDashVideos();
        loadDashGiveaways();
    }

    async function handleLinkChannel() {
        const input = document.getElementById('link-channel-id');
        const btn = document.getElementById('link-channel-btn');
        if (!input || !input.value.trim()) return showToast('Enter a channel ID', 'error');

        btn.disabled = true;
        btn.textContent = 'Linking...';
        const data = await apiPost('/channel/link', { channelId: input.value.trim() });
        btn.disabled = false;
        btn.textContent = 'Link Channel';

        if (data.success) {
            showToast('Channel linked: ' + data.channelName, 'success');
            loadDashChannel();
        } else {
            showToast(data.message || 'Failed to link channel', 'error');
        }
    }

    async function handleSyncChannel() {
        const btn = document.getElementById('sync-channel-btn');
        btn.disabled = true;
        btn.textContent = 'Syncing...';
        const data = await apiPost('/channel/sync', {});
        btn.disabled = false;
        btn.textContent = 'Sync Channel';

        if (data.success) {
            showToast('Channel synced', 'success');
            loadDashChannel();
        } else {
            showToast(data.message || 'Sync failed', 'error');
        }
    }

    async function handleUnlinkChannel() {
        if (!confirm('Unlink your channel? This will delete all cached videos.')) return;
        const data = await apiDelete('/channel');
        if (data.success) {
            showToast('Channel unlinked', 'success');
            loadDashChannel();
            document.getElementById('dash-videos').innerHTML = '';
            document.getElementById('dash-giveaways').innerHTML = '';
        } else {
            showToast(data.message || 'Failed to unlink', 'error');
        }
    }

    async function loadDashVideos() {
        const section = document.getElementById('dash-videos');
        if (!section) return;

        section.innerHTML = `
            <h2>Your Videos</h2>
            <div style="margin-bottom:12px"><button class="btn btn-secondary" id="sync-videos-btn">Sync from YouTube</button></div>
            <div id="dash-videos-list"><div class="loading-spinner"></div></div>`;

        document.getElementById('sync-videos-btn').addEventListener('click', async () => {
            const btn = document.getElementById('sync-videos-btn');
            btn.disabled = true;
            btn.textContent = 'Syncing...';
            const data = await apiPost('/videos/sync', {});
            btn.disabled = false;
            btn.textContent = 'Sync from YouTube';
            if (data.success) {
                showToast(`Synced: ${data.newVideos} new, ${data.updatedVideos} updated`, 'success');
                loadDashVideos();
            } else {
                showToast(data.message || 'Sync failed', 'error');
            }
        });

        const data = await apiFetch('/videos?limit=50');
        const list = document.getElementById('dash-videos-list');
        if (!list) return;

        if (!data.success || !data.videos.length) {
            list.innerHTML = '<div class="empty-state"><p>No videos. Click "Sync from YouTube" to fetch your recent videos.</p></div>';
            return;
        }

        list.innerHTML = '<div class="media-grid">' + data.videos.map(v => videoCardHtml(v)).join('') + '</div>';
        list.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                window.open('https://www.youtube.com/watch?v=' + card.dataset.videoId, '_blank');
            });
        });
    }

    async function loadDashGiveaways() {
        const section = document.getElementById('dash-giveaways');
        if (!section) return;

        section.innerHTML = `
            <h2>Your Giveaways</h2>
            <div style="margin-bottom:12px"><button class="btn btn-primary" id="create-giveaway-btn">Create Giveaway</button></div>
            <div id="dash-giveaway-list"><div class="loading-spinner"></div></div>`;

        document.getElementById('create-giveaway-btn').addEventListener('click', showCreateGiveawayModal);

        const data = await apiFetch('/giveaways');
        const list = document.getElementById('dash-giveaway-list');
        if (!list) return;

        if (!data.success || !data.giveaways.length) {
            list.innerHTML = '<div class="empty-state"><p>No giveaways yet. Create one to get started!</p></div>';
            return;
        }

        let html = `<table class="giveaway-table">
            <thead><tr><th>Video</th><th>Prize</th><th>Winners</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
        for (const g of data.giveaways) {
            html += `<tr>
                <td>${escapeHtml(g.videoTitle || g.youtubeVideoId)}</td>
                <td style="color:var(--gold)">${escapeHtml(g.prizeName || g.prizeId)}</td>
                <td>${g.winnerCount}</td>
                <td><span class="giveaway-status-pill ${g.status.toLowerCase()}">${g.status}</span></td>
                <td class="actions">
                    <button class="btn btn-secondary view-ga-btn" data-id="${g.id}">View</button>
                    ${g.status === 'ACTIVE' ? `
                        <button class="btn btn-success roll-ga-btn" data-id="${g.id}">Roll</button>
                        <button class="btn btn-danger cancel-ga-btn" data-id="${g.id}">Cancel</button>
                    ` : ''}
                </td>
            </tr>`;
        }
        html += '</tbody></table>';
        list.innerHTML = html;

        // Event listeners
        list.querySelectorAll('.view-ga-btn').forEach(btn => {
            btn.addEventListener('click', () => showGiveawayDetailModal(btn.dataset.id));
        });
        list.querySelectorAll('.roll-ga-btn').forEach(btn => {
            btn.addEventListener('click', () => handleRollGiveaway(btn.dataset.id));
        });
        list.querySelectorAll('.cancel-ga-btn').forEach(btn => {
            btn.addEventListener('click', () => handleCancelGiveaway(btn.dataset.id));
        });
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
                <table class="giveaway-table"><thead><tr><th>IGN</th><th>YouTube</th><th>Valid</th><th>Winner</th></tr></thead><tbody>`;
            for (const e of entries) {
                entriesHtml += `<tr>
                    <td>${escapeHtml(e.ign)}</td>
                    <td style="color:var(--text-muted)">${escapeHtml(e.youtubeDisplayName)}</td>
                    <td>${e.isValid ? '<span style="color:var(--green)">Yes</span>' : '<span style="color:var(--red)">' + escapeHtml(e.invalidReason || 'No') + '</span>'}</td>
                    <td>${e.isWinner ? '<span style="color:var(--gold)">WINNER</span>' : ''}</td>
                </tr>`;
            }
            entriesHtml += '</tbody></table></div>';
        }

        showModal(`
            <h2>${escapeHtml(g.videoTitle || 'Giveaway #' + g.id)}</h2>
            <div class="stat-pills" style="margin-bottom:16px">
                <div class="stat-pill"><div class="label">Status</div><div class="value"><span class="giveaway-status-pill ${g.status.toLowerCase()}">${g.status}</span></div></div>
                <div class="stat-pill"><div class="label">Prize</div><div class="value gold">${escapeHtml(g.prizeName || g.prizeId)}</div></div>
                <div class="stat-pill"><div class="label">Entries</div><div class="value green">${valid.length}</div></div>
                <div class="stat-pill"><div class="label">Winners</div><div class="value blue">${winners.length}/${g.winnerCount}</div></div>
            </div>
            ${entriesHtml}
            <div class="form-actions"><button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button></div>
        `);
    }

    async function handleRollGiveaway(id) {
        if (!confirm('Roll this giveaway? This will scan comments, pick winners, and mark it as completed.')) return;
        showToast('Rolling giveaway... this may take a moment', 'info');

        const data = await apiPost('/giveaways/' + id + '/roll', {});
        if (data.success) {
            const winnerNames = (data.winners || []).map(w => w.ign).join(', ');
            showToast(`Rolled! ${data.winnersSelected} winner(s): ${winnerNames}`, 'success');
            loadDashGiveaways();
        } else {
            showToast(data.message || 'Roll failed', 'error');
        }
    }

    async function handleCancelGiveaway(id) {
        if (!confirm('Cancel this giveaway? All entries will be deleted.')) return;
        const data = await apiPost('/giveaways/' + id + '/cancel', {});
        if (data.success) {
            showToast('Giveaway cancelled', 'success');
            loadDashGiveaways();
        } else {
            showToast(data.message || 'Cancel failed', 'error');
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
            console.error('Failed to load giveaway data:', err);
            return showToast('Failed to load videos or prizes — check console', 'error');
        }

        const videos = videosData.videos || [];
        const prizes = prizesData.prizes || [];

        if (!videos.length) return showToast('Sync your videos first before creating a giveaway', 'error');
        if (!prizes.length) return showToast('No prize tiers configured — add giveaway_prizes to hub_configurations.yaml', 'error');

        const videoOptions = videos.map(v => `<option value="${escapeHtml(v.youtubeVideoId)}">${escapeHtml(v.title)}</option>`).join('');
        const prizeOptions = prizes.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');

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
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" id="ga-create-btn">Create</button>
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

            const data = await apiPost('/giveaways', body);
            btn.disabled = false;
            btn.textContent = 'Create';

            if (data.success) {
                document.querySelector('.modal-overlay').remove();
                showToast('Giveaway created!', 'success');
                loadDashGiveaways();
            } else {
                showToast(data.message || 'Failed to create giveaway', 'error');
            }
        });
    }

    // ── Modal Utility ───────────────────────────────────

    function showModal(innerHtml) {
        // Remove existing
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    // ── Init ────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', route);
    } else {
        route();
    }
})();
