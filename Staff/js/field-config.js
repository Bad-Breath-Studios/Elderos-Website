/* ============================================================
   ELDEROS STAFF PANEL - FIELD CONFIGURATION
   Admin UI for managing dynamic field definitions
   ============================================================ */
console.log('[FieldConfig] Loading field-config.js...');

const FieldConfig = {
    // State
    currentTable: 'accounts',
    fields: [],
    schema: {},
    enumTypes: [],
    isLoading: false,
    originalOrder: [], // Track original sort order for detecting changes

    // Drag state
    draggedRow: null,
    draggedIndex: -1,
    orderChanged: false,

    // Permission descriptions
    PERMISSION_DESCRIPTIONS: {
        '': 'Any staff member can edit this field',
        'MODIFY_PLAYER_DATA': 'Requires the general player data modification permission',
        'MANAGE_PUNISHMENTS': 'Restricted to staff who can manage punishments',
        'MANAGE_STAFF': 'Restricted to administrators and above',
        'VIEW_IP': 'Restricted to staff with IP viewing access'
    },

    /**
     * Initialize the field config module
     */
    init() {
        console.log('[FieldConfig] Initializing...');
    },

    /**
     * Called when navigating to the field-config page
     */
    async onPageLoad() {
        console.log('[FieldConfig] Page loaded');

        // Check permission (Developer or Owner only)
        const user = Auth.getUser();
        if (!user || (user.role !== 'DEVELOPER' && user.role !== 'OWNER')) {
            Utils.showToast('Access denied. Developer or Owner access required.', 'error');
            Router.navigate('dashboard');
            return;
        }

        // Render the page structure
        this.render();

        // Load schema data
        await this.loadSchema();

        // Load fields for current table
        await this.loadFields(this.currentTable);
    },

    /**
     * Render the page structure
     */
    render() {
        const container = document.getElementById('page-field-config');
        if (!container) return;

        container.innerHTML = `
            <div class="field-config-page">
                <!-- Info Banner -->
                <div class="fc-info-banner">
                    <div class="fc-info-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                    </div>
                    <div class="fc-info-content">
                        <strong>Field Configuration</strong>
                        <p>Customize how fields appear in the player view. Drag rows to reorder. Changes override automatic conventions. Use "Reset to Convention" to restore defaults.</p>
                    </div>
                    <button class="btn btn-secondary btn-sm" id="fcRefreshCacheBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <polyline points="23 4 23 10 17 10"/>
                            <polyline points="1 20 1 14 7 14"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                        Refresh Cache
                    </button>
                </div>

                <!-- Table Selector -->
                <div class="fc-table-selector">
                    <div class="fc-table-tabs" id="fcTableTabs">
                        <!-- Populated dynamically -->
                    </div>
                </div>

                <!-- Save Order Button (hidden by default) -->
                <div class="fc-save-order-bar" id="fcSaveOrderBar" style="display: none;">
                    <span>Field order has been changed</span>
                    <button class="btn btn-primary btn-sm" id="fcSaveOrderBtn">Save Order</button>
                    <button class="btn btn-secondary btn-sm" id="fcRevertOrderBtn">Revert</button>
                </div>

                <!-- Field Table -->
                <div class="fc-field-table-container">
                    <div class="fc-loading" id="fcLoading" style="display: none;">
                        <div class="fc-spinner"></div>
                        <span>Loading fields...</span>
                    </div>
                    <table class="fc-field-table" id="fcFieldTable">
                        <thead>
                            <tr>
                                <th class="fc-drag-col"></th>
                                <th>Column</th>
                                <th>Label</th>
                                <th>Type</th>
                                <th>Visible</th>
                                <th>Editable</th>
                                <th>Permission</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="fcFieldTableBody">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Edit Modal -->
            <div class="modal-backdrop fc-modal-backdrop" id="fcEditModal">
                <div class="modal fc-edit-modal">
                    <div class="modal-header">
                        <h3 class="modal-title" id="fcModalTitle">Edit Field</h3>
                        <button class="modal-close" id="fcModalClose">&times;</button>
                    </div>
                    <div class="modal-body" id="fcModalBody">
                        <!-- Populated dynamically -->
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="fcModalCancel">Cancel</button>
                        <button class="btn btn-danger" id="fcModalReset" style="margin-right: auto;">Reset to Convention</button>
                        <button class="btn btn-primary" id="fcModalSave">Save Changes</button>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh cache button
        document.getElementById('fcRefreshCacheBtn')?.addEventListener('click', () => this.refreshCache());

        // Modal close
        document.getElementById('fcModalClose')?.addEventListener('click', () => this.closeModal());
        document.getElementById('fcModalCancel')?.addEventListener('click', () => this.closeModal());
        document.getElementById('fcEditModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'fcEditModal') this.closeModal();
        });

        // Modal save
        document.getElementById('fcModalSave')?.addEventListener('click', () => this.saveField());

        // Modal reset
        document.getElementById('fcModalReset')?.addEventListener('click', () => this.resetToConvention());

        // Save/revert order buttons
        document.getElementById('fcSaveOrderBtn')?.addEventListener('click', () => this.saveOrder());
        document.getElementById('fcRevertOrderBtn')?.addEventListener('click', () => this.revertOrder());
    },

    /**
     * Load schema from API
     */
    async loadSchema() {
        try {
            console.log('[FieldConfig] Loading schema...');
            const response = await API.admin.getSchema();
            console.log('[FieldConfig] Schema response:', response);
            this.schema = response.tables || {};
            this.enumTypes = response.enumTypes || [];

            // Render table tabs
            this.renderTableTabs();
        } catch (error) {
            console.error('[FieldConfig] Failed to load schema:', error);
            Toast.error('Failed to load schema: ' + error.message);
        }
    },

    /**
     * Render table selector tabs
     */
    renderTableTabs() {
        const container = document.getElementById('fcTableTabs');
        if (!container) return;

        // Define tabs in specific order with icons and colors
        const tabConfig = [
            { table: 'accounts', label: 'Accounts', icon: '\uD83D\uDC64', color: 'purple' },
            { table: 'economy_profiles', label: 'Economy', icon: '\uD83D\uDCB0', color: 'green' },
            { table: 'pvp_profiles', label: 'PvP', icon: '\u2694\uFE0F', color: 'red' },
            { table: 'league_profiles', label: 'Leagues', icon: '\uD83C\uDFC6', color: 'purple' },
            { table: 'custom_profiles', label: 'Customs', icon: '\uD83C\uDFAE', color: 'cyan' }
        ];

        // Only show tabs for tables that exist in schema
        const availableTabs = tabConfig.filter(t => this.schema[t.table]);

        container.innerHTML = availableTabs.map(tab => `
            <button class="fc-table-tab fc-tab-${tab.color} ${tab.table === this.currentTable ? 'active' : ''}" data-table="${tab.table}">
                <span class="fc-tab-icon">${tab.icon}</span>
                ${tab.label}
            </button>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.fc-table-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentTable = tab.dataset.table;
                container.querySelectorAll('.fc-table-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadFields(this.currentTable);
            });
        });
    },

    /**
     * Load fields for a table
     */
    async loadFields(tableName) {
        this.showLoading(true);
        this.orderChanged = false;
        this._updateSaveOrderBar();
        try {
            console.log('[FieldConfig] Loading fields for table:', tableName);
            const response = await API.admin.getFieldConfig(tableName);
            console.log('[FieldConfig] Fields response:', response);
            this.fields = response.fields || [];
            this.originalOrder = this.fields.map(f => f.column);
            console.log('[FieldConfig] Fields loaded:', this.fields.length);
            this.renderFieldTable();
        } catch (error) {
            console.error('[FieldConfig] Failed to load fields:', error);
            Toast.error('Failed to load fields: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        const loading = document.getElementById('fcLoading');
        const table = document.getElementById('fcFieldTable');
        if (loading) loading.style.display = show ? 'flex' : 'none';
        if (table) table.style.opacity = show ? '0.5' : '1';
        this.isLoading = show;
    },

    /**
     * Render the field table with drag handles
     */
    renderFieldTable() {
        const tbody = document.getElementById('fcFieldTableBody');
        if (!tbody) return;

        if (this.fields.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="fc-empty">No fields found for this table</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.fields.map((field, index) => {
            const typeClass = this.getTypeClass(field.inputType);
            const isHidden = !field.visible;

            return `
                <tr class="${isHidden ? 'fc-row-hidden' : ''} ${field.hasOverride ? 'fc-row-override' : ''}"
                    draggable="true" data-index="${index}" data-column="${field.column}">
                    <td class="fc-drag-handle" title="Drag to reorder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <line x1="8" y1="6" x2="8" y2="6.01"/>
                            <line x1="16" y1="6" x2="16" y2="6.01"/>
                            <line x1="8" y1="12" x2="8" y2="12.01"/>
                            <line x1="16" y1="12" x2="16" y2="12.01"/>
                            <line x1="8" y1="18" x2="8" y2="18.01"/>
                            <line x1="16" y1="18" x2="16" y2="18.01"/>
                        </svg>
                    </td>
                    <td>
                        <div class="fc-column-name">
                            <code>${field.column}</code>
                            ${field.hasOverride ? '<span class="fc-override-badge">Override</span>' : ''}
                        </div>
                    </td>
                    <td>${field.label || '\u2014'}</td>
                    <td>
                        <span class="fc-type-badge ${typeClass}">${field.inputType || 'text'}</span>
                    </td>
                    <td>
                        <span class="fc-toggle ${field.visible ? 'active' : ''}">
                            ${field.visible ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td>
                        <span class="fc-toggle ${field.editable ? 'active' : ''}">
                            ${field.editable ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td>
                        <span class="fc-permission">${field.permission || '\u2014'}</span>
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-sm fc-edit-btn" data-column="${field.column}">
                            Edit
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add edit button handlers
        tbody.querySelectorAll('.fc-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const column = btn.dataset.column;
                const field = this.fields.find(f => f.column === column);
                if (field) this.openEditModal(field);
            });
        });

        // Setup drag-and-drop
        this._setupDragAndDrop(tbody);
    },

    // === Drag-and-Drop ===

    _setupDragAndDrop(tbody) {
        const rows = tbody.querySelectorAll('tr[draggable]');

        rows.forEach(row => {
            row.addEventListener('dragstart', (e) => {
                this.draggedRow = row;
                this.draggedIndex = parseInt(row.dataset.index);
                row.classList.add('fc-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', row.dataset.index);
            });

            row.addEventListener('dragend', () => {
                row.classList.remove('fc-dragging');
                this.draggedRow = null;
                this.draggedIndex = -1;
                // Remove all drop indicators
                tbody.querySelectorAll('.fc-drop-above, .fc-drop-below').forEach(r => {
                    r.classList.remove('fc-drop-above', 'fc-drop-below');
                });
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!this.draggedRow || row === this.draggedRow) return;

                // Remove existing indicators
                tbody.querySelectorAll('.fc-drop-above, .fc-drop-below').forEach(r => {
                    r.classList.remove('fc-drop-above', 'fc-drop-below');
                });

                const rect = row.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    row.classList.add('fc-drop-above');
                } else {
                    row.classList.add('fc-drop-below');
                }
            });

            row.addEventListener('dragleave', () => {
                row.classList.remove('fc-drop-above', 'fc-drop-below');
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('fc-drop-above', 'fc-drop-below');

                if (!this.draggedRow || row === this.draggedRow) return;

                const fromIndex = this.draggedIndex;
                let toIndex = parseInt(row.dataset.index);

                const rect = row.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY >= midY && toIndex < fromIndex) {
                    toIndex++;
                } else if (e.clientY < midY && toIndex > fromIndex) {
                    toIndex--;
                }

                // Reorder the fields array
                const [moved] = this.fields.splice(fromIndex, 1);
                this.fields.splice(toIndex, 0, moved);

                // Check if order changed vs original
                const currentOrder = this.fields.map(f => f.column);
                this.orderChanged = currentOrder.some((col, i) => col !== this.originalOrder[i]);
                this._updateSaveOrderBar();

                // Re-render
                this.renderFieldTable();
            });
        });
    },

    _updateSaveOrderBar() {
        const bar = document.getElementById('fcSaveOrderBar');
        if (bar) bar.style.display = this.orderChanged ? 'flex' : 'none';
    },

    async saveOrder() {
        // Compute new sort orders (position * 10)
        const updates = [];
        this.fields.forEach((field, index) => {
            const newSortOrder = (index + 1) * 10;
            if (field.sortOrder !== newSortOrder) {
                updates.push({ column: field.column, sortOrder: newSortOrder });
            }
        });

        if (updates.length === 0) {
            this.orderChanged = false;
            this._updateSaveOrderBar();
            return;
        }

        try {
            // Save each changed field's sort order
            for (const update of updates) {
                const field = this.fields.find(f => f.column === update.column);
                if (!field) continue;
                await API.admin.updateFieldConfig(this.currentTable, update.column, {
                    ...this._getFieldConfig(field),
                    sortOrder: update.sortOrder
                });
            }
            Toast.success(`Updated order for ${updates.length} fields`);
            this.orderChanged = false;
            this._updateSaveOrderBar();
            // Reload to get fresh data
            await this.loadFields(this.currentTable);
        } catch (error) {
            console.error('[FieldConfig] Failed to save order:', error);
            Toast.error('Failed to save order: ' + error.message);
        }
    },

    _getFieldConfig(field) {
        return {
            label: field.label || null,
            description: field.description || null,
            displayType: field.displayType || null,
            format: field.format || null,
            visible: field.visible,
            editable: field.editable,
            permission: field.permission || null,
            inputType: field.inputType || null,
            enumType: field.enumType || null,
            minValue: field.minValue ?? null,
            maxValue: field.maxValue ?? null,
            maxLength: field.maxLength ?? null,
            sectionKey: field.sectionKey || null,
            groupName: field.groupName || null,
            sortOrder: field.sortOrder ?? null
        };
    },

    revertOrder() {
        // Restore original order
        const orderMap = {};
        this.originalOrder.forEach((col, i) => orderMap[col] = i);
        this.fields.sort((a, b) => (orderMap[a.column] ?? 999) - (orderMap[b.column] ?? 999));
        this.orderChanged = false;
        this._updateSaveOrderBar();
        this.renderFieldTable();
    },

    /**
     * Get CSS class for input type badge
     */
    getTypeClass(inputType) {
        switch (inputType) {
            case 'text': case 'textarea': return 'type-text';
            case 'number': return 'type-number';
            case 'boolean': return 'type-boolean';
            case 'enum': return 'type-enum';
            case 'date': return 'type-date';
            default: return 'type-text';
        }
    },

    /**
     * Open edit modal for a field
     */
    openEditModal(field) {
        console.log('[FieldConfig] Opening edit modal for:', field);
        this.editingField = field;

        // Register draft with SessionManager
        SessionManager.registerDraft('field_config_' + field.column, () => {
            if (!this.editingField) return null;
            return {
                table: this.currentTable,
                column: this.editingField.column,
                label: document.getElementById('fcFieldLabel')?.value
            };
        });

        document.getElementById('fcModalTitle').textContent = `Edit: ${field.column}`;

        const body = document.getElementById('fcModalBody');
        body.innerHTML = `
            <div class="fc-form">
                <!-- Display Section -->
                <div class="fc-form-section">
                    <h4>Display</h4>
                    <div class="fc-form-row">
                        <div class="fc-form-group">
                            <label>Label</label>
                            <input type="text" id="fcFieldLabel" value="${field.label || ''}" placeholder="Field label">
                        </div>
                        <div class="fc-form-group">
                            <label>Description</label>
                            <input type="text" id="fcFieldDescription" value="${field.description || ''}" placeholder="Tooltip description">
                        </div>
                    </div>
                    <div class="fc-form-row">
                        <div class="fc-form-group">
                            <label>Display Type</label>
                            <select id="fcFieldDisplayType">
                                <option value="">Default</option>
                                <option value="mono" ${field.displayType === 'mono' ? 'selected' : ''}>Mono (code)</option>
                                <option value="badge" ${field.displayType === 'badge' ? 'selected' : ''}>Badge</option>
                                <option value="accent" ${field.displayType === 'accent' ? 'selected' : ''}>Accent</option>
                                <option value="gold" ${field.displayType === 'gold' ? 'selected' : ''}>Gold</option>
                                <option value="green" ${field.displayType === 'green' ? 'selected' : ''}>Green</option>
                                <option value="red" ${field.displayType === 'red' ? 'selected' : ''}>Red</option>
                            </select>
                        </div>
                        <div class="fc-form-group">
                            <label>Format</label>
                            <select id="fcFieldFormat">
                                <option value="">Default</option>
                                <option value="number" ${field.format === 'number' ? 'selected' : ''}>Number (1,234)</option>
                                <option value="currency" ${field.format === 'currency' ? 'selected' : ''}>Currency ($1.23)</option>
                                <option value="gp" ${field.format === 'gp' ? 'selected' : ''}>GP (1.2M)</option>
                                <option value="duration" ${field.format === 'duration' ? 'selected' : ''}>Duration (2h 30m)</option>
                                <option value="date" ${field.format === 'date' ? 'selected' : ''}>Date</option>
                                <option value="percentage" ${field.format === 'percentage' ? 'selected' : ''}>Percentage</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Behavior Section -->
                <div class="fc-form-section">
                    <h4>Behavior</h4>
                    <div class="fc-form-row fc-toggle-row-container">
                        <div class="fc-toggle-row">
                            <span class="fc-toggle-label">Visible in player view</span>
                            <label class="fc-toggle-switch">
                                <input type="checkbox" id="fcFieldVisible" ${field.visible ? 'checked' : ''}>
                                <span class="fc-toggle-slider"></span>
                            </label>
                        </div>
                        <div class="fc-toggle-row">
                            <span class="fc-toggle-label">Editable by staff</span>
                            <label class="fc-toggle-switch">
                                <input type="checkbox" id="fcFieldEditable" ${field.editable ? 'checked' : ''}>
                                <span class="fc-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="fc-form-row">
                        <div class="fc-form-group">
                            <label>Permission Required</label>
                            <select id="fcFieldPermission">
                                <option value="">None</option>
                                <option value="MODIFY_PLAYER_DATA" ${field.permission === 'MODIFY_PLAYER_DATA' ? 'selected' : ''}>MODIFY_PLAYER_DATA</option>
                                <option value="MANAGE_PUNISHMENTS" ${field.permission === 'MANAGE_PUNISHMENTS' ? 'selected' : ''}>MANAGE_PUNISHMENTS</option>
                                <option value="MANAGE_STAFF" ${field.permission === 'MANAGE_STAFF' ? 'selected' : ''}>MANAGE_STAFF</option>
                                <option value="VIEW_IP" ${field.permission === 'VIEW_IP' ? 'selected' : ''}>VIEW_IP</option>
                            </select>
                            <span class="fc-permission-desc" id="fcPermissionDesc">${this.PERMISSION_DESCRIPTIONS[field.permission || '']}</span>
                        </div>
                    </div>
                </div>

                <!-- Validation Section -->
                <div class="fc-form-section">
                    <h4>Validation</h4>
                    <div class="fc-form-row">
                        <div class="fc-form-group">
                            <label>Input Type</label>
                            <select id="fcFieldInputType">
                                <option value="text" ${field.inputType === 'text' ? 'selected' : ''}>Text</option>
                                <option value="textarea" ${field.inputType === 'textarea' ? 'selected' : ''}>Textarea</option>
                                <option value="number" ${field.inputType === 'number' ? 'selected' : ''}>Number</option>
                                <option value="boolean" ${field.inputType === 'boolean' ? 'selected' : ''}>Boolean</option>
                                <option value="enum" ${field.inputType === 'enum' ? 'selected' : ''}>Enum (dropdown)</option>
                                <option value="date" ${field.inputType === 'date' ? 'selected' : ''}>Date</option>
                            </select>
                        </div>
                        <div class="fc-form-group">
                            <label>Enum Type</label>
                            <select id="fcFieldEnumType" ${field.inputType !== 'enum' ? 'disabled' : ''}>
                                <option value="">None</option>
                                ${this.enumTypes.map(t => `<option value="${t}" ${field.enumType === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="fc-form-row">
                        <div class="fc-form-group">
                            <label>Min Value</label>
                            <input type="number" id="fcFieldMinValue" value="${field.minValue ?? ''}" placeholder="No minimum">
                        </div>
                        <div class="fc-form-group">
                            <label>Max Value</label>
                            <input type="number" id="fcFieldMaxValue" value="${field.maxValue ?? ''}" placeholder="No maximum">
                        </div>
                        <div class="fc-form-group">
                            <label>Max Length</label>
                            <input type="number" id="fcFieldMaxLength" value="${field.maxLength ?? ''}" placeholder="No limit">
                        </div>
                    </div>
                </div>

                <!-- Organization Section -->
                <div class="fc-form-section">
                    <h4>Organization</h4>
                    <div class="fc-form-row">
                        <div class="fc-form-group">
                            <label>Section Key</label>
                            <input type="text" id="fcFieldSectionKey" value="${field.sectionKey || ''}" placeholder="e.g., account, punishments">
                        </div>
                        <div class="fc-form-group">
                            <label>Group Name</label>
                            <input type="text" id="fcFieldGroupName" value="${field.groupName || ''}" placeholder="e.g., Wealth, Combat Stats">
                        </div>
                        <div class="fc-form-group">
                            <label>Sort Order</label>
                            <input type="number" id="fcFieldSortOrder" value="${field.sortOrder ?? ''}" placeholder="Auto">
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Enable/disable enum type based on input type
        document.getElementById('fcFieldInputType').addEventListener('change', (e) => {
            document.getElementById('fcFieldEnumType').disabled = e.target.value !== 'enum';
        });

        // Update permission description on change
        document.getElementById('fcFieldPermission').addEventListener('change', (e) => {
            const desc = document.getElementById('fcPermissionDesc');
            if (desc) desc.textContent = this.PERMISSION_DESCRIPTIONS[e.target.value] || '';
        });

        document.getElementById('fcEditModal').classList.add('show');
    },

    /**
     * Close the edit modal
     */
    closeModal() {
        document.getElementById('fcEditModal').classList.remove('show');
        if (this.editingField) {
            SessionManager.clearDraft('field_config_' + this.editingField.column);
        }
        this.editingField = null;
    },

    /**
     * Save field configuration
     */
    async saveField() {
        if (!this.editingField) return;

        const config = {
            label: document.getElementById('fcFieldLabel').value || null,
            description: document.getElementById('fcFieldDescription').value || null,
            displayType: document.getElementById('fcFieldDisplayType').value || null,
            format: document.getElementById('fcFieldFormat').value || null,
            visible: document.getElementById('fcFieldVisible').checked,
            editable: document.getElementById('fcFieldEditable').checked,
            permission: document.getElementById('fcFieldPermission').value || null,
            inputType: document.getElementById('fcFieldInputType').value || null,
            enumType: document.getElementById('fcFieldEnumType').value || null,
            minValue: document.getElementById('fcFieldMinValue').value ? parseInt(document.getElementById('fcFieldMinValue').value) : null,
            maxValue: document.getElementById('fcFieldMaxValue').value ? parseInt(document.getElementById('fcFieldMaxValue').value) : null,
            maxLength: document.getElementById('fcFieldMaxLength').value ? parseInt(document.getElementById('fcFieldMaxLength').value) : null,
            sectionKey: document.getElementById('fcFieldSectionKey').value || null,
            groupName: document.getElementById('fcFieldGroupName').value || null,
            sortOrder: document.getElementById('fcFieldSortOrder').value ? parseInt(document.getElementById('fcFieldSortOrder').value) : null
        };

        try {
            await API.admin.updateFieldConfig(this.currentTable, this.editingField.column, config);
            Toast.success('Field configuration saved');
            this.closeModal();
            await this.loadFields(this.currentTable);
        } catch (error) {
            console.error('[FieldConfig] Failed to save field:', error);
            Toast.error('Failed to save: ' + error.message);
        }
    },

    /**
     * Reset field to convention defaults
     */
    async resetToConvention() {
        if (!this.editingField) return;

        if (!confirm(`Reset "${this.editingField.column}" to convention defaults? This will remove all customizations.`)) {
            return;
        }

        try {
            await API.admin.deleteFieldConfig(this.currentTable, this.editingField.column);
            Toast.success('Field reset to convention');
            this.closeModal();
            await this.loadFields(this.currentTable);
        } catch (error) {
            console.error('[FieldConfig] Failed to reset field:', error);
            Toast.error('Failed to reset: ' + error.message);
        }
    },

    /**
     * Refresh the field discovery cache
     */
    async refreshCache() {
        try {
            await API.admin.refreshCache();
            Toast.success('Cache refreshed successfully');
            await this.loadFields(this.currentTable);
        } catch (error) {
            console.error('[FieldConfig] Failed to refresh cache:', error);
            Toast.error('Failed to refresh cache: ' + error.message);
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldConfig;
}
