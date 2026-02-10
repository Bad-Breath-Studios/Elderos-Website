/* ============================================================
   SKILL EDITOR — Visual OSRS-style skill grid editor
   ============================================================ */
console.log('[SkillEditor] Loading skill-editor.js...');

const SkillEditor = (() => {
    'use strict';

    // OSRS XP table — index 0 = level 1 (0 XP), index 98 = level 99 (13,034,431 XP)
    const XP_TABLE = [
        0, 83, 174, 276, 388, 512, 650, 801, 969, 1154,
        1358, 1584, 1833, 2107, 2411, 2746, 3115, 3523, 3973, 4470,
        5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 12031, 13363,
        14833, 16456, 18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224,
        41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014, 91721, 101333,
        111945, 123660, 136594, 150872, 166636, 184040, 203254, 224466, 247886, 273742,
        302288, 333804, 368599, 407015, 449428, 496254, 547953, 605032, 668051, 737627,
        814445, 899257, 992895, 1096278, 1210421, 1336443, 1475581, 1629200, 1798808, 1986068,
        2192818, 2421087, 2673114, 2951373, 3258594, 3597792, 3972294, 4385776, 4842295, 5346332,
        5902831, 6517253, 7195629, 7944614, 8771558, 9684577, 10692629, 11805606, 13034431
    ];

    // 23 skills with IDs, names, icon filenames
    const SKILLS = [
        { id: 0,  name: 'Attack',       icon: 'attack.png' },
        { id: 1,  name: 'Defence',      icon: 'defence.png' },
        { id: 2,  name: 'Strength',     icon: 'strength.png' },
        { id: 3,  name: 'Hitpoints',    icon: 'constitution.png' },
        { id: 4,  name: 'Ranged',       icon: 'range.png' },
        { id: 5,  name: 'Prayer',       icon: 'prayer.png' },
        { id: 6,  name: 'Magic',        icon: 'magic.png' },
        { id: 7,  name: 'Cooking',      icon: 'cooking.png' },
        { id: 8,  name: 'Woodcutting',  icon: 'woodcutting.png' },
        { id: 9,  name: 'Fletching',    icon: 'fletching.png' },
        { id: 10, name: 'Fishing',      icon: 'fishing.png' },
        { id: 11, name: 'Firemaking',   icon: 'firemaking.png' },
        { id: 12, name: 'Crafting',     icon: 'crafting.png' },
        { id: 13, name: 'Smithing',     icon: 'smithing.png' },
        { id: 14, name: 'Mining',       icon: 'mining.png' },
        { id: 15, name: 'Herblore',     icon: 'herblore.png' },
        { id: 16, name: 'Agility',      icon: 'agility.png' },
        { id: 17, name: 'Thieving',     icon: 'thieving.png' },
        { id: 18, name: 'Slayer',       icon: 'slayer.png' },
        { id: 19, name: 'Farming',      icon: 'farming.png' },
        { id: 20, name: 'Runecrafting', icon: 'runecrafting.png' },
        { id: 21, name: 'Hunter',       icon: 'hunter.png' },
        { id: 22, name: 'Augmentation', icon: 'augmentation.png' }
    ];

    // OSRS skill tab layout: 3 columns x 8 rows (last cell = Total)
    const LAYOUT = [
        [0, 3, 14],    // Attack, Hitpoints, Mining
        [2, 16, 13],   // Strength, Agility, Smithing
        [1, 15, 10],   // Defence, Herblore, Fishing
        [4, 17, 7],    // Ranged, Thieving, Cooking
        [5, 12, 11],   // Prayer, Crafting, Firemaking
        [6, 9, 8],     // Magic, Fletching, Woodcutting
        [20, 18, 19],  // Runecrafting, Slayer, Farming
        [22, 21, -1]   // Augmentation, Hunter, Total
    ];

    // State
    let _overlay = null;
    let _popover = null;
    let _popoverSkillId = -1;
    let _playerId = null;
    let _profileType = null;
    let _playerName = '';
    let _isOnline = false;
    let _skills = [];       // [{id, xp, level, baseLevel}, ...]
    let _saving = false;
    let _canEdit = false;

    // ==================== Helpers ====================

    function levelForXp(xp) {
        if (xp >= XP_TABLE[98]) return 99;
        let lo = 0, hi = 97;
        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            if (XP_TABLE[mid + 1] <= xp) lo = mid + 1;
            else if (XP_TABLE[mid] > xp) hi = mid - 1;
            else return mid + 1;
        }
        return 1;
    }

    function xpForLevel(level) {
        if (level < 1) return 0;
        if (level > 99) return XP_TABLE[98];
        return XP_TABLE[level - 1];
    }

    function formatXp(xp) {
        return Number(xp).toLocaleString();
    }

    function getSkill(id) {
        return _skills.find(s => s.id === id) || null;
    }

    function getSkillDef(id) {
        return SKILLS.find(s => s.id === id) || null;
    }

    function _escHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    // ==================== Modal Building ====================

    function buildModal() {
        const overlay = document.createElement('div');
        overlay.className = 'skill-editor-overlay';
        overlay.addEventListener('mousedown', e => {
            if (e.target === overlay) close();
        });

        const modal = document.createElement('div');
        modal.className = 'skill-editor-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'se-header';
        header.innerHTML = `
            <div class="se-header-left">
                <span class="se-header-title">Skills</span>
                <span class="se-header-player">${_escHtml(_playerName)}</span>
                <span class="se-header-pill ${_isOnline ? 'online' : 'offline'}">
                    <span class="pill-dot"></span>
                    ${_isOnline ? 'Online' : 'Offline'}
                </span>
            </div>
            <button class="se-close-btn" title="Close (Esc)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        header.querySelector('.se-close-btn').addEventListener('click', close);

        // Body
        const body = document.createElement('div');
        body.className = 'se-body';
        body.appendChild(buildGrid());

        // Footer
        const footer = document.createElement('div');
        footer.className = 'se-footer';

        const totalLevel = _skills.reduce((sum, s) => sum + (s.baseLevel || levelForXp(s.xp)), 0);
        const totalXp = _skills.reduce((sum, s) => sum + s.xp, 0);

        footer.innerHTML = `
            <div class="se-footer-left">
                <span class="se-status" id="seStatus">
                    Total: ${totalLevel} / ${23 * 99} &middot; XP: ${formatXp(totalXp)}
                </span>
            </div>
            <div class="se-footer-right">
                ${_canEdit ? `
                    <button class="se-btn se-btn-success" id="seMaxAll">Max All</button>
                    <button class="se-btn se-btn-danger" id="seResetAll">Reset All</button>
                ` : ''}
            </div>
        `;

        if (_canEdit) {
            footer.querySelector('#seMaxAll').addEventListener('click', () => showBulkConfirm('max_all'));
            footer.querySelector('#seResetAll').addEventListener('click', () => showBulkConfirm('reset_all'));
        }

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        return overlay;
    }

    function buildGrid() {
        const grid = document.createElement('div');
        grid.className = 'se-skill-grid';

        for (const row of LAYOUT) {
            for (const skillId of row) {
                if (skillId === -1) {
                    grid.appendChild(buildTotalCell());
                } else {
                    grid.appendChild(buildSkillCell(skillId));
                }
            }
        }

        return grid;
    }

    function buildSkillCell(skillId) {
        const def = getSkillDef(skillId);
        const skill = getSkill(skillId);
        if (!def) return document.createElement('div');

        const xp = skill ? skill.xp : 0;
        const currentLevel = skill ? skill.level : 1;
        const baseLevel = skill ? (skill.baseLevel || levelForXp(xp)) : 1;

        const cell = document.createElement('div');
        cell.className = 'se-skill-cell';
        cell.dataset.skillId = skillId;

        // Level display class
        let levelClass = '';
        if (currentLevel < baseLevel) levelClass = ' se-drained';
        else if (currentLevel > baseLevel) levelClass = ' se-boosted';

        cell.innerHTML = `
            <img class="se-skill-icon" src="/shared/sprites/skills/${def.icon}" alt="${def.name}" loading="lazy">
            <span class="se-skill-name">${def.name}</span>
            <span class="se-skill-level${levelClass}">${currentLevel}/${baseLevel}</span>
        `;

        cell.addEventListener('click', e => onSkillCellClick(skillId, e));

        return cell;
    }

    function buildTotalCell() {
        const totalLevel = _skills.reduce((sum, s) => sum + (s.baseLevel || levelForXp(s.xp)), 0);
        const totalXp = _skills.reduce((sum, s) => sum + s.xp, 0);

        const cell = document.createElement('div');
        cell.className = 'se-skill-cell se-total';

        cell.innerHTML = `
            <img class="se-skill-icon" src="/shared/sprites/skills/overall.png" alt="Total" loading="lazy">
            <span class="se-skill-name">Total</span>
            <span class="se-skill-level">${totalLevel}</span>
        `;

        return cell;
    }

    function refreshGrid() {
        const body = _overlay?.querySelector('.se-body');
        if (!body) return;
        body.innerHTML = '';
        body.appendChild(buildGrid());
        updateFooter();
    }

    function updateFooter() {
        const totalLevel = _skills.reduce((sum, s) => sum + (s.baseLevel || levelForXp(s.xp)), 0);
        const totalXp = _skills.reduce((sum, s) => sum + s.xp, 0);
        const status = _overlay?.querySelector('#seStatus');
        if (status) {
            status.className = 'se-status';
            status.textContent = `Total: ${totalLevel} / ${23 * 99} \u00B7 XP: ${formatXp(totalXp)}`;
        }
    }

    function setStatus(text, cls) {
        const el = _overlay?.querySelector('#seStatus');
        if (!el) return;
        el.className = 'se-status' + (cls ? ' ' + cls : '');
        if (cls === 'saving') {
            el.innerHTML = `<span class="se-spinner"></span> ${_escHtml(text)}`;
        } else {
            el.textContent = text;
        }
    }

    // ==================== Skill Cell Click → Popover ====================

    function onSkillCellClick(skillId, e) {
        const wasShowing = _popoverSkillId === skillId;
        closePopover();
        if (wasShowing) return;

        showSkillPopover(skillId, e);
    }

    function showSkillPopover(skillId, e) {
        closePopover();
        _popoverSkillId = skillId;

        const def = getSkillDef(skillId);
        const skill = getSkill(skillId);
        if (!def) return;

        const xp = skill ? skill.xp : 0;
        const currentLevel = skill ? skill.level : 1;
        const baseLevel = skill ? (skill.baseLevel || levelForXp(xp)) : 1;

        const pop = document.createElement('div');
        pop.className = 'se-popover';

        let html = `
            <div class="se-popover-header">
                <img class="se-skill-icon" src="/shared/sprites/skills/${def.icon}" alt="${def.name}">
                <span class="se-popover-title">${def.name}</span>
            </div>
            <div class="se-popover-info">
                <div class="se-popover-row">
                    <span class="se-popover-label">XP:</span>
                    <span class="se-popover-value" id="sePopXpDisplay">${formatXp(xp)}</span>
                </div>
                <div class="se-popover-row">
                    <span class="se-popover-label">Base Level:</span>
                    <span class="se-popover-value" id="sePopLevelDisplay">${baseLevel}</span>
                </div>
                <div class="se-popover-row">
                    <span class="se-popover-label">Current Level:</span>
                    <span class="se-popover-value">${currentLevel}</span>
                </div>
            </div>
        `;

        if (_canEdit) {
            html += `
                <div class="se-popover-edit">
                    <div class="se-popover-input-row">
                        <label>XP:</label>
                        <input type="number" class="se-xp-input" id="seXpInput" value="${xp}" min="0" max="200000000">
                    </div>
                    <div class="se-popover-computed">
                        Level: <strong id="seComputedLevel">${levelForXp(xp)}</strong>
                    </div>
                    <div class="se-popover-input-row">
                        <label>Current Lvl:</label>
                        <input type="number" class="se-xp-input" id="seCurrentInput" value="${currentLevel}" min="0" max="255">
                    </div>
                    <div class="se-level-picker-label">Quick Level Select:</div>
                    <div class="se-level-grid" id="seLevelGrid"></div>
                    <button class="se-btn se-btn-primary se-popover-save" id="sePopSave">Save</button>
                </div>
            `;
        }

        pop.innerHTML = html;
        _popover = pop;

        // Position popover
        const cellEl = _overlay.querySelector(`.se-skill-cell[data-skill-id="${skillId}"]`);
        positionPopover(pop, cellEl || e.target);

        if (_canEdit) {
            // Build level picker grid (1-99)
            const levelGrid = pop.querySelector('#seLevelGrid');
            for (let lvl = 1; lvl <= 99; lvl++) {
                const btn = document.createElement('button');
                btn.className = 'se-level-btn';
                if (lvl === baseLevel) btn.classList.add('active');
                btn.textContent = lvl;
                btn.addEventListener('click', () => {
                    const newXp = xpForLevel(lvl);
                    pop.querySelector('#seXpInput').value = newXp;
                    pop.querySelector('#seComputedLevel').textContent = lvl;
                    pop.querySelector('#sePopXpDisplay').textContent = formatXp(newXp);
                    pop.querySelector('#sePopLevelDisplay').textContent = lvl;
                    pop.querySelector('#seCurrentInput').value = lvl;
                    // Update active button
                    levelGrid.querySelectorAll('.se-level-btn.active').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
                levelGrid.appendChild(btn);
            }

            // XP input → live update level display
            const xpInput = pop.querySelector('#seXpInput');
            xpInput.addEventListener('input', () => {
                const val = parseInt(xpInput.value) || 0;
                const lvl = levelForXp(val);
                pop.querySelector('#seComputedLevel').textContent = lvl;
                pop.querySelector('#sePopXpDisplay').textContent = formatXp(val);
                pop.querySelector('#sePopLevelDisplay').textContent = lvl;
                // Update active in grid
                levelGrid.querySelectorAll('.se-level-btn.active').forEach(b => b.classList.remove('active'));
                const match = levelGrid.children[lvl - 1];
                if (match) match.classList.add('active');
            });

            // Save button
            pop.querySelector('#sePopSave').addEventListener('click', () => {
                const newXp = parseInt(xpInput.value) || 0;
                const newCurrent = parseInt(pop.querySelector('#seCurrentInput').value) || 1;
                closePopover();
                performAction({
                    action: 'set',
                    skillId: skillId,
                    xp: Math.max(0, Math.min(newXp, 200000000)),
                    currentLevel: Math.max(0, Math.min(newCurrent, 255))
                });
            });

            // Enter key on inputs
            xpInput.addEventListener('keydown', ev => { if (ev.key === 'Enter') pop.querySelector('#sePopSave').click(); });
            pop.querySelector('#seCurrentInput').addEventListener('keydown', ev => { if (ev.key === 'Enter') pop.querySelector('#sePopSave').click(); });
        }

        // Close on outside click
        setTimeout(() => {
            const handler = ev => {
                if (!pop.contains(ev.target) && !ev.target.closest('.se-skill-cell')) {
                    closePopover();
                    document.removeEventListener('mousedown', handler);
                }
            };
            document.addEventListener('mousedown', handler);
        }, 10);
    }

    function positionPopover(popover, anchorEl) {
        document.body.appendChild(popover);

        const rect = anchorEl.getBoundingClientRect();
        const pw = popover.offsetWidth;
        const ph = popover.offsetHeight;

        let left = rect.right + 8;
        let top = rect.top;

        // Flip horizontally if off-screen
        if (left + pw > window.innerWidth - 10) {
            left = rect.left - pw - 8;
        }
        // Adjust vertically if off-screen
        if (top + ph > window.innerHeight - 10) {
            top = window.innerHeight - ph - 10;
        }
        if (top < 10) top = 10;

        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
    }

    function closePopover() {
        if (_popover) {
            _popover.remove();
            _popover = null;
        }
        _popoverSkillId = -1;
    }

    // ==================== Bulk Actions Confirm ====================

    function showBulkConfirm(action) {
        const label = action === 'max_all' ? 'Max All Skills' : 'Reset All Skills';
        const confirmWord = action === 'max_all' ? 'MAX' : 'RESET';
        const desc = action === 'max_all'
            ? 'This will set all skills to level 99 with 13,034,431 XP each.'
            : 'This will reset all skills to level 1 (Hitpoints to 10).';

        const overlay = document.createElement('div');
        overlay.className = 'se-confirm-overlay';

        const modal = document.createElement('div');
        modal.className = 'se-confirm-modal';
        modal.innerHTML = `
            <h3>${label}</h3>
            <p>${desc} Type <strong>${confirmWord}</strong> to confirm.</p>
            <input type="text" placeholder="Type ${confirmWord}" id="seConfirmInput" autocomplete="off">
            <div class="se-confirm-actions">
                <button class="se-btn se-btn-secondary" id="seConfirmCancel">Cancel</button>
                <button class="se-btn se-btn-danger" id="seConfirmBtn" disabled>Confirm</button>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = modal.querySelector('#seConfirmInput');
        const confirmBtn = modal.querySelector('#seConfirmBtn');

        input.focus();
        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value.trim() !== confirmWord;
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && input.value.trim() === confirmWord) {
                overlay.remove();
                performAction({ action });
            }
            if (e.key === 'Escape') overlay.remove();
        });

        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            performAction({ action });
        });

        modal.querySelector('#seConfirmCancel').addEventListener('click', () => overlay.remove());

        overlay.addEventListener('mousedown', e => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ==================== API Actions ====================

    async function performAction(actionData) {
        if (_saving) return;
        _saving = true;
        setStatus('Saving...', 'saving');

        try {
            const result = await API.skills.update(_playerId, _profileType, actionData);
            if (result && result.success) {
                _skills = result.skills || [];
                _isOnline = result.playerOnline;
                // Update online pill
                const pill = _overlay?.querySelector('.se-header-pill');
                if (pill) {
                    pill.className = 'se-header-pill ' + (_isOnline ? 'online' : 'offline');
                    pill.innerHTML = `<span class="pill-dot"></span>${_isOnline ? 'Online' : 'Offline'}`;
                }
                refreshGrid();
                Toast.success('Skill updated successfully');
            } else {
                setStatus('Error: ' + (result?.message || 'Unknown'), 'error');
                Toast.error(result?.message || 'Failed to update skill');
            }
        } catch (err) {
            console.error('[SkillEditor] Action failed:', err);
            setStatus('Error: ' + (err.message || 'Request failed'), 'error');
            Toast.error(err.message || 'Request failed');
        } finally {
            _saving = false;
        }
    }

    // ==================== Keyboard ====================

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            if (_popover) {
                closePopover();
            } else {
                close();
            }
        }
    }

    // ==================== Public API ====================

    async function open(playerId, profileType, playerName, isOnline) {
        if (_overlay) close();

        _playerId = playerId;
        _profileType = profileType;
        _playerName = playerName || '';
        _isOnline = !!isOnline;
        _skills = [];
        _saving = false;
        _canEdit = Auth.hasPermission(CONFIG.PERMISSIONS.EDIT_SKILLS);

        // Build modal with loading state
        _overlay = buildModal();
        document.body.appendChild(_overlay);
        document.addEventListener('keydown', onKeyDown);

        // Fetch data from API
        setStatus('Loading...', 'saving');
        try {
            const result = await API.skills.get(playerId, profileType);
            if (result && result.success) {
                _skills = result.skills || [];
                _isOnline = result.playerOnline;
                // Update online pill
                const pill = _overlay?.querySelector('.se-header-pill');
                if (pill) {
                    pill.className = 'se-header-pill ' + (_isOnline ? 'online' : 'offline');
                    pill.innerHTML = `<span class="pill-dot"></span>${_isOnline ? 'Online' : 'Offline'}`;
                }
                refreshGrid();
            } else {
                setStatus('Failed to load: ' + (result?.message || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error('[SkillEditor] Load failed:', err);
            setStatus('Failed to load: ' + (err.message || 'Request failed'), 'error');
        }
    }

    function close() {
        closePopover();
        if (_overlay) {
            _overlay.remove();
            _overlay = null;
        }
        document.removeEventListener('keydown', onKeyDown);
        _playerId = null;
        _profileType = null;
        _skills = [];
    }

    return { open, close };
})();

console.log('[SkillEditor] skill-editor.js loaded');
