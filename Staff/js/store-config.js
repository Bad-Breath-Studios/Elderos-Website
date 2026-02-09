/* ============================================================
   ELDEROS STAFF PANEL - STORE CONFIG EDITOR
   Dual-mode editor: Visual (form-based) + Code (CodeMirror).
   Uses the shared ConfigEditor for code mode.
   ============================================================ */
console.log('[StoreConfig] Loading store-config.js...');

const StoreConfig = {
    _editor: null,
    _mode: 'code', // 'code' | 'visual'
    _originalYaml: '',
    _fileHash: '',
    _parsedConfig: null,
    _isDirty: false,
    _hasLock: false,

    init() {
        // Nothing to cache on init
    },

    onPageLoad() {
        this.load();
    },

    onPageLeave() {
        if (this._editor) {
            this._editor.destroy();
            this._editor = null;
        }
        this._mode = 'code';
    },

    async load() {
        const container = document.getElementById('page-store-config');
        if (!container) return;

        container.innerHTML = `
            <div class="store-config-page">
                <div class="sc-mode-bar">
                    <div class="sc-mode-toggle">
                        <button class="sc-mode-btn active" data-mode="code">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <polyline points="16 18 22 12 16 6"/>
                                <polyline points="8 6 2 12 8 18"/>
                            </svg>
                            Code
                        </button>
                        <button class="sc-mode-btn" data-mode="visual">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <rect x="3" y="3" width="7" height="7"/>
                                <rect x="14" y="3" width="7" height="7"/>
                                <rect x="14" y="14" width="7" height="7"/>
                                <rect x="3" y="14" width="7" height="7"/>
                            </svg>
                            Visual
                        </button>
                    </div>
                </div>
                <div id="sc-code-container"></div>
                <div id="sc-visual-container" class="hidden">
                    <div class="sc-visual-loading">Loading visual editor...</div>
                </div>
            </div>
        `;

        // Bind mode toggle
        container.querySelectorAll('.sc-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this._switchMode(btn.dataset.mode));
        });

        // Create the code editor
        const codeContainer = document.getElementById('sc-code-container');
        this._editor = ConfigEditor.create(codeContainer, {
            configId: 'store-config',
            schemaId: 'store-config',
            warningText: 'Changes take effect within 30 seconds of publishing',
            loadFn: async () => {
                const data = await API.ashpire.getStoreConfig();
                this._originalYaml = data.yaml;
                this._fileHash = data.fileHash;
                return { yaml: data.yaml, fileHash: data.fileHash };
            },
            saveFn: async (yaml, basedOnHash) => {
                const result = await API.ashpire.saveStoreConfig(yaml, basedOnHash);
                this._originalYaml = yaml;
                this._fileHash = result.fileHash;
                return { message: result.message, fileHash: result.fileHash };
            },
            onDirtyChange: (isDirty) => {
                this._isDirty = isDirty;
            }
        });

        await this._editor.load();
    },

    _switchMode(mode) {
        if (mode === this._mode) return;

        const container = document.getElementById('page-store-config');
        if (!container) return;

        // Update toggle buttons
        container.querySelectorAll('.sc-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        const codeContainer = document.getElementById('sc-code-container');
        const visualContainer = document.getElementById('sc-visual-container');

        if (mode === 'visual') {
            // Parse current YAML to populate visual forms
            const yaml = this._editor ? this._editor.getValue() : this._originalYaml;
            let parsed;
            try {
                parsed = jsyaml.load(yaml);
            } catch (e) {
                Toast.error('Cannot switch to Visual mode: YAML has syntax errors. Fix them in Code mode first.');
                // Reset toggle
                container.querySelectorAll('.sc-mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === 'code');
                });
                return;
            }

            if (!parsed || typeof parsed !== 'object') {
                Toast.error('Cannot switch to Visual mode: YAML is empty or invalid.');
                container.querySelectorAll('.sc-mode-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.mode === 'code');
                });
                return;
            }

            this._parsedConfig = parsed;
            codeContainer.classList.add('hidden');
            visualContainer.classList.remove('hidden');
            this._renderVisualMode(parsed);
        } else {
            // Sync visual → code
            if (this._parsedConfig) {
                try {
                    const newYaml = jsyaml.dump(this._parsedConfig, {
                        indent: 2,
                        lineWidth: -1,
                        noRefs: true,
                        quotingType: '"',
                        forceQuotes: false
                    });
                    if (this._editor && this._editor.cm) {
                        this._editor.cm.setValue(newYaml);
                    }
                } catch (e) {
                    console.error('[StoreConfig] Failed to serialize visual state:', e);
                }
            }

            visualContainer.classList.add('hidden');
            codeContainer.classList.remove('hidden');
            if (this._editor && this._editor.cm) {
                this._editor.cm.refresh();
            }
        }

        this._mode = mode;
    },

    _renderVisualMode(config) {
        const container = document.getElementById('sc-visual-container');
        if (!container) return;

        container.innerHTML = `
            <div class="sc-visual-editor">
                ${this._renderEventSection(config.limited_event)}
                ${this._renderBannersSection(config.banners || [])}
                ${this._renderProductsSection(config.products || [])}
            </div>
        `;

        this._bindVisualEvents();
    },

    // --- Limited Event Section ---
    _renderEventSection(event) {
        if (!event) return '<div class="sc-section"><div class="sc-section-title">Limited Event</div><div class="sc-empty">No limited event configured</div></div>';

        return `
            <div class="sc-section sc-event-section">
                <div class="sc-section-header">
                    <div class="sc-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Limited Event
                    </div>
                    <div class="sc-section-badge" style="background: ${this._escapeAttr(event.theme?.accentColor || '#60a5fa')}">${this._escapeHtml(event.name || '')}</div>
                </div>
                <div class="sc-section-body">
                    <div class="sc-form-grid">
                        <div class="sc-field">
                            <label>Event ID</label>
                            <input type="text" data-path="limited_event.id" value="${this._escapeAttr(event.id || '')}" class="sc-input sc-mono" placeholder="e.g. winter-wonderland-2026">
                        </div>
                        <div class="sc-field">
                            <label>Name</label>
                            <input type="text" data-path="limited_event.name" value="${this._escapeAttr(event.name || '')}" class="sc-input" placeholder="Event display name">
                        </div>
                        <div class="sc-field sc-full">
                            <label>Description</label>
                            <textarea data-path="limited_event.description" class="sc-textarea" rows="2" placeholder="Event description">${this._escapeHtml(event.description || '')}</textarea>
                        </div>
                        <div class="sc-field">
                            <label>Start Time</label>
                            <input type="text" data-path="limited_event.startTime" value="${this._escapeAttr(event.startTime || '')}" class="sc-input sc-mono" placeholder="ISO 8601 timestamp">
                        </div>
                        <div class="sc-field">
                            <label>End Time</label>
                            <input type="text" data-path="limited_event.endTime" value="${this._escapeAttr(event.endTime || '')}" class="sc-input sc-mono" placeholder="ISO 8601 timestamp">
                        </div>
                        <div class="sc-field">
                            <label>Theme Icon</label>
                            <input type="text" data-path="limited_event.theme.icon" value="${this._escapeAttr(event.theme?.icon || '')}" class="sc-input sc-mono" placeholder="events/icon.png">
                        </div>
                        <div class="sc-field">
                            <label>Accent Color</label>
                            <div class="sc-color-field">
                                <input type="color" data-path="limited_event.theme.accentColor" value="${this._escapeAttr(event.theme?.accentColor || '#60a5fa')}" class="sc-color-picker">
                                <input type="text" data-path="limited_event.theme.accentColor" value="${this._escapeAttr(event.theme?.accentColor || '#60a5fa')}" class="sc-input sc-mono sc-color-text" placeholder="#RRGGBB">
                            </div>
                        </div>
                        <div class="sc-field">
                            <label>Urgency Enabled</label>
                            <label class="sc-toggle">
                                <input type="checkbox" data-path="limited_event.urgency.enabled" ${event.urgency?.enabled ? 'checked' : ''}>
                                <span class="sc-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="sc-field">
                            <label>Urgency Threshold (hours)</label>
                            <input type="number" data-path="limited_event.urgency.thresholdHours" value="${event.urgency?.thresholdHours || 48}" class="sc-input" min="1" max="168">
                        </div>
                        <div class="sc-field sc-full">
                            <label>Urgency Message</label>
                            <input type="text" data-path="limited_event.urgency.message" value="${this._escapeAttr(event.urgency?.message || '')}" class="sc-input" placeholder="EVENT ENDING SOON!">
                        </div>
                        <div class="sc-field sc-full">
                            <label>Event Products (comma-separated IDs)</label>
                            <input type="text" data-path="limited_event.products" value="${this._escapeAttr((event.products || []).join(', '))}" class="sc-input sc-mono" placeholder="product-id-1, product-id-2">
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // --- Banners Section ---
    _renderBannersSection(banners) {
        const cards = banners.map((b, i) => `
            <div class="sc-banner-card" data-index="${i}">
                <div class="sc-banner-card-header">
                    <span class="sc-banner-index">#${i + 1}</span>
                    <span class="sc-banner-title">${this._escapeHtml(b.title || 'Untitled')}</span>
                    <button class="sc-icon-btn sc-remove-banner" data-index="${i}" title="Remove banner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
                <div class="sc-banner-card-body">
                    <div class="sc-form-grid">
                        <div class="sc-field">
                            <label>ID</label>
                            <input type="text" data-banner="${i}" data-key="id" value="${this._escapeAttr(b.id || '')}" class="sc-input sc-mono">
                        </div>
                        <div class="sc-field">
                            <label>Title</label>
                            <input type="text" data-banner="${i}" data-key="title" value="${this._escapeAttr(b.title || '')}" class="sc-input">
                        </div>
                        <div class="sc-field sc-full">
                            <label>Description</label>
                            <input type="text" data-banner="${i}" data-key="description" value="${this._escapeAttr(b.description || '')}" class="sc-input">
                        </div>
                        <div class="sc-field">
                            <label>Image</label>
                            <input type="text" data-banner="${i}" data-key="image" value="${this._escapeAttr(b.image || '')}" class="sc-input sc-mono">
                        </div>
                        <div class="sc-field">
                            <label>Discount %</label>
                            <input type="number" data-banner="${i}" data-key="discountPercent" value="${b.discountPercent || 0}" class="sc-input" min="0" max="100">
                        </div>
                        <div class="sc-field">
                            <label>CTA Text</label>
                            <input type="text" data-banner="${i}" data-key="ctaText" value="${this._escapeAttr(b.ctaText || '')}" class="sc-input">
                        </div>
                        <div class="sc-field">
                            <label>CTA Action</label>
                            <input type="text" data-banner="${i}" data-key="ctaAction" value="${this._escapeAttr(b.ctaAction || '')}" class="sc-input sc-mono">
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <div class="sc-section sc-banners-section">
                <div class="sc-section-header">
                    <div class="sc-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        Banners <span class="sc-count">(${banners.length})</span>
                    </div>
                    <button class="config-editor-btn sc-add-banner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Banner
                    </button>
                </div>
                <div class="sc-section-body sc-banner-list">
                    ${cards || '<div class="sc-empty">No banners configured</div>'}
                </div>
            </div>
        `;
    },

    // --- Products Section ---
    _renderProductsSection(products) {
        const cards = products.map((p, i) => {
            const badgeClass = p.badge ? `sc-product-badge-${(p.badge || '').toLowerCase()}` : '';
            return `
                <div class="sc-product-card" data-index="${i}" style="border-color: ${this._escapeAttr(p.productColor || '#333')}30">
                    <div class="sc-product-card-header" style="background: ${this._escapeAttr(p.productColor || '#333')}15">
                        <div class="sc-product-info">
                            <span class="sc-product-name">${this._escapeHtml(p.name || 'Untitled')}</span>
                            <span class="sc-product-id">${this._escapeHtml(p.id || '')}</span>
                        </div>
                        <div class="sc-product-meta">
                            <span class="sc-product-price">${p.price || 0} EC</span>
                            ${p.badge ? `<span class="sc-product-badge ${badgeClass}">${this._escapeHtml(p.badge)}</span>` : ''}
                            ${p.featured ? '<span class="sc-product-featured" title="Featured">&#9733;</span>' : ''}
                        </div>
                    </div>
                    <div class="sc-product-card-body hidden" data-product-body="${i}">
                        <div class="sc-form-grid">
                            <div class="sc-field">
                                <label>ID</label>
                                <input type="text" data-product="${i}" data-key="id" value="${this._escapeAttr(p.id || '')}" class="sc-input sc-mono">
                            </div>
                            <div class="sc-field">
                                <label>Name</label>
                                <input type="text" data-product="${i}" data-key="name" value="${this._escapeAttr(p.name || '')}" class="sc-input">
                            </div>
                            <div class="sc-field sc-full">
                                <label>Description</label>
                                <textarea data-product="${i}" data-key="description" class="sc-textarea" rows="2">${this._escapeHtml(p.description || '')}</textarea>
                            </div>
                            <div class="sc-field">
                                <label>Image</label>
                                <input type="text" data-product="${i}" data-key="image" value="${this._escapeAttr(p.image || '')}" class="sc-input sc-mono">
                            </div>
                            <div class="sc-field">
                                <label>Full Image</label>
                                <input type="text" data-product="${i}" data-key="imageFull" value="${this._escapeAttr(p.imageFull || '')}" class="sc-input sc-mono">
                            </div>
                            <div class="sc-field">
                                <label>Price (EC)</label>
                                <input type="number" data-product="${i}" data-key="price" value="${p.price || 0}" class="sc-input" min="0">
                            </div>
                            <div class="sc-field">
                                <label>Category</label>
                                <select data-product="${i}" data-key="category" class="sc-select">
                                    ${['mystery-boxes', 'cosmetics', 'untradeables', 'consumables', 'utilities'].map(c =>
                                        `<option value="${c}" ${p.category === c ? 'selected' : ''}>${c}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="sc-field">
                                <label>Featured</label>
                                <label class="sc-toggle">
                                    <input type="checkbox" data-product="${i}" data-key="featured" ${p.featured ? 'checked' : ''}>
                                    <span class="sc-toggle-slider"></span>
                                </label>
                            </div>
                            <div class="sc-field">
                                <label>Discount %</label>
                                <input type="number" data-product="${i}" data-key="discountPercent" value="${p.discountPercent || 0}" class="sc-input" min="0" max="100">
                            </div>
                            <div class="sc-field">
                                <label>Product Color</label>
                                <div class="sc-color-field">
                                    <input type="color" data-product="${i}" data-key="productColor" value="${this._escapeAttr(p.productColor || '#8B5CF6')}" class="sc-color-picker">
                                    <input type="text" data-product="${i}" data-key="productColor" value="${this._escapeAttr(p.productColor || '#8B5CF6')}" class="sc-input sc-mono sc-color-text">
                                </div>
                            </div>
                            <div class="sc-field">
                                <label>Badge</label>
                                <select data-product="${i}" data-key="badge" class="sc-select">
                                    ${['', 'HOT', 'NEW', 'SALE', 'BEST', 'LIMITED'].map(b =>
                                        `<option value="${b}" ${(p.badge || '') === b ? 'selected' : ''}>${b || '(none)'}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="sc-field">
                                <label>Bonus Amount</label>
                                <input type="number" data-product="${i}" data-key="bonusAmount" value="${p.bonusAmount || 0}" class="sc-input" min="0">
                            </div>
                            <div class="sc-field sc-full">
                                <label>Worlds (comma-separated)</label>
                                <input type="text" data-product="${i}" data-key="worlds" value="${this._escapeAttr((p.worlds || []).join(', '))}" class="sc-input sc-mono" placeholder="all">
                            </div>
                        </div>
                        <div class="sc-product-actions">
                            <button class="sc-icon-btn sc-duplicate-product" data-index="${i}" title="Duplicate product">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                Duplicate
                            </button>
                            <button class="sc-icon-btn sc-remove-product" data-index="${i}" title="Remove product">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="sc-section sc-products-section">
                <div class="sc-section-header">
                    <div class="sc-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                            <path d="M6 2L3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5z"/>
                            <line x1="3" y1="7" x2="21" y2="7"/>
                            <path d="M16 11a4 4 0 0 1-8 0"/>
                        </svg>
                        Products <span class="sc-count">(${products.length})</span>
                    </div>
                    <button class="config-editor-btn sc-add-product">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Product
                    </button>
                </div>
                <div class="sc-section-body sc-product-grid">
                    ${cards || '<div class="sc-empty">No products configured</div>'}
                </div>
            </div>
        `;
    },

    // --- Visual Mode Event Bindings ---
    _bindVisualEvents() {
        const container = document.getElementById('sc-visual-container');
        if (!container) return;

        // Event section fields
        container.querySelectorAll('[data-path]').forEach(input => {
            const handler = () => this._updateParsedFromPath(input);
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        });

        // Color picker sync
        container.querySelectorAll('.sc-color-picker').forEach(picker => {
            picker.addEventListener('input', (e) => {
                const textInput = picker.parentElement.querySelector('.sc-color-text');
                if (textInput) textInput.value = e.target.value;
                this._updateParsedFromPath(picker);
            });
        });
        container.querySelectorAll('.sc-color-text').forEach(textInput => {
            textInput.addEventListener('input', (e) => {
                const picker = textInput.parentElement.querySelector('.sc-color-picker');
                if (picker && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                    picker.value = e.target.value;
                }
                this._updateParsedFromPath(textInput);
            });
        });

        // Banner fields
        container.querySelectorAll('[data-banner]').forEach(input => {
            const handler = () => {
                const idx = parseInt(input.dataset.banner);
                const key = input.dataset.key;
                if (this._parsedConfig && this._parsedConfig.banners && this._parsedConfig.banners[idx]) {
                    let value = input.type === 'number' ? parseFloat(input.value) || 0 : input.value;
                    this._parsedConfig.banners[idx][key] = value;
                    this._markVisualDirty();
                }
            };
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        });

        // Product card expand/collapse
        container.querySelectorAll('.sc-product-card-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
                const card = header.closest('.sc-product-card');
                const body = card.querySelector('.sc-product-card-body');
                if (body) body.classList.toggle('hidden');
            });
        });

        // Product fields
        container.querySelectorAll('[data-product]').forEach(input => {
            const handler = () => {
                const idx = parseInt(input.dataset.product);
                const key = input.dataset.key;
                if (this._parsedConfig && this._parsedConfig.products && this._parsedConfig.products[idx]) {
                    let value;
                    if (input.type === 'checkbox') {
                        value = input.checked;
                    } else if (input.type === 'number') {
                        value = parseFloat(input.value) || 0;
                    } else if (key === 'worlds') {
                        value = input.value.split(',').map(s => s.trim()).filter(Boolean);
                    } else {
                        value = input.value;
                    }
                    this._parsedConfig.products[idx][key] = value;
                    this._markVisualDirty();
                }
            };
            input.addEventListener('input', handler);
            input.addEventListener('change', handler);
        });

        // Add/remove/duplicate buttons
        container.querySelector('.sc-add-banner')?.addEventListener('click', () => this._addBanner());
        container.querySelector('.sc-add-product')?.addEventListener('click', () => this._addProduct());

        container.querySelectorAll('.sc-remove-banner').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                if (confirm('Remove this banner?')) {
                    this._parsedConfig.banners.splice(idx, 1);
                    this._markVisualDirty();
                    this._renderVisualMode(this._parsedConfig);
                }
            });
        });

        container.querySelectorAll('.sc-remove-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                if (confirm('Remove this product?')) {
                    this._parsedConfig.products.splice(idx, 1);
                    this._markVisualDirty();
                    this._renderVisualMode(this._parsedConfig);
                }
            });
        });

        container.querySelectorAll('.sc-duplicate-product').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                const original = this._parsedConfig.products[idx];
                if (original) {
                    const copy = JSON.parse(JSON.stringify(original));
                    copy.id = copy.id + '-copy';
                    copy.name = copy.name + ' (Copy)';
                    this._parsedConfig.products.splice(idx + 1, 0, copy);
                    this._markVisualDirty();
                    this._renderVisualMode(this._parsedConfig);
                }
            });
        });
    },

    _updateParsedFromPath(input) {
        if (!this._parsedConfig) return;

        const path = input.dataset.path;
        if (!path) return;

        let value;
        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'number') {
            value = parseFloat(input.value) || 0;
        } else if (path === 'limited_event.products') {
            value = input.value.split(',').map(s => s.trim()).filter(Boolean);
        } else {
            value = input.value;
        }

        // Set nested value
        const parts = path.split('.');
        let obj = this._parsedConfig;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
        this._markVisualDirty();
    },

    _markVisualDirty() {
        // The visual editor modifies _parsedConfig in-place.
        // When switching back to code mode, it will serialize and set dirty state.
        this._isDirty = true;
    },

    _addBanner() {
        if (!this._parsedConfig) return;
        if (!this._parsedConfig.banners) this._parsedConfig.banners = [];
        this._parsedConfig.banners.push({
            id: 'new-banner',
            title: 'New Banner',
            description: 'Banner description',
            image: 'banners/new.png',
            discountPercent: 0,
            ctaText: 'BROWSE',
            ctaAction: 'category:mystery-boxes'
        });
        this._markVisualDirty();
        this._renderVisualMode(this._parsedConfig);
    },

    _addProduct() {
        if (!this._parsedConfig) return;
        if (!this._parsedConfig.products) this._parsedConfig.products = [];
        this._parsedConfig.products.push({
            id: 'new-product',
            name: 'New Product',
            description: 'Product description',
            image: 'items/new.png',
            price: 1000,
            category: 'mystery-boxes',
            featured: false,
            discountPercent: 0,
            productColor: '#8B5CF6',
            badge: '',
            bonusAmount: 0,
            worlds: ['all']
        });
        this._markVisualDirty();
        this._renderVisualMode(this._parsedConfig);
    },

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _escapeAttr(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoreConfig;
}
