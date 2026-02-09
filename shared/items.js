/**
 * ItemData — Shared item sprite helper.
 * Loads item-data.json and provides sprite sheet icon rendering.
 *
 * Usage:
 *   await ItemData.load();
 *   const icon = ItemData.createIcon(4151, { size: 'sm' });
 *   document.body.appendChild(icon);
 */
const ItemData = (() => {
    'use strict';

    let _data = null;      // raw manifest
    let _items = null;      // items map from manifest
    let _meta = null;       // meta block
    let _loading = null;    // loading promise (dedup)
    let _searchIndex = null; // [{id, nameLower, noted}]

    const SIZES = {
        sm: { w: 24, h: 21, scale: 24 / 36 },
        md: { w: 36, h: 32, scale: 1 },
        lg: { w: 48, h: 43, scale: 48 / 36 }
    };

    // Smaller scale for the base item inside a noted composite
    const NOTED_INNER_RATIO = 0.55;

    /** Resolve a noted item's display name (own name or base item's name) */
    function _resolveName(entry) {
        if (entry.n) return entry.n;
        if (entry.nt && entry.ln) {
            const base = _items[String(entry.ln)];
            return base ? base.n : null;
        }
        return null;
    }

    function _buildSearchIndex() {
        if (!_items) return;
        _searchIndex = [];
        for (const id of Object.keys(_items)) {
            const entry = _items[id];
            const name = _resolveName(entry);
            if (!name) continue;
            _searchIndex.push({ id: parseInt(id), nameLower: name.toLowerCase(), noted: !!entry.nt });
        }
    }

    function _preloadSpriteSheet() {
        if (!_meta) return;
        const img = new Image();
        img.src = '/shared/sprites/items-0.png';
    }

    /** Resolve a noted item's base entry (follows the ln chain) */
    function _resolveBase(entry) {
        if (!entry || !entry.nt || !entry.ln) return null;
        const base = _items[String(entry.ln)];
        // Don't follow chains deeper than 1
        return (base && !base.nt) ? base : null;
    }

    /** Apply sprite background to an element for a normal (non-noted) entry */
    function _applySpriteStyle(el, entry, size) {
        el.style.backgroundImage = `url('/shared/sprites/items-${entry.s}.png')`;
        el.style.backgroundPosition = `-${entry.x * size.scale}px -${entry.y * size.scale}px`;
        el.style.backgroundSize = `${_meta.cols * _meta.spriteWidth * size.scale}px auto`;
    }

    return {
        /** Load item data from /shared/item-data.json */
        load() {
            if (_data) return Promise.resolve();
            if (_loading) return _loading;

            _loading = fetch('/shared/item-data.json')
                .then(r => {
                    if (!r.ok) throw new Error(`Failed to load item-data.json: ${r.status}`);
                    return r.json();
                })
                .then(json => {
                    _data = json;
                    _meta = json.meta;
                    _items = json.items;
                    _buildSearchIndex();
                    _preloadSpriteSheet();
                    console.log(`[ItemData] Loaded ${_meta.totalItems} items`);
                })
                .catch(err => {
                    console.warn('[ItemData] Failed to load:', err);
                    _loading = null; // allow retry
                });

            return _loading;
        },

        /** Check if data is loaded */
        isLoaded() {
            return _data !== null;
        },

        /** Check if an item is a noted variant */
        isNoted(itemId) {
            if (!_items) return false;
            const entry = _items[String(itemId)];
            return entry ? !!entry.nt : false;
        },

        /** Get item entry by ID */
        get(itemId) {
            if (!_items) return null;
            const entry = _items[String(itemId)];
            if (!entry) return null;
            const name = _resolveName(entry);
            if (entry.nt) {
                return {
                    id: itemId,
                    name: name,
                    noted: true,
                    baseItemId: entry.ln,
                    tradeable: entry.tr,
                    stackable: entry.st,
                    value: entry.v
                };
            }
            return {
                id: itemId,
                name: name,
                noted: false,
                sheet: entry.s,
                x: entry.x,
                y: entry.y,
                tradeable: entry.tr,
                stackable: entry.st,
                value: entry.v
            };
        },

        /** Get item name by ID */
        getName(itemId) {
            if (!_items) return null;
            const entry = _items[String(itemId)];
            if (!entry) return null;
            return _resolveName(entry);
        },

        /** Check if item ID exists */
        exists(itemId) {
            return _items ? String(itemId) in _items : false;
        },

        /**
         * Create a <div> element with the item's sprite as background.
         * For noted items, renders a composite: note background + base item scaled down.
         * @param {number} itemId
         * @param {Object} [options]
         * @param {string} [options.size='md'] - 'sm' (24x21), 'md' (36x32), 'lg' (48x43)
         * @returns {HTMLElement}
         */
        createIcon(itemId, options = {}) {
            const size = SIZES[options.size] || SIZES.md;
            const el = document.createElement('div');
            el.className = 'item-icon';
            el.style.width = size.w + 'px';
            el.style.height = size.h + 'px';

            if (!_items) {
                el.classList.add('item-icon--missing');
                return el;
            }

            const entry = _items[String(itemId)];
            if (!entry) {
                el.classList.add('item-icon--missing');
                return el;
            }

            // Noted item — composite icon
            if (entry.nt) {
                const base = _resolveBase(entry);
                if (!base) {
                    el.classList.add('item-icon--missing');
                    return el;
                }

                el.classList.add('item-icon--noted');
                el.title = (_resolveName(entry) || 'Noted item') + ' (noted)';

                // Inner sprite: base item scaled down
                const inner = document.createElement('div');
                inner.className = 'item-icon-noted-inner';
                const innerScale = size.scale * NOTED_INNER_RATIO;
                inner.style.backgroundImage = `url('/shared/sprites/items-${base.s}.png')`;
                inner.style.backgroundPosition = `-${base.x * innerScale}px -${base.y * innerScale}px`;
                inner.style.backgroundSize = `${_meta.cols * _meta.spriteWidth * innerScale}px auto`;
                inner.style.width = Math.round(size.w * NOTED_INNER_RATIO) + 'px';
                inner.style.height = Math.round(size.h * NOTED_INNER_RATIO) + 'px';

                el.appendChild(inner);
                return el;
            }

            // Normal item
            _applySpriteStyle(el, entry, size);
            el.title = entry.n;
            return el;
        },

        /**
         * Apply sprite background to an existing element.
         * @param {HTMLElement} element
         * @param {number} itemId
         * @param {Object} [options]
         * @param {string} [options.size='md']
         */
        applyIcon(element, itemId, options = {}) {
            const size = SIZES[options.size] || SIZES.md;
            element.style.width = size.w + 'px';
            element.style.height = size.h + 'px';

            if (!_items) {
                element.classList.add('item-icon', 'item-icon--missing');
                return;
            }

            const entry = _items[String(itemId)];
            if (!entry) {
                element.classList.add('item-icon', 'item-icon--missing');
                return;
            }

            element.classList.add('item-icon');

            if (entry.nt) {
                const base = _resolveBase(entry);
                if (!base) {
                    element.classList.add('item-icon--missing');
                    return;
                }
                element.classList.add('item-icon--noted');
                element.title = (_resolveName(entry) || 'Noted item') + ' (noted)';

                const inner = document.createElement('div');
                inner.className = 'item-icon-noted-inner';
                const innerScale = size.scale * NOTED_INNER_RATIO;
                inner.style.backgroundImage = `url('/shared/sprites/items-${base.s}.png')`;
                inner.style.backgroundPosition = `-${base.x * innerScale}px -${base.y * innerScale}px`;
                inner.style.backgroundSize = `${_meta.cols * _meta.spriteWidth * innerScale}px auto`;
                inner.style.width = Math.round(size.w * NOTED_INNER_RATIO) + 'px';
                inner.style.height = Math.round(size.h * NOTED_INNER_RATIO) + 'px';
                element.appendChild(inner);
                return;
            }

            _applySpriteStyle(element, entry, size);
            element.title = entry.n;
        },

        /**
         * Search items by name query.
         * @param {string} query
         * @param {number} [limit=20]
         * @returns {Array<{id: number, name: string}>}
         */
        search(query, limit = 20) {
            if (!_searchIndex || !query) return [];

            const q = query.toLowerCase().trim();
            if (!q) return [];

            const exact = [];
            const startsWith = [];
            const contains = [];

            for (const entry of _searchIndex) {
                if (entry.nameLower === q) {
                    exact.push(entry);
                } else if (entry.nameLower.startsWith(q)) {
                    startsWith.push(entry);
                } else if (entry.nameLower.includes(q)) {
                    contains.push(entry);
                }

                // Early exit if we have more than enough
                if (exact.length + startsWith.length + contains.length > limit * 2) break;
            }

            const results = [...exact, ...startsWith, ...contains].slice(0, limit);
            return results.map(e => ({ id: e.id, name: _resolveName(_items[String(e.id)]) || 'Unknown' }));
        }
    };
})();
