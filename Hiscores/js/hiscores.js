/* ================================================================
   Elderos Hiscores — Application Logic
   ================================================================ */
(function () {
    'use strict';

    // === Config ===
    const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:8084/api/v1'
        : 'https://api.elderos.io/api/v1';

    // Skill icon = assets/skills/{filename}.png
    const SKILLS = [
        { id: -1, key: 'overall',       name: 'Overall',       icon: 'assets/skills/overall.png' },
        { id: 0,  key: 'attack',        name: 'Attack',        icon: 'assets/skills/attack.png' },
        { id: 1,  key: 'defence',       name: 'Defence',       icon: 'assets/skills/defence.png' },
        { id: 2,  key: 'strength',      name: 'Strength',      icon: 'assets/skills/strength.png' },
        { id: 3,  key: 'hitpoints',     name: 'Hitpoints',     icon: 'assets/skills/constitution.png' },
        { id: 4,  key: 'ranged',        name: 'Ranged',        icon: 'assets/skills/range.png' },
        { id: 5,  key: 'prayer',        name: 'Prayer',        icon: 'assets/skills/prayer.png' },
        { id: 6,  key: 'magic',         name: 'Magic',         icon: 'assets/skills/magic.png' },
        { id: 7,  key: 'cooking',       name: 'Cooking',       icon: 'assets/skills/cooking.png' },
        { id: 8,  key: 'woodcutting',   name: 'Woodcutting',   icon: 'assets/skills/woodcutting.png' },
        { id: 9,  key: 'fletching',     name: 'Fletching',     icon: 'assets/skills/fletching.png' },
        { id: 10, key: 'fishing',       name: 'Fishing',       icon: 'assets/skills/fishing.png' },
        { id: 11, key: 'firemaking',    name: 'Firemaking',    icon: 'assets/skills/firemaking.png' },
        { id: 12, key: 'crafting',      name: 'Crafting',      icon: 'assets/skills/crafting.png' },
        { id: 13, key: 'smithing',      name: 'Smithing',      icon: 'assets/skills/smithing.png' },
        { id: 14, key: 'mining',        name: 'Mining',        icon: 'assets/skills/mining.png' },
        { id: 15, key: 'herblore',      name: 'Herblore',      icon: 'assets/skills/herblore.png' },
        { id: 16, key: 'agility',       name: 'Agility',       icon: 'assets/skills/agility.png' },
        { id: 17, key: 'thieving',      name: 'Thieving',      icon: 'assets/skills/thieving.png' },
        { id: 18, key: 'slayer',        name: 'Slayer',        icon: 'assets/skills/slayer.png' },
        { id: 19, key: 'farming',       name: 'Farming',       icon: 'assets/skills/farming.png' },
        { id: 20, key: 'runecraft',     name: 'Runecraft',     icon: 'assets/skills/runecrafting.png' },
        { id: 21, key: 'hunter',        name: 'Hunter',        icon: 'assets/skills/hunter.png' },
        { id: 22, key: 'augmentation',  name: 'Augmentation',  icon: 'assets/skills/augmentation.png' },
    ];

    const BOSSES = [
        { key: 'general-graardor',  name: 'General Graardor',  icon: 'assets/bosses/general_graador.png' },
        { key: 'kril-tsutsaroth',   name: "K'ril Tsutsaroth",  icon: 'assets/bosses/kril_tsutsaroth.png' },
        { key: 'commander-zilyana', name: 'Commander Zilyana',  icon: 'assets/bosses/commander_zilyana.png' },
        { key: 'kreearra',          name: "Kree'arra",         icon: 'assets/bosses/kree_arra.png' },
        { key: 'vorkath',           name: 'Vorkath',           icon: 'assets/bosses/vorkath.png' },
        { key: 'zulrah',            name: 'Zulrah',            icon: 'assets/bosses/zulrah.png' },
        { key: 'corporeal-beast',   name: 'Corporeal Beast',   icon: 'assets/bosses/corporeal_beast.png' },
        { key: 'cerberus',          name: 'Cerberus',          icon: 'assets/bosses/cerberus.png' },
        { key: 'king-black-dragon', name: 'King Black Dragon',  icon: 'assets/bosses/king_black_dragon.png' },
        { key: 'kalphite-queen',    name: 'Kalphite Queen',     icon: 'assets/bosses/kalphite_queen.png' },
        { key: 'giant-mole',        name: 'Giant Mole',         icon: 'assets/bosses/giant_mole.png' },
        { key: 'kraken',            name: 'Kraken',             icon: 'assets/bosses/kraken.png' },
        { key: 'nightmare',         name: 'Nightmare',          icon: 'assets/bosses/nightmare.png' },
        { key: 'nex',               name: 'Nex',                icon: 'assets/bosses/nex.png' },
        { key: 'jad',               name: 'TzTok-Jad',          icon: 'assets/bosses/jad.png' },
        { key: 'scorpia',           name: 'Scorpia',            icon: 'assets/bosses/scorpia.png' },
        { key: 'chaos-elemental',   name: 'Chaos Elemental',    icon: 'assets/bosses/chaos_elemental.png' },
        { key: 'callisto',          name: 'Callisto',           icon: 'assets/bosses/callisto.png' },
    ];

    const ACTIVITIES = [
        { key: 'barrows', name: 'Barrows', icon: 'assets/minigames/barrows.png' },
    ];

    const MODES = [
        { key: 'all',       label: 'All',       icon: 'assets/game-ranks/ADVENTURER.png' },
        { key: 'normal',    label: 'Normal',    icon: 'assets/game-ranks/ADVENTURER.png' },
        { key: 'ironman',   label: 'Ironman',   icon: 'assets/game-ranks/IRONMAN.png' },
        { key: 'hardcore',  label: 'Hardcore',  icon: 'assets/game-ranks/HARDCORE_IRONMAN.png' },
        { key: 'ultimate',  label: 'Ultimate',  icon: 'assets/game-ranks/ULTIMATE_IRONMAN.png' },
        { key: 'group',     label: 'Group',     icon: 'assets/game-ranks/GROUP_IRONMAN.png' },
        { key: 'perma',     label: 'Perma',     icon: 'assets/game-ranks/PERMA_IRONMAN.png' },
    ];

    const DONATORS = [
        { key: 'all',         label: 'All',       icon: null },
        { key: 'sapphire',    label: 'Sapphire',  icon: 'assets/donator-ranks/SAPPHIRE.png' },
        { key: 'emerald',     label: 'Emerald',   icon: 'assets/donator-ranks/EMERALD.png' },
        { key: 'ruby',        label: 'Ruby',       icon: 'assets/donator-ranks/RUBY.png' },
        { key: 'diamond',     label: 'Diamond',    icon: 'assets/donator-ranks/DIAMOND.png' },
        { key: 'dragonstone', label: 'Dragon.',    icon: 'assets/donator-ranks/DRAGONSTONE.png' },
        { key: 'onyx',        label: 'Onyx',       icon: 'assets/donator-ranks/ONYX.png' },
        { key: 'zenyte',      label: 'Zenyte',     icon: 'assets/donator-ranks/ZENYTE.png' },
        { key: 'eternal',     label: 'Eternal',    icon: 'assets/donator-ranks/ETERNAL.png' },
        { key: 'ascendant',   label: 'Ascendant',  icon: 'assets/donator-ranks/ASCENDANT.png' },
    ];

    const ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    // XP thresholds for grade tiers (0-10)
    const GRADE_THRESHOLDS = [
        0,            // 0 — Unranked
        50_000,       // I
        500_000,      // II
        2_000_000,    // III
        5_000_000,    // IV
        13_000_000,   // V
        30_000_000,   // VI
        50_000_000,   // VII
        100_000_000,  // VIII
        150_000_000,  // IX
        200_000_000,  // X — Max
    ];

    // Overall XP thresholds (much higher since it's sum of all skills)
    const OVERALL_GRADE_THRESHOLDS = [
        0,              // 0
        1_000_000,      // I
        10_000_000,     // II
        50_000_000,     // III
        150_000_000,    // IV
        400_000_000,    // V
        750_000_000,    // VI
        1_500_000_000,  // VII
        2_500_000_000,  // VIII
        3_500_000_000,  // IX
        4_600_000_000,  // X
    ];

    // Badge image maps
    const STAFF_BADGES = {
        OWNER:          'assets/staff-ranks/OWNER.png',
        DEVELOPER:      'assets/staff-ranks/DEVELOPER.png',
        MANAGER:        'assets/staff-ranks/MANAGER.png',
        ADMINISTRATOR:  'assets/staff-ranks/ADMIN.png',
        HEAD_MODERATOR: 'assets/staff-ranks/MOD.png',
        MODERATOR:      'assets/staff-ranks/MOD.png',
        SUPPORT:        'assets/staff-ranks/SUPPORT.png',
        YOUTUBER:       'assets/staff-ranks/YOUTUBER.png',
    };

    const DONATOR_BADGES = {
        SAPPHIRE:    'assets/donator-ranks/SAPPHIRE.png',
        EMERALD:     'assets/donator-ranks/EMERALD.png',
        RUBY:        'assets/donator-ranks/RUBY.png',
        DIAMOND:     'assets/donator-ranks/DIAMOND.png',
        DRAGONSTONE: 'assets/donator-ranks/DRAGONSTONE.png',
        ONYX:        'assets/donator-ranks/ONYX.png',
        ZENYTE:      'assets/donator-ranks/ZENYTE.png',
        ETERNAL:     'assets/donator-ranks/ETERNAL.png',
        ASCENDANT:   'assets/donator-ranks/ASCENDANT.png',
    };

    const GAMEMODE_BADGES = {
        IRONMAN:  'assets/game-ranks/IRONMAN.png',
        HARDCORE: 'assets/game-ranks/HARDCORE_IRONMAN.png',
        ULTIMATE: 'assets/game-ranks/ULTIMATE_IRONMAN.png',
        GROUP:    'assets/game-ranks/GROUP_IRONMAN.png',
        PERMA:    'assets/game-ranks/PERMA_IRONMAN.png',
    };

    // === State ===
    const state = {
        skill: 'overall',
        category: 'skills',   // skills | bosses | activities
        mode: 'all',
        donator: 'all',
        page: 1,
        limit: 15,
        totalPlayers: 0,
        players: [],
        loading: false,
    };

    // Client-side cache (60s TTL)
    const apiCache = new Map();
    const CACHE_TTL = 60_000;

    // Debounce timer
    let fetchTimer = null;

    // === DOM refs ===
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Helper: build <img> tag for icons
    function iconImg(src, alt, cls) {
        return `<img src="${src}" alt="${escapeHtml(alt)}" class="${cls || 'icon-img'}" draggable="false">`;
    }

    // Adventurers profile base URL
    const ADVENTURERS_BASE = window.location.hostname === 'localhost'
        ? '/adventurers'
        : 'https://adventurers.elderos.io';

    // === Init ===
    document.addEventListener('DOMContentLoaded', () => {
        readUrl();

        // Backward compat: redirect ?player=X to adventurers profile
        if (new URLSearchParams(window.location.search).has('player')) {
            const name = new URLSearchParams(window.location.search).get('player');
            if (name) {
                window.location.href = `${ADVENTURERS_BASE}/${encodeURIComponent(name)}`;
                return;
            }
        }

        buildSidebar();
        buildModeTabs();
        buildDonatorChips();
        bindEvents();
        fetchHiscores();
    });

    // === URL Sync ===
    function readUrl() {
        const p = new URLSearchParams(window.location.search);

        if (p.has('skill'))   state.skill   = p.get('skill');
        if (p.has('mode'))    state.mode    = p.get('mode');
        if (p.has('donator')) state.donator = p.get('donator');
        if (p.has('page'))    state.page    = parseInt(p.get('page'), 10) || 1;

        // Determine category from skill key
        if (BOSSES.some(b => b.key === state.skill)) {
            state.category = 'bosses';
        } else if (ACTIVITIES.some(a => a.key === state.skill)) {
            state.category = 'activities';
        } else {
            state.category = 'skills';
        }
    }

    function updateUrl() {
        const p = new URLSearchParams();
        if (state.skill !== 'overall') p.set('skill', state.skill);
        if (state.mode !== 'all')      p.set('mode', state.mode);
        if (state.donator !== 'all')   p.set('donator', state.donator);
        if (state.page > 1)            p.set('page', state.page);
        const qs = p.toString();
        const url = window.location.pathname + (qs ? '?' + qs : '');
        history.replaceState(null, '', url);
    }

    // === Build Sidebar ===
    function buildSidebar() {
        const sidebar = $('#sidebar');
        if (!sidebar) return;

        let html = '';

        // Skills section
        html += '<div class="sidebar-section">';
        html += '<div class="section-title">Skills</div>';
        for (const s of SKILLS) {
            const active = state.category === 'skills' && state.skill === s.key ? ' active' : '';
            html += `<div class="sidebar-item${active}" data-category="skills" data-skill="${s.key}">
                ${iconImg(s.icon, s.name, 'sidebar-icon')}<span>${s.name}</span>
            </div>`;
        }
        html += '</div>';

        // Bosses section
        html += '<div class="sidebar-section">';
        html += '<div class="section-title">Bosses</div>';
        for (const b of BOSSES) {
            const active = state.category === 'bosses' && state.skill === b.key ? ' active' : '';
            html += `<div class="sidebar-item${active}" data-category="bosses" data-skill="${b.key}">
                ${iconImg(b.icon, b.name, 'sidebar-icon')}<span>${b.name}</span>
            </div>`;
        }
        html += '</div>';

        // Activities section
        html += '<div class="sidebar-section">';
        html += '<div class="section-title">Activities</div>';
        for (const a of ACTIVITIES) {
            const active = state.category === 'activities' && state.skill === a.key ? ' active' : '';
            html += `<div class="sidebar-item${active}" data-category="activities" data-skill="${a.key}">
                ${iconImg(a.icon, a.name, 'sidebar-icon')}<span>${a.name}</span>
            </div>`;
        }
        html += '</div>';

        sidebar.innerHTML = html;
    }

    // === Build Mode Tabs ===
    function buildModeTabs() {
        const container = $('#mode-tabs');
        if (!container) return;
        container.innerHTML = MODES.map(m =>
            `<button class="mode-tab${m.key === state.mode ? ' active' : ''}" data-mode="${m.key}">${m.icon ? iconImg(m.icon, m.label, 'tab-icon') : ''}${m.label}</button>`
        ).join('');
    }

    // === Build Donator Filter Chips ===
    function buildDonatorChips() {
        const container = $('#donator-chips');
        if (!container) return;
        container.innerHTML =
            '<span class="filter-label">Donator:</span>' +
            DONATORS.map(d =>
                `<button class="filter-chip${d.key === state.donator ? ' active' : ''}" data-donator="${d.key}">${d.icon ? iconImg(d.icon, d.label, 'chip-icon') : ''}${d.label}</button>`
            ).join('');
    }

    // === Bind Events ===
    let eventsBound = false;
    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

        // Sidebar clicks
        document.addEventListener('click', (e) => {
            const item = e.target.closest('.sidebar-item');
            if (item) {
                state.category = item.dataset.category;
                state.skill = item.dataset.skill;
                state.page = 1;
                buildSidebar();
                buildModeTabs();
                buildDonatorChips();
                updateUrl();
                debouncedFetch();
            }
        });

        // Mode tab clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mode-tab')) {
                state.mode = e.target.dataset.mode;
                state.page = 1;
                buildModeTabs();
                updateUrl();
                debouncedFetch();
            }
        });

        // Donator chip clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-chip')) {
                state.donator = e.target.dataset.donator;
                state.page = 1;
                buildDonatorChips();
                updateUrl();
                debouncedFetch();
            }
        });

        // Pagination clicks
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.page-btn');
            if (btn && !btn.disabled) {
                const page = parseInt(btn.dataset.page, 10);
                if (!isNaN(page) && page !== state.page) {
                    state.page = page;
                    updateUrl();
                    fetchHiscores();
                    const tw = $('.table-wrapper');
                    if (tw) tw.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // Table row click → open adventurers profile
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.player-link');
            if (link) { /* let normal navigation happen */ return; }
            const row = e.target.closest('tr[data-username]');
            if (row) window.location.href = `${ADVENTURERS_BASE}/${encodeURIComponent(row.dataset.username)}`;
        });

        // Player search → navigate to adventurers profile
        const searchBtn = $('#search-btn');
        const searchInput = $('#search-input');
        if (searchBtn) searchBtn.addEventListener('click', doPlayerSearch);
        if (searchInput) searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doPlayerSearch();
        });

        // Mobile search
        const mSearchBtn = $('#m-search-btn');
        const mSearchInput = $('#m-search-input');
        if (mSearchBtn) mSearchBtn.addEventListener('click', doMobileSearch);
        if (mSearchInput) mSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doMobileSearch();
        });

        // Jump to rank
        const jumpBtn = $('#jump-btn');
        const jumpInput = $('#jump-input');
        if (jumpBtn) jumpBtn.addEventListener('click', doJump);
        if (jumpInput) jumpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doJump();
        });

        // Compare button
        const compareBtn = $('#compare-btn');
        if (compareBtn) compareBtn.addEventListener('click', () => {
            showToast('Compare feature coming soon!');
        });
    }

    function goToProfile(username) {
        window.location.href = `${ADVENTURERS_BASE}/${encodeURIComponent(username)}`;
    }

    function doPlayerSearch() {
        const input = $('#search-input');
        if (!input) return;
        const name = input.value.trim();
        if (name) goToProfile(name);
    }

    function doMobileSearch() {
        const input = $('#m-search-input');
        if (!input) return;
        const name = input.value.trim();
        if (name) goToProfile(name);
    }

    function doJump() {
        const input = $('#jump-input');
        if (!input) return;
        const rank = parseInt(input.value, 10);
        if (!rank || rank < 1) return;
        state.page = Math.ceil(rank / state.limit);
        updateUrl();
        fetchHiscores();
    }

    // === Debounced Fetch ===
    function debouncedFetch() {
        clearTimeout(fetchTimer);
        fetchTimer = setTimeout(fetchHiscores, 200);
    }

    // === API Calls ===
    async function fetchHiscores() {
        // If bosses/activities — show coming soon
        if (state.category !== 'skills') {
            renderComingSoon();
            updatePlayerCount('—');
            return;
        }

        const cacheKey = `${state.skill}:${state.mode}:${state.donator}:${state.page}:${state.limit}`;
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            applyLeaderboardData(cached.data);
            return;
        }

        setLoading(true);

        const params = new URLSearchParams({
            skill: state.skill,
            mode: state.mode,
            donator: state.donator,
            page: state.page,
            limit: state.limit,
        });

        try {
            const res = await fetch(`${API_BASE}/hiscores?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            apiCache.set(cacheKey, { data, ts: Date.now() });
            applyLeaderboardData(data);
        } catch (err) {
            console.error('Hiscores fetch failed:', err);
            renderErrorState('Unable to load hiscores. Please try again.', fetchHiscores);
        } finally {
            setLoading(false);
        }
    }

    function applyLeaderboardData(data) {
        state.totalPlayers = data.totalPlayers || 0;
        state.players = data.players || [];
        updatePlayerCount(state.totalPlayers.toLocaleString());
        renderTable(state.players);
        renderPagination(state.totalPlayers, state.page, state.limit);
    }

    // === Rendering ===
    function renderTable(players) {
        const tbody = $('#table-body');
        if (!tbody) return;

        if (!players || players.length === 0) {
            renderEmptyState('No players found matching these filters.');
            return;
        }

        const isOverall = state.skill === 'overall';
        tbody.innerHTML = players.map(p => {
            const rowClass = getRowClass(p.rank);
            return `<tr class="${rowClass}" data-username="${escapeHtml(p.username)}">
                <td class="rank-cell">${renderRank(p.rank)}</td>
                <td>
                    <div class="player-cell">
                        <a href="${ADVENTURERS_BASE}/${encodeURIComponent(p.username)}" class="player-link">
                            <span class="player-name">${escapeHtml(p.username)}</span>
                        </a>
                        <span class="player-badges">${renderBadges(p)}</span>
                    </div>
                </td>
                <td class="grade-cell">${renderGrade(p.xp, isOverall)}</td>
                <td class="level-cell">${formatNumber(p.level)}</td>
                <td class="xp-cell">${formatNumber(p.xp)}</td>
            </tr>`;
        }).join('');
    }

    function renderSkeletons() {
        const tbody = $('#table-body');
        if (!tbody) return;
        tbody.innerHTML = Array.from({ length: state.limit }, () =>
            `<tr class="skeleton-row">
                <td><div class="skeleton-bone w-sm"></div></td>
                <td><div class="skeleton-bone w-lg"></div></td>
                <td><div class="skeleton-bone w-sm" style="margin:0 auto"></div></td>
                <td><div class="skeleton-bone w-xl" style="margin-left:auto"></div></td>
                <td><div class="skeleton-bone w-md" style="margin-left:auto"></div></td>
            </tr>`
        ).join('');
    }

    function renderEmptyState(message) {
        const tbody = $('#table-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="5">
            <div class="state-message">
                <div class="state-title">No Results</div>
                <div class="state-desc">${escapeHtml(message)}</div>
                <button class="state-btn" onclick="window.Hiscores.clearFilters()">Clear Filters</button>
            </div>
        </td></tr>`;
        const pag = $('#pagination');
        if (pag) pag.innerHTML = '';
    }

    function renderErrorState(message, retryFn) {
        const tbody = $('#table-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="5">
            <div class="state-message">
                <div class="state-title">Error</div>
                <div class="state-desc">${escapeHtml(message)}</div>
                <button class="state-btn" id="retry-btn">Retry</button>
            </div>
        </td></tr>`;
        const btn = document.getElementById('retry-btn');
        if (btn && retryFn) btn.addEventListener('click', retryFn);
    }

    function renderComingSoon() {
        const tbody = $('#table-body');
        if (!tbody) return;
        const label = state.category === 'bosses' ? 'Boss kill counts' : 'Activity tracking';
        tbody.innerHTML = `<tr><td colspan="5">
            <div class="state-message">
                <div class="state-title">Coming Soon</div>
                <div class="state-desc">${label} will be available once Elderos launches.</div>
            </div>
        </td></tr>`;
        const pag = $('#pagination');
        if (pag) pag.innerHTML = '';
    }

    function renderPagination(total, page, limit) {
        const container = $('#pagination');
        if (!container) return;

        const totalPages = Math.max(1, Math.ceil(total / limit));

        if (totalPages <= 1) {
            container.innerHTML = `<div class="pagination-info">Showing ${total} player${total !== 1 ? 's' : ''}</div><div></div>`;
            return;
        }

        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);

        let buttons = '';

        // Prev
        buttons += `<button class="page-btn nav-arrow" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>&#8249;</button>`;

        // Page numbers — show at most 7 buttons
        const pages = getPageNumbers(page, totalPages, 7);
        for (const p of pages) {
            if (p === '...') {
                buttons += `<span class="page-btn" style="cursor:default;border:none;opacity:0.5">&#8230;</span>`;
            } else {
                buttons += `<button class="page-btn${p === page ? ' active' : ''}" data-page="${p}">${p}</button>`;
            }
        }

        // Next
        buttons += `<button class="page-btn nav-arrow" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>&#8250;</button>`;

        container.innerHTML = `
            <div class="pagination-info">Showing ${start}–${end} of ${total.toLocaleString()}</div>
            <div class="pagination-buttons">${buttons}</div>
        `;
    }

    // === Helpers ===

    function getGrade(xp, isOverall) {
        const thresholds = isOverall ? OVERALL_GRADE_THRESHOLDS : GRADE_THRESHOLDS;
        let grade = 0;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (xp >= thresholds[i]) { grade = i; break; }
        }
        return grade;
    }

    function renderGrade(xp, isOverall) {
        const grade = getGrade(xp, isOverall);
        return `<span class="grade-pill g${grade}"><span class="numeral">${ROMAN[grade]}</span></span>`;
    }

    function renderRank(rank) {
        if (rank === 1) return `<span class="rank-medal gold">1</span>`;
        if (rank === 2) return `<span class="rank-medal silver">2</span>`;
        if (rank === 3) return `<span class="rank-medal bronze">3</span>`;
        return rank.toLocaleString();
    }

    function getRowClass(rank) {
        if (rank === 1) return 'r1';
        if (rank === 2) return 'r2';
        if (rank === 3) return 'r3';
        return '';
    }

    function renderBadges(player) {
        let html = '';

        // Staff badge (image)
        if (player.staffRole) {
            const src = STAFF_BADGES[player.staffRole.toUpperCase()];
            if (src) html += `<img src="${src}" alt="${player.staffRole}" class="badge-icon" title="${player.staffRole}">`;
        }

        // Donator badge (image)
        if (player.donatorRank) {
            const src = DONATOR_BADGES[player.donatorRank.toUpperCase()];
            if (src) html += `<img src="${src}" alt="${player.donatorRank}" class="badge-icon" title="${player.donatorRank}">`;
        }

        // Game mode badge (image)
        if (player.gameMode) {
            const src = GAMEMODE_BADGES[player.gameMode.toUpperCase()];
            if (src) html += `<img src="${src}" alt="${player.gameMode}" class="badge-icon" title="${player.gameMode}">`;
        }

        return html;
    }

    function formatNumber(n) {
        if (n == null) return '—';
        return Number(n).toLocaleString();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function setLoading(isLoading) {
        state.loading = isLoading;
        const loader = $('#top-loader');
        if (loader) loader.classList.toggle('active', isLoading);
        const tw = $('.table-wrapper');
        if (tw) tw.classList.toggle('loading', isLoading);
        if (isLoading) renderSkeletons();
    }

    function updatePlayerCount(text) {
        const el = $('#player-count');
        if (el) el.textContent = text;
    }

    function getPageNumbers(current, total, maxButtons) {
        if (total <= maxButtons) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const pages = [];
        const half = Math.floor(maxButtons / 2);

        pages.push(1);

        let start = Math.max(2, current - half + 1);
        let end = Math.min(total - 1, current + half - 1);

        if (current <= half) {
            end = Math.min(total - 1, maxButtons - 2);
        }
        if (current > total - half) {
            start = Math.max(2, total - maxButtons + 3);
        }

        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < total - 1) pages.push('...');

        pages.push(total);
        return pages;
    }

    function showToast(message) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // === Public API ===
    window.Hiscores = {
        clearFilters() {
            state.skill = 'overall';
            state.category = 'skills';
            state.mode = 'all';
            state.donator = 'all';
            state.page = 1;
            buildSidebar();
            buildModeTabs();
            buildDonatorChips();
            updateUrl();
            fetchHiscores();
        }
    };

})();
