/* ================================================================
   Elderos Adventurers — Profile v3
   World tabs, rank theming, likes, skill grades, PVP view
   ================================================================ */
(function () {
    'use strict';

    // === Config ===
    const API_BASE = (() => {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h === '' || window.location.protocol === 'file:')
            return 'http://localhost:8084';
        return 'https://api.elderos.io';
    })();

    // OSRS skill display order (3-column grid, reads left→right, top→bottom)
    const SKILLS = [
        { key: 'attack',       name: 'Attack',        icon: '/shared/sprites/skills/attack.png' },
        { key: 'hitpoints',    name: 'Hitpoints',     icon: '/shared/sprites/skills/constitution.png' },
        { key: 'mining',       name: 'Mining',        icon: '/shared/sprites/skills/mining.png' },
        { key: 'strength',     name: 'Strength',      icon: '/shared/sprites/skills/strength.png' },
        { key: 'agility',      name: 'Agility',       icon: '/shared/sprites/skills/agility.png' },
        { key: 'smithing',     name: 'Smithing',      icon: '/shared/sprites/skills/smithing.png' },
        { key: 'defence',      name: 'Defence',       icon: '/shared/sprites/skills/defence.png' },
        { key: 'herblore',     name: 'Herblore',      icon: '/shared/sprites/skills/herblore.png' },
        { key: 'fishing',      name: 'Fishing',       icon: '/shared/sprites/skills/fishing.png' },
        { key: 'ranged',       name: 'Ranged',        icon: '/shared/sprites/skills/range.png' },
        { key: 'thieving',     name: 'Thieving',      icon: '/shared/sprites/skills/thieving.png' },
        { key: 'cooking',      name: 'Cooking',       icon: '/shared/sprites/skills/cooking.png' },
        { key: 'prayer',       name: 'Prayer',        icon: '/shared/sprites/skills/prayer.png' },
        { key: 'crafting',     name: 'Crafting',      icon: '/shared/sprites/skills/crafting.png' },
        { key: 'firemaking',   name: 'Firemaking',    icon: '/shared/sprites/skills/firemaking.png' },
        { key: 'magic',        name: 'Magic',         icon: '/shared/sprites/skills/magic.png' },
        { key: 'fletching',    name: 'Fletching',     icon: '/shared/sprites/skills/fletching.png' },
        { key: 'woodcutting',  name: 'Woodcutting',   icon: '/shared/sprites/skills/woodcutting.png' },
        { key: 'runecraft',    name: 'Runecraft',     icon: '/shared/sprites/skills/runecrafting.png' },
        { key: 'slayer',       name: 'Slayer',        icon: '/shared/sprites/skills/slayer.png' },
        { key: 'farming',      name: 'Farming',       icon: '/shared/sprites/skills/farming.png' },
        { key: 'augmentation', name: 'Augmentation',   icon: '/shared/sprites/skills/augmentation.png' },
        { key: 'hunter',       name: 'Hunter',        icon: '/shared/sprites/skills/hunter.png' },
    ];

    const STAFF_MAP = {
        OWNER: 'Owner', DEVELOPER: 'Developer', MANAGER: 'Manager',
        ADMINISTRATOR: 'Admin', HEAD_MODERATOR: 'Head Mod',
        MODERATOR: 'Moderator', SUPPORT: 'Support', YOUTUBER: 'YouTuber',
    };

    const STAFF_ICONS = {
        OWNER: '/shared/sprites/staff-ranks/OWNER.png',
        DEVELOPER: '/shared/sprites/staff-ranks/DEVELOPER.png',
        MANAGER: '/shared/sprites/staff-ranks/MANAGER.png',
        ADMINISTRATOR: '/shared/sprites/staff-ranks/ADMIN.png',
        HEAD_MODERATOR: '/shared/sprites/staff-ranks/MOD.png',
        MODERATOR: '/shared/sprites/staff-ranks/MOD.png',
        SUPPORT: '/shared/sprites/staff-ranks/SUPPORT.png',
        YOUTUBER: '/shared/sprites/staff-ranks/YOUTUBER.png',
    };

    const DONATOR_ICONS = {
        SAPPHIRE: '/shared/sprites/donator-ranks/SAPPHIRE.png',
        EMERALD: '/shared/sprites/donator-ranks/EMERALD.png',
        RUBY: '/shared/sprites/donator-ranks/RUBY.png',
        DIAMOND: '/shared/sprites/donator-ranks/DIAMOND.png',
        DRAGONSTONE: '/shared/sprites/donator-ranks/DRAGONSTONE.png',
        ONYX: '/shared/sprites/donator-ranks/ONYX.png',
        ZENYTE: '/shared/sprites/donator-ranks/ZENYTE.png',
        ETERNAL: '/shared/sprites/donator-ranks/ETERNAL.png',
        ASCENDANT: '/shared/sprites/donator-ranks/ASCENDANT.png',
    };

    const GAMEMODE_ICONS = {
        IRONMAN: '/shared/sprites/game-ranks/IRONMAN.png',
        HARDCORE: '/shared/sprites/game-ranks/HARDCORE_IRONMAN.png',
        ULTIMATE: '/shared/sprites/game-ranks/ULTIMATE_IRONMAN.png',
        GROUP: '/shared/sprites/game-ranks/GROUP_IRONMAN.png',
        PERMA: '/shared/sprites/game-ranks/PERMA_IRONMAN.png',
    };

    // Donator ranks that get the name shimmer effect
    const SHIMMER_RANKS = new Set(['ONYX', 'ZENYTE', 'ETERNAL', 'ASCENDANT']);

    const ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    // === Helpers ===
    function escapeHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function formatNumber(n) {
        if (n == null) return '0';
        return Number(n).toLocaleString();
    }

    function formatXpShort(xp) {
        if (xp >= 1_000_000_000) return (xp / 1_000_000_000).toFixed(1) + 'B';
        if (xp >= 1_000_000) return (xp / 1_000_000).toFixed(1) + 'M';
        if (xp >= 1_000) return (xp / 1_000).toFixed(0) + 'K';
        return xp.toString();
    }

    function formatGp(value) {
        if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
        if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
        if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
        return value.toString();
    }

    function formatPlaytime(minutes) {
        if (!minutes || minutes <= 0) return '0h';
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ${hours % 24}h`;
        return `${hours}h ${minutes % 60}m`;
    }

    function timeAgo(timestamp) {
        if (!timestamp) return 'Unknown';
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return `${Math.floor(days / 30)}mo ago`;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    // === Rank Theming ===
    function applyRankTheme(donatorRank) {
        const rank = (donatorRank || 'none').toLowerCase();
        // Remove any existing rank classes
        document.body.className = document.body.className.replace(/\brank-\w+/g, '').trim();
        document.body.classList.add(`rank-${rank}`);
    }

    // === Grade badge HTML (0-10 → Roman numerals) ===
    function gradeBadge(grade, small) {
        const g = typeof grade === 'number' ? grade : 0;
        const cls = small ? 'grade-pill-sm' : 'grade-pill';
        return `<span class="${cls} g${g}"><span class="numeral">${ROMAN[g] || '—'}</span></span>`;
    }

    // === Init ===
    let _profileData = null;

    async function init() {
        const root = document.getElementById('profile-root');
        if (!root) return;

        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const username = pathParts.length > 0 ? decodeURIComponent(pathParts[0]) : null;

        if (!username) {
            renderSearch(root);
        } else {
            renderLoading(root);
            await fetchProfile(username, root);
        }
    }

    // === Loading ===
    function renderLoading(root) {
        root.innerHTML = `
            <div class="profile-skeleton">
                <div class="skeleton-bar w-xl"></div>
                <div class="skeleton-bar w-lg"></div>
                <div class="skeleton-bar w-md"></div>
                <div class="skeleton-bar h-lg"></div>
            </div>`;
    }

    // === Search / Landing ===
    // Avatar rank → CSS class
    function rankClass(donatorRank) {
        if (!donatorRank) return 'none';
        const r = donatorRank.toUpperCase();
        if (['ZENYTE','ASCENDANT','ETERNAL'].includes(r)) return 'zenyte';
        if (r === 'ONYX') return 'onyx';
        if (['DIAMOND','DRAGONSTONE'].includes(r)) return 'diamond';
        if (r === 'RUBY') return 'ruby';
        if (['EMERALD','SAPPHIRE'].includes(r)) return 'emerald';
        return 'none';
    }

    function profileHref(username) {
        return '/' + encodeURIComponent(username);
    }

    async function renderSearch(root) {
        // Render the shell immediately (hero + skeleton placeholders)
        root.innerHTML = `
            <div class="landing-page">
                <div class="search-hero">
                    <div class="search-title">
                        <span class="search-title-white">Elderos </span><span class="search-title-accent">Adventurers</span>
                    </div>
                    <div class="search-sub">Look up any player to see their skills, stats, and rank.</div>
                    <div class="search-bar">
                        <input class="search-input" type="text" id="landing-search" placeholder="Enter username..." autofocus>
                        <button class="search-btn" id="landing-search-btn">Search</button>
                    </div>
                </div>
                <div class="landing-body" id="landing-body">
                    <div class="landing-loading">
                        <div class="skeleton-bar w-xl"></div>
                        <div class="skeleton-bar w-lg"></div>
                    </div>
                </div>
            </div>`;

        // Bind search
        const input = document.getElementById('landing-search');
        const btn = document.getElementById('landing-search-btn');
        function go() {
            const name = input.value.trim();
            if (name) window.location.href = '/' + encodeURIComponent(name);
        }
        btn.addEventListener('click', go);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });

        // Fetch landing data
        try {
            const res = await fetch(`${API_BASE}/api/v1/profile`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderLandingBody(data);
        } catch (err) {
            console.error('Landing data fetch failed:', err);
            document.getElementById('landing-body').innerHTML = '';
        }
    }

    function renderLandingBody(data) {
        const body = document.getElementById('landing-body');
        if (!body) return;

        let html = '';

        // Two-column: Most Liked + Recently Active
        html += '<div class="landing-two-col">';

        // ── Most Liked ──
        html += '<div>';
        html += `<div class="section-divider"><span class="section-divider-label">❤️ Most Liked</span><div class="section-divider-line"></div></div>`;
        html += '<div class="liked-list">';
        if (data.mostLiked && data.mostLiked.length > 0) {
            data.mostLiked.forEach((p, i) => {
                const initial = (p.username || '?').charAt(0).toUpperCase();
                const rc = rankClass(p.donatorRank);
                const rankLabel = p.donatorRank && p.donatorRank.toUpperCase() !== 'NONE'
                    ? `<span class="liked-badge ${rc}">${p.donatorRank.charAt(0).toUpperCase() + p.donatorRank.slice(1).toLowerCase()}</span>` : '';
                html += `
                    <a href="${profileHref(p.username)}" class="liked-card">
                        <span class="liked-rank">${i + 1}</span>
                        <div class="liked-avatar ${rc}">${avatarInner(p.avatarUrl, initial)}</div>
                        <div class="liked-info">
                            <div class="liked-name">${escapeHtml(p.username)}</div>
                            <div class="liked-meta">${rankLabel}<span>Total: ${formatNumber(p.totalLevel || 0)}</span></div>
                        </div>
                        <div class="liked-likes">
                            <span class="liked-heart">❤️</span>
                            <span class="liked-count">${p.likes || 0}</span>
                        </div>
                    </a>`;
            });
        } else {
            html += '<div class="landing-empty">No liked profiles yet.</div>';
        }
        html += '</div></div>';

        // ── Recently Active ──
        html += '<div>';
        html += `<div class="section-divider"><span class="section-divider-label">🟢 Recently Active</span><div class="section-divider-line"></div></div>`;
        html += '<div class="online-list">';
        if (data.recentlyActive && data.recentlyActive.length > 0) {
            data.recentlyActive.forEach(p => {
                const initial = (p.username || '?').charAt(0).toUpperCase();
                const rc = rankClass(p.donatorRank);
                html += `
                    <a href="${profileHref(p.username)}" class="online-card">
                        <div class="online-avatar ${rc}">${avatarInner(p.avatarUrl, initial)}</div>
                        <div class="online-info">
                            <div class="online-name">${escapeHtml(p.username)}</div>
                            <div class="online-detail">Combat ${p.combatLevel || 3} · Total ${formatNumber(p.totalLevel || 0)}</div>
                        </div>
                        <div class="online-status">
                            <div class="online-dot"></div>
                        </div>
                    </a>`;
            });
        } else {
            html += '<div class="landing-empty">No recent activity.</div>';
        }
        html += '</div></div>';

        html += '</div>'; // close landing-two-col

        // ── Newest Adventurers ──
        if (data.newest && data.newest.length > 0) {
            html += '<div class="newest-section">';
            html += `<div class="section-divider"><span class="section-divider-label">🆕 Newest Adventurers</span><div class="section-divider-line"></div></div>`;
            html += '<div class="newest-grid">';
            data.newest.forEach(p => {
                const initial = (p.username || '?').charAt(0).toUpperCase();
                const rc = rankClass(p.donatorRank);
                html += `
                    <a href="${profileHref(p.username)}" class="newest-card">
                        <div class="newest-avatar ${rc}">${avatarInner(p.avatarUrl, initial)}</div>
                        <div class="newest-name">${escapeHtml(p.username)}</div>
                        <div class="newest-date">${joinedAgo(p.createdAt)}</div>
                    </a>`;
            });
            html += '</div></div>';
        }

        body.innerHTML = html;
    }

    /** Build avatar inner HTML — Discord image with initial fallback, or just initial */
    function avatarInner(avatarUrl, initial) {
        if (avatarUrl) {
            return `<img src="${escapeHtml(avatarUrl)}" alt="${initial}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;align-items:center;justify-content:center;width:100%;height:100%">${initial}</span>`;
        }
        return initial;
    }

    function joinedAgo(timestamp) {
        if (!timestamp) return '';
        const diff = Date.now() - timestamp;
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Joined today';
        if (days === 1) return 'Joined yesterday';
        if (days < 30) return `${days} days ago`;
        if (days < 365) return `${Math.floor(days / 30)}mo ago`;
        return `${Math.floor(days / 365)}y ago`;
    }

    // === 404 ===
    function render404(root, username) {
        root.innerHTML = `
            <div class="profile-not-found">
                <h2>Adventurer Not Found</h2>
                <p>Could not find a player named "${escapeHtml(username)}".</p>
                <div class="profile-search-box">
                    <input type="text" class="profile-search-input" id="retry-search" placeholder="Try another name..." value="${escapeHtml(username)}">
                    <button class="profile-search-btn" id="retry-search-btn">Search</button>
                </div>
                <p><a href="https://hiscores.elderos.io">Browse Hiscores</a></p>
            </div>`;

        const input = document.getElementById('retry-search');
        const btn = document.getElementById('retry-search-btn');
        function go() {
            const name = input.value.trim();
            if (name) window.location.href = '/' + encodeURIComponent(name);
        }
        btn.addEventListener('click', go);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }

    // === Fetch Profile ===
    async function fetchProfile(username, root) {
        try {
            const headers = {};
            if (typeof Auth !== 'undefined' && Auth.isLoggedIn() && Auth.getToken()) {
                headers['Authorization'] = `Bearer ${Auth.getToken()}`;
            }

            const res = await fetch(`${API_BASE}/api/v1/profile/${encodeURIComponent(username)}`, { headers });
            if (res.status === 404) { render404(root, username); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            _profileData = data;

            // Apply rank theme
            applyRankTheme(data.donatorRank);

            // Update page title
            document.title = `${data.username} — Elderos Adventurers`;

            renderProfile(root, data);

        } catch (err) {
            console.error('Profile fetch failed:', err);
            root.innerHTML = `
                <div class="profile-not-found">
                    <h2>Error</h2>
                    <p>Failed to load profile. Please try again.</p>
                    <p><a href="/">Back to search</a></p>
                </div>`;
        }
    }

    // === Render Full Profile ===
    function renderProfile(root, data) {
        let html = '<div class="page-content">';

        // Header
        html += renderHeader(data);

        // World tabs
        html += renderWorldTabs(data.worlds);

        // ECO content
        html += '<div id="eco-content" class="eco-content">';
        if (data.worlds && data.worlds.eco) {
            html += renderEcoView(data.worlds.eco);
        } else {
            html += '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.18);">No economy data available.</div>';
        }
        html += '</div>';

        // PVP content (hidden by default)
        html += '<div id="pvp-content" class="pvp-content" style="display:none">';
        if (data.worlds && data.worlds.pvp) {
            html += renderPvpView(data.worlds.pvp);
        } else {
            html += '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.18);">No PvP data available.</div>';
        }
        html += '</div>';

        // Leagues content (hidden by default)
        html += '<div id="leagues-content" class="leagues-content" style="display:none">';
        html += '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.18);">Leagues coming soon.</div>';
        html += '</div>';

        html += '</div>';

        root.innerHTML = html;

        // Bind events
        bindWorldTabs(data);
        bindBioEditor(data);
        bindLikeButton(data);
    }

    // === Header ===
    function renderHeader(data) {
        const initial = (data.username || '?').charAt(0).toUpperCase();
        let avatarContent;
        if (data.discordAvatarUrl) {
            avatarContent = `<img src="${escapeHtml(data.discordAvatarUrl)}" alt="${initial}" onerror="this.parentElement.textContent='${initial}'">`;
        } else {
            avatarContent = initial;
        }

        // Badges (with rank icons)
        let badges = '';
        if (data.staffRole && STAFF_MAP[data.staffRole.toUpperCase()]) {
            const staffIcon = STAFF_ICONS[data.staffRole.toUpperCase()];
            const iconHtml = staffIcon ? `<img src="${staffIcon}" class="badge-icon" alt="">` : '';
            badges += `<span class="badge badge-staff">${iconHtml}${STAFF_MAP[data.staffRole.toUpperCase()]}</span>`;
        }
        if (data.donatorRank) {
            const rankKey = data.donatorRank.toUpperCase();
            const donatorIcon = DONATOR_ICONS[rankKey];
            const iconHtml = donatorIcon ? `<img src="${donatorIcon}" class="badge-icon" alt="">` : '';
            const rank = data.donatorRank.charAt(0).toUpperCase() + data.donatorRank.slice(1).toLowerCase();
            badges += `<span class="badge badge-donator">${iconHtml}${escapeHtml(rank)}</span>`;
        }
        if (data.gameMode && data.gameMode !== 'NORMAL') {
            const gmIcon = GAMEMODE_ICONS[data.gameMode.toUpperCase()];
            const iconHtml = gmIcon ? `<img src="${gmIcon}" class="badge-icon" alt="">` : '';
            badges += `<span class="badge badge-gamemode">${iconHtml}${escapeHtml(data.gameMode)}</span>`;
        }

        // Online status
        let statusHtml;
        if (data.online) {
            statusHtml = `<div class="status-dot online"></div>
                <span class="status-text">Online</span>
                ${data.world ? `<span class="status-world">&middot; ${escapeHtml(data.world)}</span>` : ''}`;
        } else {
            statusHtml = `<div class="status-dot offline"></div>
                <span class="status-text">Last seen ${timeAgo(data.lastSeen)}</span>`;
        }

        // Bio
        const isOwnProfile = typeof Auth !== 'undefined' && Auth.isLoggedIn()
            && Auth.getUsername() && Auth.getUsername().toLowerCase() === data.username.toLowerCase();

        let bioHtml = '';
        if (data.bio) {
            bioHtml = `<div class="profile-bio" id="bio-text">${escapeHtml(data.bio)}</div>`;
        } else if (isOwnProfile) {
            bioHtml = `<div class="profile-bio profile-bio-empty" id="bio-text">No bio set.</div>`;
        }

        let bioEditBtn = '';
        if (isOwnProfile) {
            bioEditBtn = `<button class="bio-edit-btn" id="bio-edit-btn">Edit</button>`;
        }

        // Like button
        const liked = data.likedByViewer ? 'liked' : '';
        const likeCount = data.likes || 0;

        return `
            <div class="profile-header">
                <div class="profile-header-glow"></div>
                <div class="profile-header-inner">
                    <div class="profile-avatar">${avatarContent}</div>
                    <div class="profile-info">
                        <div class="profile-name-row">
                            <span class="profile-username${data.donatorRank && SHIMMER_RANKS.has(data.donatorRank.toUpperCase()) ? ' shimmer' : ''}">${escapeHtml(data.username)}</span>
                            <div class="profile-badges">${badges}</div>
                        </div>
                        <div class="profile-row-2">
                            <div class="profile-status">${statusHtml}</div>
                        </div>
                        <div class="bio-edit-row">
                            ${bioHtml}
                            ${bioEditBtn}
                        </div>
                        <div class="bio-editor" id="bio-editor" style="display:none"></div>
                        <div class="profile-meta">
                            <span>Joined ${formatDate(data.createdAt)}</span>
                            <span class="profile-meta-sep"></span>
                            <span>Playtime: ${formatPlaytime(data.totalPlaytimeMinutes)}</span>
                        </div>
                    </div>
                    <div class="profile-social">
                        <div class="profile-views" title="Profile views">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <span class="views-count">${formatNumber(data.views || 0)}</span>
                        </div>
                        <div class="profile-like-btn ${liked}" id="like-btn" title="${isOwnProfile ? 'You cannot like your own profile' : 'Like this profile'}">
                            <span class="like-heart">${data.likedByViewer ? '❤️' : '🤍'}</span>
                            <span class="like-count" id="like-count">${likeCount}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // === World Tabs ===
    function renderWorldTabs(worlds) {
        const hasEco = worlds && worlds.eco;
        const hasPvp = worlds && worlds.pvp;
        const hasLeagues = worlds && worlds.leagues;

        return `
            <div class="world-tabs" id="world-tabs">
                <button class="world-tab active eco" data-world="eco" ${!hasEco ? 'disabled' : ''}>
                    <span class="tab-icon">⚔️</span> Economy
                </button>
                <button class="world-tab ${!hasPvp ? 'disabled' : ''}" data-world="pvp" ${!hasPvp ? '' : ''}>
                    <span class="tab-icon">💀</span> PvP
                    ${!hasPvp ? '<span class="world-tab-empty">No data</span>' : ''}
                </button>
                <button class="world-tab ${!hasLeagues ? 'disabled' : ''}" data-world="leagues" ${!hasLeagues ? '' : ''}>
                    <span class="tab-icon">🏆</span> Leagues
                    ${!hasLeagues ? '<span class="world-tab-empty">No data</span>' : ''}
                </button>
            </div>`;
    }

    function bindWorldTabs(data) {
        const tabs = document.querySelectorAll('.world-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const world = tab.dataset.world;
                if (tab.classList.contains('disabled')) return;
                switchWorld(world);
            });
        });
    }

    function switchWorld(world) {
        // Hide all content
        ['eco-content', 'pvp-content', 'leagues-content'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Show selected
        const content = document.getElementById(`${world}-content`);
        if (content) content.style.display = 'block';

        // Update tab states
        document.querySelectorAll('.world-tab').forEach(t => {
            t.classList.remove('active', 'eco', 'pvp', 'leagues');
        });
        const activeTab = document.querySelector(`.world-tab[data-world="${world}"]`);
        if (activeTab) {
            activeTab.classList.add('active', world);
        }
    }

    // === ECO View ===
    function renderEcoView(eco) {
        let html = '';

        // Quick stats
        html += renderQuickStats(eco);

        // Skills section
        html += '<div class="section">';
        html += '<div class="section-head"><span class="section-title">Skills</span></div>';
        html += renderSkillsGrid(eco.skills);
        html += '</div>';

        // Two-column: Boss KC + Progress
        const hasBoss = eco.bossKills && eco.bossKills.length > 0;
        const hasProgress = eco.progress;

        if (hasBoss || hasProgress) {
            html += '<div class="two-col">';
            if (hasBoss) {
                html += '<div class="section">';
                html += '<div class="section-head"><span class="section-title">Boss Kill Counts</span><span class="section-sub">Top bosses</span></div>';
                html += renderBossKills(eco.bossKills);
                html += '</div>';
            }
            if (hasProgress) {
                html += '<div class="section">';
                html += '<div class="section-head"><span class="section-title">Progress</span></div>';
                html += renderProgress(eco.progress);
                html += '</div>';
            }
            html += '</div>';
        }

        return html;
    }

    // === Quick Stats ===
    function renderQuickStats(eco) {
        const rank = eco.overallRank || '—';
        const grade = typeof eco.overallGrade === 'number' ? eco.overallGrade : 0;

        return `
            <div class="quick-stats">
                <div class="quick-stat">
                    <div class="quick-stat-value ranked">#${formatNumber(rank)} ${gradeBadge(grade)}</div>
                    <div class="quick-stat-label">Overall Rank</div>
                </div>
                <div class="quick-stat">
                    <div class="quick-stat-value">${formatNumber(eco.totalLevel)}</div>
                    <div class="quick-stat-label"><img src="/shared/sprites/total-level.png" class="qs-icon" alt="">Total Level</div>
                    <div class="quick-stat-sub">/ 2,277</div>
                </div>
                <div class="quick-stat">
                    <div class="quick-stat-value">${formatXpShort(eco.totalXp || 0)}</div>
                    <div class="quick-stat-label">Total XP</div>
                </div>
                <div class="quick-stat">
                    <div class="quick-stat-value">${eco.combatLevel || 3}</div>
                    <div class="quick-stat-label"><img src="/shared/sprites/combat-level.png" class="qs-icon" alt="">Combat Level</div>
                </div>
                <div class="quick-stat">
                    <div class="quick-stat-value ranked">${eco.prestige ? 'P' + eco.prestige : '—'}</div>
                    <div class="quick-stat-label">Prestige</div>
                </div>
            </div>`;
    }

    // === Skills Grid ===
    function renderSkillsGrid(skills) {
        if (!skills) return '';

        let html = '<div class="skills-grid">';

        for (let i = 0; i < SKILLS.length; i++) {
            const s = SKILLS[i];
            const data = skills[s.key];
            const level = data ? data.level : 1;
            const xp = data ? data.xp : 0;
            const grade = data ? (typeof data.grade === 'number' ? data.grade : 0) : 0;
            const isMaxed = level >= 99;

            html += `
                <div class="skill-row">
                    <img class="skill-icon" src="${s.icon}" alt="${s.name}">
                    <div class="skill-info">
                        <div class="skill-name">${s.name}</div>
                        <div class="skill-xp">${formatNumber(xp)} xp</div>
                    </div>
                    <div class="skill-right">
                        <span class="skill-level ${isMaxed ? 'maxed' : ''}">${level}</span>
                        ${gradeBadge(grade, true)}
                    </div>
                </div>`;
        }

        // Totals cell fills the remaining slot in the last row
        const overall = skills.overall;
        const totalLevel = overall ? overall.level : 0;
        const totalXp = overall ? overall.xp : 0;

        const atk = (skills.attack || {}).level || 1;
        const str = (skills.strength || {}).level || 1;
        const def = (skills.defence || {}).level || 1;
        const hp = (skills.hitpoints || {}).level || 10;
        const rng = (skills.ranged || {}).level || 1;
        const pray = (skills.prayer || {}).level || 1;
        const mag = (skills.magic || {}).level || 1;
        const base = (def + hp + Math.floor(pray / 2)) / 4;
        const melee = (atk + str) * 0.325;
        const range = rng * 1.5 * 0.325;
        const mage = mag * 1.5 * 0.325;
        const combatLevel = Math.floor(base + Math.max(melee, Math.max(range, mage)));

        html += `
            <div class="skill-totals-cell">
                <div class="skill-totals-level">${formatNumber(totalLevel)}</div>
                <div class="skill-totals-sub">/ 2,277</div>
                <div class="skill-totals-row">
                    <img src="/shared/sprites/combat-level.png" class="totals-icon" alt=""><span class="skill-totals-label">Combat</span>
                    <span class="skill-totals-val">${combatLevel}</span>
                </div>
                <div class="skill-totals-row">
                    <span class="skill-totals-label">XP</span>
                    <span class="skill-totals-val xp">${formatXpShort(totalXp)}</span>
                </div>
            </div>`;

        html += '</div>';

        return html;
    }

    // === Boss Kills ===
    function renderBossKills(bossKills) {
        if (!bossKills || bossKills.length === 0) return '';

        let html = '<div class="kc-grid">';
        for (const boss of bossKills) {
            html += `
                <div class="kc-row">
                    <span class="kc-name">${escapeHtml(boss.name)}</span>
                    <div>
                        <span class="kc-value">${formatNumber(boss.kc)}</span>
                        ${boss.rank ? `<span class="kc-rank">#${boss.rank}</span>` : ''}
                    </div>
                </div>`;
        }
        html += '</div>';
        return html;
    }

    // === Progress Trackers ===
    function renderProgress(progress) {
        if (!progress) return '';

        const trackers = [
            { key: 'achievements', label: 'Achievements', icon: '🏆' },
            { key: 'collectionLog', label: 'Collection Log', icon: '📖' },
            { key: 'combatAchievements', label: 'Combat Achievements', icon: '📜' },
            { key: 'achievementDiaries', label: 'Achievement Diaries', icon: '📋' },
        ];

        let html = '<div class="progress-grid">';
        for (const t of trackers) {
            const data = progress[t.key];
            if (!data) continue;

            const pct = data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : 0;
            html += `
                <div class="progress-item">
                    <div class="progress-top">
                        <span class="progress-label">${t.icon} ${t.label}</span>
                        <span class="progress-count">${formatNumber(data.completed)} / ${formatNumber(data.total)}</span>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill" style="width:${pct}%"></div>
                    </div>
                </div>`;
        }
        html += '</div>';
        return html;
    }

    // === PVP View ===
    function renderPvpView(pvp) {
        if (!pvp) return '';

        let html = '';

        // Stat cards
        html += '<div class="pvp-stats-grid">';
        html += pvpStatCard(formatNumber(pvp.kills), 'Total Kills', true, pvp.rank ? `#${pvp.rank} overall` : '');
        html += pvpStatCard(formatNumber(pvp.deaths), 'Deaths', false, '');
        html += pvpStatCard(pvp.kdr ? pvp.kdr.toFixed(2) : '0.00', 'K/D Ratio', true, '');
        html += pvpStatCard(formatNumber(pvp.highRiskKills), 'High-Risk Kills', false, '');
        html += pvpStatCard(formatNumber(pvp.bestKillstreak), 'Best Killstreak', true, '');
        html += pvpStatCard(formatNumber(pvp.elo), 'Elo Rating', false, pvp.eloTier || '');
        html += '</div>';

        // KDR bar
        const kills = pvp.kills || 0;
        const deaths = pvp.deaths || 0;
        const total = kills + deaths;
        const killPct = total > 0 ? ((kills / total) * 100).toFixed(1) : 50;
        const deathPct = total > 0 ? ((deaths / total) * 100).toFixed(1) : 50;

        html += '<div class="section">';
        html += '<div class="section-head"><span class="section-title">Kill / Death Ratio</span></div>';
        html += `<div class="pvp-kdr-bar">
            <div class="pvp-kdr-kills" style="width:${killPct}%"></div>
            <div class="pvp-kdr-deaths" style="width:${deathPct}%"></div>
        </div>`;
        html += `<div class="pvp-kdr-labels">
            <span>${formatNumber(kills)} kills (${Math.round(killPct)}%)</span>
            <span>${formatNumber(deaths)} deaths (${Math.round(deathPct)}%)</span>
        </div>`;
        html += '</div>';

        // Records
        html += '<div class="section">';
        html += '<div class="section-head"><span class="section-title">Records & Stats</span></div>';
        html += '<div class="pvp-records">';
        html += pvpRecord('Highest Kill Streak', formatNumber(pvp.bestKillstreak), 'green');
        html += pvpRecord('Current Streak', formatNumber(pvp.currentStreak), 'green');
        html += pvpRecord('Highest Risk Kill', formatGp(pvp.highestRiskKillValue || 0) + ' GP', '');
        html += pvpRecord('Total GP Earned', formatGp(pvp.totalGpEarned || 0), 'green');
        html += pvpRecord('Total GP Lost', formatGp(pvp.totalGpLost || 0), 'red');

        const netProfit = (pvp.totalGpEarned || 0) - (pvp.totalGpLost || 0);
        html += pvpRecord('Net Profit', (netProfit >= 0 ? '+' : '') + formatGp(Math.abs(netProfit)), netProfit >= 0 ? 'green' : 'red');

        html += pvpRecord('Wilderness Kills', formatNumber(pvp.wildernessKills), '');
        html += pvpRecord('PvP Arena Wins', formatNumber(pvp.pvpArenaWins), '');
        html += '</div>';
        html += '</div>';

        return html;
    }

    function pvpStatCard(value, label, highlight, sub) {
        return `<div class="pvp-stat-card ${highlight ? 'highlight' : ''}">
            <div class="pvp-stat-value">${value}</div>
            <div class="pvp-stat-label">${label}</div>
            ${sub ? `<div class="pvp-stat-sub">${escapeHtml(sub)}</div>` : ''}
        </div>`;
    }

    function pvpRecord(label, value, color) {
        return `<div class="pvp-record">
            <span class="pvp-record-label">${label}</span>
            <span class="pvp-record-value ${color}">${value}</span>
        </div>`;
    }

    // === Like Button ===
    function bindLikeButton(data) {
        const btn = document.getElementById('like-btn');
        if (!btn) return;

        // Can't like own profile
        const isOwnProfile = typeof Auth !== 'undefined' && Auth.isLoggedIn()
            && Auth.getUsername() && Auth.getUsername().toLowerCase() === data.username.toLowerCase();
        if (isOwnProfile) {
            btn.style.cursor = 'default';
            btn.style.opacity = '0.5';
            return;
        }

        btn.addEventListener('click', () => toggleLike(data.username));
    }

    async function toggleLike(username) {
        if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
            showToast('Login to like profiles', 'error');
            return;
        }

        const btn = document.getElementById('like-btn');
        if (!btn) return;

        try {
            const res = await fetch(`${API_BASE}/api/v1/profile/${encodeURIComponent(username)}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });

            const result = await res.json();
            if (!res.ok) {
                showToast(result.message || 'Failed to toggle like', 'error');
                return;
            }

            // Update UI
            btn.classList.toggle('liked', result.liked);
            btn.querySelector('.like-heart').textContent = result.liked ? '❤️' : '🤍';
            document.getElementById('like-count').textContent = result.likes;

        } catch (err) {
            console.error('Like toggle failed:', err);
            showToast('Failed to toggle like', 'error');
        }
    }

    // === Bio Editor ===
    function bindBioEditor(data) {
        const editBtn = document.getElementById('bio-edit-btn');
        if (!editBtn) return;
        editBtn.addEventListener('click', () => showBioEditor(data));
    }

    function showBioEditor(data) {
        const bioText = document.getElementById('bio-text');
        const editBtn = document.getElementById('bio-edit-btn');
        const editor = document.getElementById('bio-editor');
        if (!editor) return;

        if (bioText) bioText.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';

        const currentBio = data.bio || '';

        editor.style.display = '';
        editor.innerHTML = `
            <textarea id="bio-textarea" maxlength="200" placeholder="Write something about yourself...">${escapeHtml(currentBio)}</textarea>
            <div class="bio-editor-footer">
                <span class="bio-char-count" id="bio-char-count">${currentBio.length}/200</span>
                <div class="bio-editor-actions">
                    <button class="bio-cancel-btn" id="bio-cancel">Cancel</button>
                    <button class="bio-save-btn" id="bio-save">Save</button>
                </div>
            </div>`;

        const textarea = document.getElementById('bio-textarea');
        const charCount = document.getElementById('bio-char-count');
        const saveBtn = document.getElementById('bio-save');
        const cancelBtn = document.getElementById('bio-cancel');

        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        textarea.addEventListener('input', () => {
            const len = textarea.value.length;
            charCount.textContent = `${len}/200`;
            charCount.classList.toggle('over', len > 200);
            saveBtn.disabled = len > 200;
        });

        cancelBtn.addEventListener('click', () => hideBioEditor(data));

        saveBtn.addEventListener('click', async () => {
            const newBio = textarea.value.trim();
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                const res = await fetch(`${API_BASE}/api/v1/profile/bio`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: JSON.stringify({ bio: newBio })
                });

                const result = await res.json();
                if (!res.ok || !result.success) {
                    showToast(result.message || 'Failed to update bio', 'error');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save';
                    return;
                }

                data.bio = result.bio;
                hideBioEditor(data);
                showToast('Bio updated!', 'success');

            } catch (err) {
                console.error('Bio update failed:', err);
                showToast('Failed to update bio', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        });
    }

    function hideBioEditor(data) {
        const bioText = document.getElementById('bio-text');
        const editBtn = document.getElementById('bio-edit-btn');
        const editor = document.getElementById('bio-editor');

        if (editor) { editor.style.display = 'none'; editor.innerHTML = ''; }

        if (bioText) {
            bioText.style.display = '';
            if (data.bio) {
                bioText.textContent = data.bio;
                bioText.classList.remove('profile-bio-empty');
            } else {
                bioText.textContent = 'No bio set.';
                bioText.classList.add('profile-bio-empty');
            }
        }

        if (editBtn) editBtn.style.display = '';
    }

    // === Toast ===
    function showToast(message, type) {
        let toast = document.querySelector('.profile-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'profile-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = 'profile-toast ' + (type || '');
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // === Init ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
