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
    let _searchIndex = null; // [{id, nameLower}]

    const SIZES = {
        sm: { w: 24, h: 21, scale: 24 / 36 },
        md: { w: 36, h: 32, scale: 1 },
        lg: { w: 48, h: 43, scale: 48 / 36 }
    };

    function _buildSearchIndex() {
        if (!_items) return;
        _searchIndex = [];
        for (const id of Object.keys(_items)) {
            const entry = _items[id];
            _searchIndex.push({ id: parseInt(id), nameLower: entry.n.toLowerCase() });
        }
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

        /** Get item entry by ID */
        get(itemId) {
            if (!_items) return null;
            const entry = _items[String(itemId)];
            if (!entry) return null;
            return {
                id: itemId,
                name: entry.n,
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
            return entry ? entry.n : null;
        },

        /** Check if item ID exists */
        exists(itemId) {
            return _items ? String(itemId) in _items : false;
        },

        /**
         * Create a <div> element with the item's sprite as background.
         * @param {number} itemId
         * @param {Object} [options]
         * @param {string} [options.size='md'] - 'sm' (24x21), 'md' (36x32), 'lg' (48x43)
         * @returns {HTMLElement}
         */
        createIcon(itemId, options = {}) {
            const size = SIZES[options.size] || SIZES.md;
            const el = document.createElement('div');
            el.className = 'item-icon';

            if (!_items) {
                el.classList.add('item-icon--missing');
                el.style.width = size.w + 'px';
                el.style.height = size.h + 'px';
                return el;
            }

            const entry = _items[String(itemId)];
            if (!entry) {
                el.classList.add('item-icon--missing');
                el.style.width = size.w + 'px';
                el.style.height = size.h + 'px';
                return el;
            }

            el.style.width = size.w + 'px';
            el.style.height = size.h + 'px';
            el.style.backgroundImage = `url('/shared/sprites/items-${entry.s}.png')`;
            el.style.backgroundPosition = `-${entry.x * size.scale}px -${entry.y * size.scale}px`;
            el.style.backgroundSize = `${_meta.cols * _meta.spriteWidth * size.scale}px auto`;
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

            if (!_items) {
                element.classList.add('item-icon', 'item-icon--missing');
                element.style.width = size.w + 'px';
                element.style.height = size.h + 'px';
                return;
            }

            const entry = _items[String(itemId)];
            if (!entry) {
                element.classList.add('item-icon', 'item-icon--missing');
                element.style.width = size.w + 'px';
                element.style.height = size.h + 'px';
                return;
            }

            element.classList.add('item-icon');
            element.style.width = size.w + 'px';
            element.style.height = size.h + 'px';
            element.style.backgroundImage = `url('/shared/sprites/items-${entry.s}.png')`;
            element.style.backgroundPosition = `-${entry.x * size.scale}px -${entry.y * size.scale}px`;
            element.style.backgroundSize = `${_meta.cols * _meta.spriteWidth * size.scale}px auto`;
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
            return results.map(e => ({ id: e.id, name: _items[String(e.id)].n }));
        }
    };
})();
