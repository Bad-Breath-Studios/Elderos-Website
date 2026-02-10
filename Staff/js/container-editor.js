/* ============================================================
   CONTAINER EDITOR — Visual item grid editor for inventory/equipment/bank
   ============================================================ */
console.log('[ContainerEditor] Loading container-editor.js...');

const ContainerEditor = (() => {
    'use strict';

    // Layout definitions
    const LAYOUTS = {
        inventory:  { type: 'grid', cols: 4, rows: 7, maxSlots: 28, slotW: 42, slotH: 36, gap: 4, label: 'Inventory' },
        equipment:  { type: 'equipment', maxSlots: 14, slotW: 42, slotH: 36, label: 'Equipment',
            positions: {
                0: 'Head', 1: 'Cape', 2: 'Amulet', 3: 'Weapon', 4: 'Body',
                5: 'Shield', 7: 'Legs', 9: 'Gloves', 10: 'Boots', 12: 'Ring', 13: 'Ammo'
            }
        },
        bank:       { type: 'grid', cols: 8, rows: null, maxSlots: 816, slotW: 38, slotH: 34, gap: 2, label: 'Bank', scrollable: true }
    };

    // Equipment slot key → slot index
    const EQUIP_KEYS = { head: 0, cape: 1, amulet: 2, weapon: 3, body: 4, shield: 5, legs: 7, gloves: 9, boots: 10, ring: 12, ammo: 13 };
    const EQUIP_DISPLAY_SLOTS = [0, 1, 2, 3, 4, 5, 7, 9, 10, 12, 13];

    // State
    let _overlay = null;
    let _popover = null;
    let _popoverSlot = -1;
    let _popoverClosedAt = 0;
    let _playerId = null;
    let _playerName = '';
    let _isOnline = false;
    let _containerType = null;
    let _layout = null;
    let _slots = [];   // sparse: [{slot, id, amount}, ...]
    let _saving = false;
    let _canEdit = false;

    // Drag state
    let _dragSlot = null;
    let _dragGhost = null;
    let _dragStartX = 0;
    let _dragStartY = 0;
    let _isDragging = false;

    // ==================== Quantity Formatting ====================

    function formatQuantity(amount) {
        if (amount <= 1) return null;
        if (amount < 100000) return { text: String(amount), cls: 'qty-yellow' };
        if (amount < 10000000) return { text: Math.floor(amount / 1000) + 'K', cls: 'qty-white' };
        if (amount < 1000000000) return { text: Math.floor(amount / 1000000) + 'M', cls: 'qty-green' };
        return { text: Math.floor(amount / 1000000000) + 'B', cls: 'qty-cyan' };
    }

    // ==================== Slot Data Helpers ====================

    function getSlotItem(slotIndex) {
        return _slots.find(s => s.slot === slotIndex) || null;
    }

    function setSlotItem(slotIndex, itemId, amount) {
        _slots = _slots.filter(s => s.slot !== slotIndex);
        if (itemId && amount > 0) {
            _slots.push({ slot: slotIndex, id: itemId, amount: amount });
        }
    }

    function swapSlots(a, b) {
        const itemA = getSlotItem(a);
        const itemB = getSlotItem(b);
        _slots = _slots.filter(s => s.slot !== a && s.slot !== b);
        if (itemA) _slots.push({ slot: b, id: itemA.id, amount: itemA.amount });
        if (itemB) _slots.push({ slot: a, id: itemB.id, amount: itemB.amount });
    }

    // ==================== Rendering ====================

    function buildModal() {
        const overlay = document.createElement('div');
        overlay.className = 'container-editor-overlay';
        overlay.addEventListener('mousedown', e => {
            if (e.target === overlay) close();
        });

        const modal = document.createElement('div');
        modal.className = 'container-editor-modal' + (_containerType === 'bank' ? ' ce-bank' : '');

        // Header
        const header = document.createElement('div');
        header.className = 'ce-header';
        header.innerHTML = `
            <div class="ce-header-left">
                <span class="ce-header-title">${_layout.label}</span>
                <span class="ce-header-player">${_escHtml(_playerName)}</span>
                <span class="ce-header-pill ${_isOnline ? 'online' : 'offline'}">
                    <span class="pill-dot"></span>
                    ${_isOnline ? 'Online' : 'Offline'}
                </span>
            </div>
            <button class="ce-close-btn" title="Close (Esc)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        header.querySelector('.ce-close-btn').addEventListener('click', close);

        // Body
        const body = document.createElement('div');
        body.className = 'ce-body';

        const grid = buildGrid();
        body.appendChild(grid);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'ce-footer';
        footer.innerHTML = `
            <div class="ce-footer-left">
                <span class="ce-status" id="ceStatus">
                    ${_slots.length} item${_slots.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div class="ce-footer-right">
                ${_canEdit ? `<button class="ce-btn ce-btn-danger" id="ceClearAll">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Clear All
                </button>` : ''}
            </div>
        `;

        if (_canEdit) {
            footer.querySelector('#ceClearAll').addEventListener('click', showClearConfirm);
        }

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        return overlay;
    }

    function buildGrid() {
        if (_layout.type === 'equipment') return buildEquipmentGrid();

        const grid = document.createElement('div');
        grid.className = 'ce-grid ' + (_containerType === 'bank' ? 'ce-bank-grid' : 'ce-inv-grid');

        // For bank, only render up to last occupied slot + 2 rows
        let slotCount = _layout.maxSlots;
        if (_containerType === 'bank') {
            const maxOccupied = _slots.reduce((max, s) => Math.max(max, s.slot), -1);
            slotCount = Math.min(_layout.maxSlots, Math.max(maxOccupied + _layout.cols * 2 + 1, _layout.cols * 5));
        }

        for (let i = 0; i < slotCount; i++) {
            grid.appendChild(buildSlot(i));
        }

        return grid;
    }

    function buildEquipmentGrid() {
        const grid = document.createElement('div');
        grid.className = 'ce-equipment';

        for (const [key, slotIdx] of Object.entries(EQUIP_KEYS)) {
            const slot = buildSlot(slotIdx);
            slot.classList.add('ce-equip-slot');
            slot.dataset.equip = key;

            // Show label if empty
            const item = getSlotItem(slotIdx);
            if (!item) {
                const label = document.createElement('span');
                label.className = 'slot-label';
                label.textContent = _layout.positions[slotIdx] || '';
                slot.appendChild(label);
            }

            grid.appendChild(slot);
        }

        return grid;
    }

    function buildSlot(slotIndex) {
        const el = document.createElement('div');
        el.className = 'container-slot';
        el.dataset.slot = slotIndex;

        const item = getSlotItem(slotIndex);
        if (item) {
            el.classList.add('occupied');

            // Item sprite
            if (typeof ItemData !== 'undefined' && ItemData.isLoaded()) {
                const size = _containerType === 'bank' ? 'sm' : 'md';
                const icon = ItemData.createIcon(item.id, { size });
                el.appendChild(icon);
            }

            // Quantity overlay
            const qty = formatQuantity(item.amount);
            if (qty) {
                const span = document.createElement('span');
                span.className = 'slot-quantity ' + qty.cls;
                span.textContent = qty.text;
                el.appendChild(span);
            }
        }

        // Click handler
        el.addEventListener('mousedown', e => onSlotMouseDown(e, slotIndex));

        return el;
    }

    function refreshGrid() {
        const body = _overlay?.querySelector('.ce-body');
        if (!body) return;
        body.innerHTML = '';
        body.appendChild(buildGrid());

        const status = _overlay?.querySelector('#ceStatus');
        if (status) {
            status.className = 'ce-status';
            status.textContent = _slots.length + ' item' + (_slots.length !== 1 ? 's' : '');
        }
    }

    function setStatus(text, cls) {
        const el = _overlay?.querySelector('#ceStatus');
        if (!el) return;
        el.className = 'ce-status' + (cls ? ' ' + cls : '');
        if (cls === 'saving') {
            el.innerHTML = `<span class="ce-spinner"></span> ${_escHtml(text)}`;
        } else {
            el.textContent = text;
        }
    }

    // ==================== Slot Interactions ====================

    function onSlotMouseDown(e, slotIndex) {
        if (e.button !== 0) return; // left click only

        // If clicking the same slot that had a popover, just toggle it closed
        const wasShowingForThisSlot = _popoverSlot === slotIndex;
        closePopover();
        if (wasShowingForThisSlot) return;

        const item = getSlotItem(slotIndex);

        if (_canEdit && item) {
            // Start potential drag
            _dragSlot = slotIndex;
            _dragStartX = e.clientX;
            _dragStartY = e.clientY;
            _isDragging = false;

            const onMouseMove = ev => {
                const dx = ev.clientX - _dragStartX;
                const dy = ev.clientY - _dragStartY;
                if (!_isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                    _isDragging = true;
                    startDrag(slotIndex, ev);
                }
                if (_isDragging) moveDrag(ev);
            };
            const onMouseUp = ev => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (_isDragging) {
                    endDrag(ev);
                } else {
                    // It was a click, show popover
                    showOccupiedPopover(slotIndex, ev);
                }
                _dragSlot = null;
                _isDragging = false;
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else if (item) {
            // Read-only click
            showOccupiedPopover(slotIndex, e);
        } else if (_canEdit) {
            // Empty slot - show add item popover
            showAddItemPopover(slotIndex, e);
        }
    }

    // ==================== Drag & Drop ====================

    function startDrag(slotIndex, e) {
        // Mark source slot
        const slotEl = _overlay.querySelector(`.container-slot[data-slot="${slotIndex}"]`);
        if (slotEl) slotEl.classList.add('dragging');

        // Create ghost
        _dragGhost = document.createElement('div');
        _dragGhost.className = 'container-drag-ghost';
        _dragGhost.style.width = (_layout.type === 'grid' && _containerType === 'bank' ? 38 : 42) + 'px';
        _dragGhost.style.height = (_layout.type === 'grid' && _containerType === 'bank' ? 34 : 36) + 'px';

        const item = getSlotItem(slotIndex);
        if (item && typeof ItemData !== 'undefined' && ItemData.isLoaded()) {
            const icon = ItemData.createIcon(item.id, { size: _containerType === 'bank' ? 'sm' : 'md' });
            _dragGhost.appendChild(icon);
        }

        _dragGhost.style.left = (e.clientX - 20) + 'px';
        _dragGhost.style.top = (e.clientY - 18) + 'px';
        document.body.appendChild(_dragGhost);
    }

    function moveDrag(e) {
        if (_dragGhost) {
            _dragGhost.style.left = (e.clientX - 20) + 'px';
            _dragGhost.style.top = (e.clientY - 18) + 'px';
        }

        // Highlight hovered slot
        _overlay.querySelectorAll('.container-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = target?.closest?.('.container-slot');
        if (slotEl && slotEl.dataset.slot !== String(_dragSlot)) {
            slotEl.classList.add('drag-over');
        }
    }

    function endDrag(e) {
        // Remove ghost
        if (_dragGhost) {
            _dragGhost.remove();
            _dragGhost = null;
        }

        // Remove dragging state
        _overlay.querySelectorAll('.container-slot.dragging, .container-slot.drag-over').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });

        // Find drop target
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = target?.closest?.('.container-slot');
        if (!slotEl) return;

        const targetSlot = parseInt(slotEl.dataset.slot);
        if (isNaN(targetSlot) || targetSlot === _dragSlot) return;

        // Perform swap via API
        performSwap(_dragSlot, targetSlot);
    }

    // ==================== API Actions ====================

    async function performAction(action) {
        if (_saving) return;
        _saving = true;
        setStatus('Saving...', 'saving');

        try {
            const result = await API.containers.update(_playerId, _containerType, action);
            if (result && result.success) {
                _slots = result.slots || [];
                _isOnline = result.playerOnline;
                refreshGrid();
            } else {
                setStatus('Error: ' + (result?.message || 'Unknown'), 'error');
            }
        } catch (err) {
            console.error('[ContainerEditor] Action failed:', err);
            setStatus('Error: ' + (err.message || 'Request failed'), 'error');
        } finally {
            _saving = false;
        }
    }

    function performSwap(fromSlot, toSlot) {
        performAction({ action: 'swap', slot: fromSlot, targetSlot: toSlot });
    }

    function performSet(slot, itemId, quantity) {
        performAction({ action: 'set', slot, itemId, quantity });
    }

    function performDelete(slot) {
        performAction({ action: 'delete', slot });
    }

    function performClear() {
        performAction({ action: 'clear' });
    }

    // ==================== Popovers ====================

    function closePopover() {
        if (_popover) {
            _popover.remove();
            _popover = null;
            _popoverClosedAt = Date.now();
        }
        _popoverSlot = -1;
    }

    function positionPopover(popover, anchorEl) {
        document.body.appendChild(popover);

        const rect = anchorEl.getBoundingClientRect();
        const pw = popover.offsetWidth;
        const ph = popover.offsetHeight;

        let left = rect.right + 6;
        let top = rect.top;

        // Flip horizontally if off-screen
        if (left + pw > window.innerWidth - 10) {
            left = rect.left - pw - 6;
        }
        // Flip vertically if off-screen
        if (top + ph > window.innerHeight - 10) {
            top = window.innerHeight - ph - 10;
        }
        if (top < 10) top = 10;

        popover.style.left = left + 'px';
        popover.style.top = top + 'px';
    }

    function showOccupiedPopover(slotIndex, e) {
        closePopover();
        // If this slot was JUST closed (within 50ms), don't reopen — it was a toggle
        if (Date.now() - _popoverClosedAt < 50) return;
        const item = getSlotItem(slotIndex);
        if (!item) return;
        _popoverSlot = slotIndex;

        const itemName = (typeof ItemData !== 'undefined' && ItemData.isLoaded()) ? (ItemData.getName(item.id) || 'Unknown') : 'Item';

        const pop = document.createElement('div');
        pop.className = 'slot-popover';

        let html = `
            <div class="slot-popover-header">
                <div class="slot-popover-item-name">${_escHtml(itemName)}</div>
                <div class="slot-popover-item-id">ID: ${item.id} &middot; Slot: ${slotIndex} &middot; Qty: ${item.amount.toLocaleString()}</div>
            </div>
        `;

        if (_canEdit) {
            html += `
                <div class="slot-popover-qty-row">
                    <label>Qty:</label>
                    <input type="number" class="slot-popover-qty-input" value="${item.amount}" min="1" max="2147483647" id="ceQtyInput">
                    <button class="slot-popover-qty-save" id="ceQtySave">Save</button>
                </div>
                <button class="slot-popover-action" id="ceCopyId">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Item ID
                </button>
                <button class="slot-popover-action danger" id="ceDeleteItem">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete Item
                </button>
            `;
        } else {
            html += `
                <button class="slot-popover-action" id="ceCopyId">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Item ID
                </button>
            `;
        }

        pop.innerHTML = html;
        _popover = pop;

        const slotEl = _overlay.querySelector(`.container-slot[data-slot="${slotIndex}"]`);
        positionPopover(pop, slotEl || e.target);

        // Bind actions
        pop.querySelector('#ceCopyId').addEventListener('click', () => {
            navigator.clipboard.writeText(String(item.id)).catch(() => {});
            closePopover();
        });

        if (_canEdit) {
            pop.querySelector('#ceQtySave').addEventListener('click', () => {
                const input = pop.querySelector('#ceQtyInput');
                const val = parseInt(input.value);
                if (!val || val < 1) return;
                closePopover();
                performSet(slotIndex, item.id, val);
            });

            pop.querySelector('#ceQtyInput').addEventListener('keydown', ev => {
                if (ev.key === 'Enter') {
                    pop.querySelector('#ceQtySave').click();
                }
            });

            pop.querySelector('#ceDeleteItem').addEventListener('click', () => {
                closePopover();
                performDelete(slotIndex);
            });
        }

        // Close on outside click
        setTimeout(() => {
            const handler = ev => {
                if (!pop.contains(ev.target)) {
                    closePopover();
                    document.removeEventListener('mousedown', handler);
                }
            };
            document.addEventListener('mousedown', handler);
        }, 10);
    }

    function showAddItemPopover(slotIndex, e) {
        closePopover();
        _popoverSlot = slotIndex;

        const pop = document.createElement('div');
        pop.className = 'slot-popover';

        let selectedItemId = null;

        pop.innerHTML = `
            <div class="slot-popover-search">
                <input type="text" placeholder="Search item name..." id="ceSearchInput" autocomplete="off">
            </div>
            <div class="slot-popover-results" id="ceSearchResults">
                <div class="slot-popover-empty">Type to search items</div>
            </div>
            <div class="slot-popover-add-row" style="display:none" id="ceAddRow">
                <label>Qty:</label>
                <input type="number" value="1" min="1" max="2147483647" id="ceAddQty">
                <button class="slot-popover-add-btn" id="ceAddBtn">Add</button>
            </div>
        `;
        _popover = pop;

        const slotEl = _overlay.querySelector(`.container-slot[data-slot="${slotIndex}"]`);
        positionPopover(pop, slotEl || e.target);

        const searchInput = pop.querySelector('#ceSearchInput');
        const resultsDiv = pop.querySelector('#ceSearchResults');
        const addRow = pop.querySelector('#ceAddRow');
        const addBtn = pop.querySelector('#ceAddBtn');
        const addQty = pop.querySelector('#ceAddQty');

        searchInput.focus();

        let searchTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const query = searchInput.value.trim();
                if (!query || query.length < 2) {
                    resultsDiv.innerHTML = '<div class="slot-popover-empty">Type to search items</div>';
                    addRow.style.display = 'none';
                    selectedItemId = null;
                    return;
                }

                if (typeof ItemData === 'undefined' || !ItemData.isLoaded()) {
                    resultsDiv.innerHTML = '<div class="slot-popover-empty">Item data not loaded</div>';
                    return;
                }

                const results = ItemData.search(query, 10);
                if (results.length === 0) {
                    resultsDiv.innerHTML = '<div class="slot-popover-empty">No items found</div>';
                    addRow.style.display = 'none';
                    selectedItemId = null;
                    return;
                }

                resultsDiv.innerHTML = results.map(r => `
                    <div class="slot-popover-result" data-item-id="${r.id}">
                        <div class="item-icon-wrapper"></div>
                        <span class="result-name">${_escHtml(r.name)}</span>
                        <span class="result-id">#${r.id}</span>
                    </div>
                `).join('');

                // Add sprites
                resultsDiv.querySelectorAll('.slot-popover-result').forEach(row => {
                    const id = parseInt(row.dataset.itemId);
                    const wrapper = row.querySelector('.item-icon-wrapper');
                    const icon = ItemData.createIcon(id, { size: 'sm' });
                    wrapper.appendChild(icon);

                    row.addEventListener('click', () => {
                        selectedItemId = id;
                        searchInput.value = ItemData.getName(id) || 'Item #' + id;
                        addRow.style.display = 'flex';
                        addQty.focus();
                        addQty.select();
                        resultsDiv.innerHTML = '';
                    });
                });
            }, 150);
        });

        addBtn.addEventListener('click', () => {
            if (!selectedItemId) return;
            const qty = parseInt(addQty.value) || 1;
            closePopover();
            performSet(slotIndex, selectedItemId, qty);
        });

        addQty.addEventListener('keydown', ev => {
            if (ev.key === 'Enter') addBtn.click();
        });

        // Close on outside click
        setTimeout(() => {
            const handler = ev => {
                if (!pop.contains(ev.target)) {
                    closePopover();
                    document.removeEventListener('mousedown', handler);
                }
            };
            document.addEventListener('mousedown', handler);
        }, 10);
    }

    // ==================== Clear All Confirm ====================

    function showClearConfirm() {
        const overlay = document.createElement('div');
        overlay.className = 'ce-confirm-overlay';

        const modal = document.createElement('div');
        modal.className = 'ce-confirm-modal';
        modal.innerHTML = `
            <h3>Clear All Items</h3>
            <p>This will permanently remove all items from this ${_layout.label.toLowerCase()}. Type <strong>CLEAR</strong> to confirm.</p>
            <input type="text" placeholder="Type CLEAR" id="ceClearInput" autocomplete="off">
            <div class="ce-confirm-actions">
                <button class="ce-btn ce-btn-secondary" id="ceClearCancel">Cancel</button>
                <button class="ce-btn ce-btn-danger" id="ceClearConfirm" disabled>Confirm</button>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = modal.querySelector('#ceClearInput');
        const confirmBtn = modal.querySelector('#ceClearConfirm');

        input.focus();
        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value.trim() !== 'CLEAR';
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && input.value.trim() === 'CLEAR') {
                overlay.remove();
                performClear();
            }
        });

        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            performClear();
        });

        modal.querySelector('#ceClearCancel').addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('mousedown', e => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ==================== Keyboard Shortcuts ====================

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            if (_popover) {
                closePopover();
            } else {
                close();
            }
        }
    }

    // ==================== Utility ====================

    function _escHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    // ==================== Public API ====================

    async function open(playerId, containerType, playerName, isOnline) {
        if (_overlay) close();

        _playerId = playerId;
        _containerType = containerType;
        _playerName = playerName || '';
        _isOnline = !!isOnline;
        _layout = LAYOUTS[containerType];
        _slots = [];
        _saving = false;
        _canEdit = Auth.hasPermission(CONFIG.PERMISSIONS.EDIT_CONTAINERS);

        if (!_layout) {
            console.error('[ContainerEditor] Unknown container type:', containerType);
            return;
        }

        // Build modal with loading state
        _overlay = buildModal();
        document.body.appendChild(_overlay);
        document.addEventListener('keydown', onKeyDown);

        // Fetch data from API
        setStatus('Loading...', 'saving');
        try {
            const result = await API.containers.get(playerId, containerType);
            if (result && result.success) {
                _slots = result.slots || [];
                _isOnline = result.playerOnline;
                // Update online pill
                const pill = _overlay.querySelector('.ce-header-pill');
                if (pill) {
                    pill.className = 'ce-header-pill ' + (_isOnline ? 'online' : 'offline');
                    pill.innerHTML = `<span class="pill-dot"></span>${_isOnline ? 'Online' : 'Offline'}`;
                }
                refreshGrid();
            } else {
                setStatus('Failed to load: ' + (result?.message || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error('[ContainerEditor] Load failed:', err);
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
        _containerType = null;
        _layout = null;
        _slots = [];
    }

    return { open, close };
})();

console.log('[ContainerEditor] container-editor.js loaded');
