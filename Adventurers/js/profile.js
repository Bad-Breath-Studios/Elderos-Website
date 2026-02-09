/* ================================================================
   Elderos Adventurers — Player Profile Logic
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

    const SKILLS = [
        { id: 0,  key: 'attack',        name: 'Attack',        icon: 'assets/skills/attack.png' },
        { id: 1,  key: 'defence',        name: 'Defence',       icon: 'assets/skills/defence.png' },
        { id: 2,  key: 'strength',       name: 'Strength',      icon: 'assets/skills/strength.png' },
        { id: 3,  key: 'hitpoints',      name: 'Hitpoints',     icon: 'assets/skills/constitution.png' },
        { id: 4,  key: 'ranged',         name: 'Ranged',        icon: 'assets/skills/range.png' },
        { id: 5,  key: 'prayer',         name: 'Prayer',        icon: 'assets/skills/prayer.png' },
        { id: 6,  key: 'magic',          name: 'Magic',         icon: 'assets/skills/magic.png' },
        { id: 7,  key: 'cooking',        name: 'Cooking',       icon: 'assets/skills/cooking.png' },
        { id: 8,  key: 'woodcutting',    name: 'Woodcutting',   icon: 'assets/skills/woodcutting.png' },
        { id: 9,  key: 'fletching',      name: 'Fletching',     icon: 'assets/skills/fletching.png' },
        { id: 10, key: 'fishing',        name: 'Fishing',       icon: 'assets/skills/fishing.png' },
        { id: 11, key: 'firemaking',     name: 'Firemaking',    icon: 'assets/skills/firemaking.png' },
        { id: 12, key: 'crafting',       name: 'Crafting',      icon: 'assets/skills/crafting.png' },
        { id: 13, key: 'smithing',       name: 'Smithing',      icon: 'assets/skills/smithing.png' },
        { id: 14, key: 'mining',         name: 'Mining',        icon: 'assets/skills/mining.png' },
        { id: 15, key: 'herblore',       name: 'Herblore',      icon: 'assets/skills/herblore.png' },
        { id: 16, key: 'agility',        name: 'Agility',       icon: 'assets/skills/agility.png' },
        { id: 17, key: 'thieving',       name: 'Thieving',      icon: 'assets/skills/thieving.png' },
        { id: 18, key: 'slayer',         name: 'Slayer',        icon: 'assets/skills/slayer.png' },
        { id: 19, key: 'farming',        name: 'Farming',       icon: 'assets/skills/farming.png' },
        { id: 20, key: 'runecraft',      name: 'Runecraft',     icon: 'assets/skills/runecrafting.png' },
        { id: 21, key: 'hunter',         name: 'Hunter',        icon: 'assets/skills/hunter.png' },
        { id: 22, key: 'augmentation',   name: 'Augmentation',  icon: 'assets/skills/augmentation.png' },
    ];

    // OSRS equipment slot layout (slot index from server)
    const EQUIPMENT_SLOTS = [
        { slot: 0,  key: 'head',    name: 'Head',    cls: 'equip-head' },
        { slot: 1,  key: 'cape',    name: 'Cape',    cls: 'equip-cape' },
        { slot: 2,  key: 'amulet',  name: 'Amulet',  cls: 'equip-amulet' },
        { slot: 3,  key: 'weapon',  name: 'Weapon',  cls: 'equip-weapon' },
        { slot: 4,  key: 'body',    name: 'Body',    cls: 'equip-body' },
        { slot: 5,  key: 'shield',  name: 'Shield',  cls: 'equip-shield' },
        { slot: 7,  key: 'legs',    name: 'Legs',    cls: 'equip-legs' },
        { slot: 9,  key: 'gloves',  name: 'Gloves',  cls: 'equip-gloves' },
        { slot: 10, key: 'boots',   name: 'Boots',   cls: 'equip-boots' },
        { slot: 12, key: 'ring',    name: 'Ring',     cls: 'equip-ring' },
        { slot: 13, key: 'ammo',    name: 'Ammo',    cls: 'equip-ammo' },
    ];

    const ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

    const OVERALL_GRADE_THRESHOLDS = [
        0, 1_000_000, 10_000_000, 50_000_000, 150_000_000,
        400_000_000, 750_000_000, 1_500_000_000, 2_500_000_000, 3_500_000_000, 4_600_000_000,
    ];

    const STAFF_BADGES = {
        OWNER: 'assets/staff-ranks/OWNER.png',
        DEVELOPER: 'assets/staff-ranks/DEVELOPER.png',
        MANAGER: 'assets/staff-ranks/MANAGER.png',
        ADMINISTRATOR: 'assets/staff-ranks/ADMIN.png',
        HEAD_MODERATOR: 'assets/staff-ranks/MOD.png',
        MODERATOR: 'assets/staff-ranks/MOD.png',
        SUPPORT: 'assets/staff-ranks/SUPPORT.png',
        YOUTUBER: 'assets/staff-ranks/YOUTUBER.png',
    };

    const DONATOR_BADGES = {
        SAPPHIRE: 'assets/donator-ranks/SAPPHIRE.png',
        EMERALD: 'assets/donator-ranks/EMERALD.png',
        RUBY: 'assets/donator-ranks/RUBY.png',
        DIAMOND: 'assets/donator-ranks/DIAMOND.png',
        DRAGONSTONE: 'assets/donator-ranks/DRAGONSTONE.png',
        ONYX: 'assets/donator-ranks/ONYX.png',
        ZENYTE: 'assets/donator-ranks/ZENYTE.png',
        ETERNAL: 'assets/donator-ranks/ETERNAL.png',
        ASCENDANT: 'assets/donator-ranks/ASCENDANT.png',
    };

    const GAMEMODE_BADGES = {
        IRONMAN: 'assets/game-ranks/IRONMAN.png',
        HARDCORE: 'assets/game-ranks/HARDCORE_IRONMAN.png',
        ULTIMATE: 'assets/game-ranks/ULTIMATE_IRONMAN.png',
        GROUP: 'assets/game-ranks/GROUP_IRONMAN.png',
        PERMA: 'assets/game-ranks/PERMA_IRONMAN.png',
    };

    // === Helpers ===
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatNumber(n) {
        if (n == null) return '—';
        return Number(n).toLocaleString();
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
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function getGrade(xp) {
        let grade = 0;
        for (let i = OVERALL_GRADE_THRESHOLDS.length - 1; i >= 0; i--) {
            if (xp >= OVERALL_GRADE_THRESHOLDS[i]) { grade = i; break; }
        }
        return grade;
    }

    function renderGradePill(xp) {
        const grade = getGrade(xp);
        return `<span class="grade-pill g${grade}">${ROMAN[grade]}</span>`;
    }

    function badgeImg(src, alt) {
        return `<img src="${src}" alt="${escapeHtml(alt)}" class="badge-icon" title="${escapeHtml(alt)}" draggable="false">`;
    }

    function renderBadges(data) {
        let html = '';
        if (data.staffRole) {
            const src = STAFF_BADGES[data.staffRole.toUpperCase()];
            if (src) html += badgeImg(src, data.staffRole);
        }
        if (data.donatorRank) {
            const src = DONATOR_BADGES[data.donatorRank.toUpperCase()];
            if (src) html += badgeImg(src, data.donatorRank);
        }
        if (data.gameMode && data.gameMode !== 'NORMAL') {
            const src = GAMEMODE_BADGES[data.gameMode.toUpperCase()];
            if (src) html += badgeImg(src, data.gameMode);
        }
        return html;
    }

    // === Main Init ===
    let _profileData = null;
    let _itemsLoaded = false;

    async function init() {
        const root = document.getElementById('profile-root');
        if (!root) return;

        // Parse username from path: /username or /
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
            <div class="profile-page profile-skeleton">
                <div class="skeleton-bar w-xl"></div>
                <div class="skeleton-bar w-lg"></div>
                <div class="skeleton-bar w-md"></div>
                <div class="skeleton-bar h-lg"></div>
            </div>`;
    }

    // === Search / Landing ===
    function renderSearch(root) {
        root.innerHTML = `
            <div class="profile-page">
                <div class="profile-landing">
                    <h1>Elderos <span class="accent">Adventurers</span></h1>
                    <p>Look up any player to see their skills, equipment, and rank.</p>
                    <div class="profile-search-box">
                        <input type="text" class="profile-search-input" id="landing-search" placeholder="Enter username..." autofocus>
                        <button class="profile-search-btn" id="landing-search-btn">Search</button>
                    </div>
                </div>
            </div>`;

        const input = document.getElementById('landing-search');
        const btn = document.getElementById('landing-search-btn');

        function doSearch() {
            const name = input.value.trim();
            if (name) {
                window.location.href = '/' + encodeURIComponent(name);
            }
        }

        btn.addEventListener('click', doSearch);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    // === 404 ===
    function render404(root, username) {
        root.innerHTML = `
            <div class="profile-page">
                <div class="profile-not-found">
                    <h2>Adventurer Not Found</h2>
                    <p>Could not find a player named "${escapeHtml(username)}".</p>
                    <div class="profile-search-box">
                        <input type="text" class="profile-search-input" id="retry-search" placeholder="Try another name..." value="${escapeHtml(username)}">
                        <button class="profile-search-btn" id="retry-search-btn">Search</button>
                    </div>
                    <p><a href="https://hiscores.elderos.io">Browse Hiscores</a></p>
                </div>
            </div>`;

        const input = document.getElementById('retry-search');
        const btn = document.getElementById('retry-search-btn');

        function doSearch() {
            const name = input.value.trim();
            if (name) {
                window.location.href = '/' + encodeURIComponent(name);
            }
        }

        btn.addEventListener('click', doSearch);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    // === Fetch Profile ===
    async function fetchProfile(username, root) {
        try {
            const res = await fetch(`${API_BASE}/api/v1/profile/${encodeURIComponent(username)}`);
            if (res.status === 404) {
                render404(root, username);
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            _profileData = data;

            // Load item data in parallel (best-effort)
            try {
                if (typeof ItemData !== 'undefined' && !_itemsLoaded) {
                    await ItemData.load();
                    _itemsLoaded = true;
                }
            } catch (e) {
                console.warn('ItemData failed to load:', e);
            }

            renderProfile(root, data);

            // Update page title
            document.title = `${data.username} — Elderos Adventurers`;

        } catch (err) {
            console.error('Profile fetch failed:', err);
            root.innerHTML = `
                <div class="profile-page">
                    <div class="profile-not-found">
                        <h2>Error</h2>
                        <p>Failed to load profile. Please try again.</p>
                        <p><a href="/">Back to search</a></p>
                    </div>
                </div>`;
        }
    }

    // === Render Full Profile ===
    function renderProfile(root, data) {
        let html = '<div class="profile-page">';

        // Header
        html += renderHeader(data);

        // Overall card
        html += renderOverall(data);

        // Two-column layout
        html += '<div class="profile-columns">';

        // Left: Skills
        html += '<div class="skills-section">';
        html += renderSkills(data);
        html += '</div>';

        // Right: Equipment + Hiscores
        html += '<div class="equipment-section">';
        html += renderEquipment(data.equipment);
        html += renderHiscores(data);
        html += '</div>';

        html += '</div>'; // columns
        html += '</div>'; // profile-page

        root.innerHTML = html;

        // Bind bio editor events
        bindBioEditor(data);

        // Apply item icons after DOM is ready
        applyEquipmentIcons(data.equipment);
    }

    // === Header ===
    function renderHeader(data) {
        const badges = renderBadges(data);

        // Avatar
        let avatarContent;
        if (data.discordAvatarUrl) {
            const initial = data.username.charAt(0).toUpperCase();
            avatarContent = `<img src="${escapeHtml(data.discordAvatarUrl)}" alt="${initial}" onerror="this.parentElement.textContent='${initial}'">`;
        } else {
            avatarContent = data.username.charAt(0).toUpperCase();
        }

        // Online status
        const statusDot = data.online
            ? '<span class="status-dot online"></span> Online'
            : `<span class="status-dot offline"></span> Last seen ${timeAgo(data.lastSeen)}`;

        // Bio
        const isOwnProfile = typeof Auth !== 'undefined' && Auth.isLoggedIn()
            && Auth.getUsername() && Auth.getUsername().toLowerCase() === data.username.toLowerCase();

        let bioHtml;
        if (data.bio) {
            bioHtml = `<div class="profile-bio" id="bio-text">${escapeHtml(data.bio)}</div>`;
        } else {
            bioHtml = `<div class="profile-bio profile-bio-empty" id="bio-text">No bio set.</div>`;
        }

        let bioEditBtn = '';
        if (isOwnProfile) {
            bioEditBtn = `<button class="bio-edit-btn" id="bio-edit-btn">Edit Bio</button>`;
        }

        return `
            <div class="profile-header">
                <div class="profile-avatar">${avatarContent}</div>
                <div class="profile-info">
                    <div class="profile-name-row">
                        <span class="profile-name">${escapeHtml(data.username)}</span>
                        <span class="profile-badges">${badges}</span>
                    </div>
                    <div class="profile-status">${statusDot}</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${bioHtml}
                        ${bioEditBtn}
                    </div>
                    <div class="bio-editor" id="bio-editor" style="display:none"></div>
                    <div class="profile-meta">
                        <span>Joined ${formatDate(data.createdAt)}</span>
                        <span>Playtime: ${formatPlaytime(data.totalPlaytimeMinutes)}</span>
                        <span>Combat Lvl: ${data.combatLevel || 3}</span>
                    </div>
                </div>
            </div>`;
    }

    // === Overall Card ===
    function renderOverall(data) {
        if (!data.skills || !data.skills.overall) return '';

        const o = data.skills.overall;
        return `
            <div class="profile-overall">
                <img src="assets/skills/overall.png" alt="Overall" class="profile-overall-icon">
                <div class="profile-overall-stats">
                    <div class="profile-overall-stat">
                        <span class="label">Rank</span>
                        <span class="value accent">#${formatNumber(o.rank)}</span>
                    </div>
                    <div class="profile-overall-stat">
                        <span class="label">Total Level</span>
                        <span class="value">${formatNumber(o.level)}</span>
                    </div>
                    <div class="profile-overall-stat">
                        <span class="label">Total XP</span>
                        <span class="value">${formatNumber(o.xp)}</span>
                    </div>
                    <div class="profile-overall-stat">
                        <span class="label">Grade</span>
                        <span class="value">${renderGradePill(o.xp)}</span>
                    </div>
                </div>
            </div>`;
    }

    // === Skills Grid ===
    function renderSkills(data) {
        let html = '<div class="profile-section-title">Skills</div>';
        html += '<div class="skills-grid">';

        for (const skill of SKILLS) {
            const s = data.skills ? data.skills[skill.key] : null;
            const level = s ? s.level : 1;

            html += `
                <div class="skill-cell" title="${skill.name}: Level ${level}">
                    <img src="${skill.icon}" alt="${skill.name}" class="skill-cell-icon">
                    <span class="skill-cell-name">${skill.name}</span>
                    <span class="skill-cell-level">${level}</span>
                </div>`;
        }

        html += '</div>';

        // Total level + XP bar
        const totalLevel = data.totalLevel || 0;
        const totalXp = data.totalXp || 0;
        html += `
            <div class="skills-total">
                <span class="label">Total Level: <strong>${formatNumber(totalLevel)}</strong></span>
                <span class="value">${formatNumber(totalXp)} XP</span>
            </div>`;

        return html;
    }

    // === Equipment Paper Doll ===
    function renderEquipment(equipment) {
        let html = '<div class="equipment-title">Equipment</div>';
        html += '<div class="equipment-doll">';

        // Build lookup from equipment array
        const equipped = {};
        if (equipment && equipment.length) {
            for (const item of equipment) {
                if (item.id && item.id > 0) {
                    equipped[item.slot] = item;
                }
            }
        }

        for (const slotDef of EQUIPMENT_SLOTS) {
            const item = equipped[slotDef.slot];
            const filled = item && item.id > 0;
            const itemName = filled && _itemsLoaded && typeof ItemData !== 'undefined'
                ? (ItemData.getName(item.id) || `Item ${item.id}`)
                : (filled ? `Item ${item.id}` : '');

            html += `<div class="equip-slot ${slotDef.cls}${filled ? ' filled' : ''}" data-slot="${slotDef.slot}" data-item-id="${filled ? item.id : ''}">`;

            if (filled) {
                html += `<div class="equip-tooltip">${escapeHtml(itemName)}</div>`;
            } else {
                html += `<span class="equip-slot-label">${slotDef.name}</span>`;
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function applyEquipmentIcons(equipment) {
        if (!equipment || !_itemsLoaded || typeof ItemData === 'undefined') return;

        const equipped = {};
        for (const item of equipment) {
            if (item.id && item.id > 0) equipped[item.slot] = item;
        }

        for (const slotDef of EQUIPMENT_SLOTS) {
            const item = equipped[slotDef.slot];
            if (!item || item.id <= 0) continue;

            const slotEl = document.querySelector(`.equip-slot[data-slot="${slotDef.slot}"]`);
            if (!slotEl) continue;

            const iconEl = ItemData.createIcon(item.id, { size: 'lg' });
            if (iconEl) {
                slotEl.prepend(iconEl);
            }
        }
    }

    // === Hiscores Snapshot ===
    function renderHiscores(data) {
        if (!data.skills || !data.skills.overall) return '';

        const rank = data.skills.overall.rank;
        const username = data.username;

        return `
            <div class="profile-hiscores">
                <div class="profile-hiscores-title">Hiscores</div>
                <div class="profile-hiscores-rank">Rank #${formatNumber(rank)}</div>
                <a href="https://hiscores.elderos.io?player=${encodeURIComponent(username)}" class="profile-hiscores-link">View full hiscores &rarr;</a>
            </div>`;
    }

    // === Bio Editor ===
    function bindBioEditor(data) {
        const editBtn = document.getElementById('bio-edit-btn');
        if (!editBtn) return;

        editBtn.addEventListener('click', () => {
            showBioEditor(data);
        });
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

        cancelBtn.addEventListener('click', () => {
            hideBioEditor(data);
        });

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

                // Update local data
                data.bio = result.bio;
                hideBioEditor(data);
                showToast('Bio updated!', 'success');

            } catch (err) {
                console.error('Bio update failed:', err);
                showToast('Failed to update bio. Please try again.', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save';
            }
        });
    }

    function hideBioEditor(data) {
        const bioText = document.getElementById('bio-text');
        const editBtn = document.getElementById('bio-edit-btn');
        const editor = document.getElementById('bio-editor');

        if (editor) {
            editor.style.display = 'none';
            editor.innerHTML = '';
        }

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
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // === Initialize ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
