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
                        <p>Customize how fields appear in the player view. Changes override automatic conventions. Use "Reset to Convention" to restore defaults.</p>
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

                <!-- Field Table -->
                <div class="fc-field-table-container">
                    <div class="fc-loading" id="fcLoading" style="display: none;">
                        <div class="fc-spinner"></div>
                        <span>Loading fields...</span>
                    </div>
                    <table class="fc-field-table" id="fcFieldTable">
                        <thead>
                            <tr>
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
            { table: 'accounts', label: 'Accounts', icon: '👤', color: 'purple' },
            { table: 'economy_profiles', label: 'Economy', icon: '💰', color: 'green' },
            { table: 'pvp_profiles', label: 'PvP', icon: '⚔️', color: 'red' },
            { table: 'league_profiles', label: 'Leagues', icon: '🏆', color: 'purple' },
            { table: 'custom_profiles', label: 'Customs', icon: '🎮', color: 'cyan' }
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
        try {
            console.log('[FieldConfig] Loading fields for table:', tableName);
            const response = await API.admin.getFieldConfig(tableName);
            console.log('[FieldConfig] Fields response:', response);
            this.fields = response.fields || [];
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
     * Render the field table
     */
    renderFieldTable() {
        const tbody = document.getElementById('fcFieldTableBody');
        if (!tbody) return;

        if (this.fields.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="fc-empty">No fields found for this table</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.fields.map(field => {
            const typeClass = this.getTypeClass(field.inputType);
            const isHidden = !field.visible;

            return `
                <tr class="${isHidden ? 'fc-row-hidden' : ''} ${field.hasOverride ? 'fc-row-override' : ''}">
                    <td>
                        <div class="fc-column-name">
                            <code>${field.column}</code>
                            ${field.hasOverride ? '<span class="fc-override-badge">Override</span>' : ''}
                        </div>
                    </td>
                    <td>${field.label || '—'}</td>
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
                        <span class="fc-permission">${field.permission || '—'}</span>
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
                console.log('[FieldConfig] Edit clicked for column:', column);
                console.log('[FieldConfig] Available fields:', this.fields.map(f => f.column));
                const field = this.fields.find(f => f.column === column);
                console.log('[FieldConfig] Found field:', field);
                if (field) this.openEditModal(field);
            });
        });
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
                    <div class="fc-form-row">
                        <div class="fc-form-group fc-checkbox-group">
                            <label>
                                <input type="checkbox" id="fcFieldVisible" ${field.visible ? 'checked' : ''}>
                                Visible in player view
                            </label>
                        </div>
                        <div class="fc-form-group fc-checkbox-group">
                            <label>
                                <input type="checkbox" id="fcFieldEditable" ${field.editable ? 'checked' : ''}>
                                Editable by staff
                            </label>
                        </div>
                    </div>
                    <div class="fc-form-row">
                        <div class="fc-form-group">
                            <label>Permission Required</label>
                            <select id="fcFieldPermission">
                                <option value="">None (anyone can edit)</option>
                                <option value="MODIFY_PLAYER_DATA" ${field.permission === 'MODIFY_PLAYER_DATA' ? 'selected' : ''}>MODIFY_PLAYER_DATA</option>
                                <option value="MANAGE_PUNISHMENTS" ${field.permission === 'MANAGE_PUNISHMENTS' ? 'selected' : ''}>MANAGE_PUNISHMENTS</option>
                                <option value="MANAGE_STAFF" ${field.permission === 'MANAGE_STAFF' ? 'selected' : ''}>MANAGE_STAFF</option>
                                <option value="VIEW_IP" ${field.permission === 'VIEW_IP' ? 'selected' : ''}>VIEW_IP</option>
                            </select>
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
            Utils.showToast('Field configuration saved', 'success');
            this.closeModal();
            await this.loadFields(this.currentTable);
        } catch (error) {
            console.error('[FieldConfig] Failed to save field:', error);
            Utils.showToast('Failed to save: ' + error.message, 'error');
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
            Utils.showToast('Field reset to convention', 'success');
            this.closeModal();
            await this.loadFields(this.currentTable);
        } catch (error) {
            console.error('[FieldConfig] Failed to reset field:', error);
            Utils.showToast('Failed to reset: ' + error.message, 'error');
        }
    },

    /**
     * Refresh the field discovery cache
     */
    async refreshCache() {
        try {
            await API.admin.refreshCache();
            Utils.showToast('Cache refreshed successfully', 'success');
            await this.loadFields(this.currentTable);
        } catch (error) {
            console.error('[FieldConfig] Failed to refresh cache:', error);
            Utils.showToast('Failed to refresh cache: ' + error.message, 'error');
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FieldConfig;
}
