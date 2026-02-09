/* ============================================================
   ELDEROS STAFF PANEL - SHARED CONFIG EDITOR
   Factory module that creates CodeMirror-based YAML editors
   with validation, draft system, lock management, and publish gating.
   ============================================================ */
console.log('[ConfigEditor] Loading config-editor.js...');

const ConfigEditor = {

    /**
     * Create a new config editor instance.
     * @param {HTMLElement} container - DOM element to render into
     * @param {object} options
     * @param {string} options.configId - 'store-config' | 'hub-config' | 'worlds-config'
     * @param {function} options.loadFn - async () => { yaml, fileHash }
     * @param {function} options.saveFn - async (yaml, basedOnHash) => result
     * @param {string} [options.schemaId] - schema key in ConfigSchemas (defaults to configId)
     * @param {boolean} [options.readOnly] - start in read-only mode
     * @param {function} [options.onDirtyChange] - callback(isDirty)
     * @param {string} [options.warningText] - warning text shown in header
     * @returns {object} editor instance
     */
    create(container, options) {
        const editor = new ConfigEditorInstance(container, options);
        editor.init();
        return editor;
    }
};

class ConfigEditorInstance {
    constructor(container, options) {
        this.container = container;
        this.configId = options.configId;
        this.loadFn = options.loadFn;
        this.saveFn = options.saveFn;
        this.schemaId = options.schemaId || options.configId;
        this.readOnly = options.readOnly || false;
        this.onDirtyChange = options.onDirtyChange || null;
        this.warningText = options.warningText || null;

        this.cm = null;
        this.originalYaml = '';
        this.fileHash = '';
        this.isDirty = false;
        this.validationErrors = [];
        this.validationTimer = null;
        this.draftTimer = null;
        this.heartbeatInterval = null;
        this.hasLock = false;
        this.lockHolder = null;
        this.destroyed = false;
    }

    init() {
        this._render();
        this._bindEvents();
    }

    _render() {
        this.container.innerHTML = `
            <div class="config-editor-page">
                <div class="config-editor-lock-banner hidden" id="ce-lock-banner-${this.configId}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span class="ce-lock-text"></span>
                    <button class="ce-force-unlock-btn hidden" title="Force unlock (Ashpire only)">Force Unlock</button>
                </div>
                <div class="config-editor-draft-banner hidden" id="ce-draft-banner-${this.configId}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="ce-draft-text"></span>
                    <div class="ce-draft-actions">
                        <button class="ce-draft-resume-btn">Resume Draft</button>
                        <button class="ce-draft-discard-btn">Discard</button>
                    </div>
                </div>
                <div class="config-editor-header">
                    <div class="config-editor-header-left">
                        ${this.warningText ? `
                        <div class="config-editor-warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            ${this._escapeHtml(this.warningText)}
                        </div>` : ''}
                        <div class="config-editor-status" id="ce-status-${this.configId}">
                            <span class="config-editor-status-dot"></span>
                            <span class="ce-status-text">Loading...</span>
                        </div>
                    </div>
                    <div class="config-editor-actions">
                        <button class="config-editor-btn" id="ce-reload-${this.configId}" title="Reload from server">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"/>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                            Reload
                        </button>
                        <button class="config-editor-btn primary" id="ce-publish-${this.configId}" disabled title="Publish changes">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                <polyline points="17 21 17 13 7 13 7 21"/>
                                <polyline points="7 3 7 8 15 8"/>
                            </svg>
                            Publish
                        </button>
                    </div>
                </div>
                <div class="config-editor-body" id="ce-body-${this.configId}">
                    <div class="config-editor-loading">
                        <div class="spinner"></div>
                        Loading configuration...
                    </div>
                </div>
                <div class="config-editor-validation" id="ce-validation-${this.configId}">
                    <div class="ce-validation-summary" id="ce-validation-summary-${this.configId}">
                        <span class="ce-validation-ok hidden">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Valid
                        </span>
                        <span class="ce-error-count hidden">0 errors</span>
                        <span class="ce-warning-count hidden">0 warnings</span>
                        <button class="ce-validation-toggle" title="Toggle validation details">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                    </div>
                    <div class="ce-validation-details hidden" id="ce-validation-details-${this.configId}"></div>
                </div>
            </div>
        `;
    }

    _bindEvents() {
        const reloadBtn = document.getElementById(`ce-reload-${this.configId}`);
        const publishBtn = document.getElementById(`ce-publish-${this.configId}`);
        const validationToggle = this.container.querySelector('.ce-validation-toggle');

        if (reloadBtn) reloadBtn.addEventListener('click', () => this._reload());
        if (publishBtn) publishBtn.addEventListener('click', () => this._publish());
        if (validationToggle) {
            validationToggle.addEventListener('click', () => {
                const details = document.getElementById(`ce-validation-details-${this.configId}`);
                if (details) details.classList.toggle('hidden');
                validationToggle.classList.toggle('expanded');
            });
        }

        // Draft banner events
        const draftBanner = document.getElementById(`ce-draft-banner-${this.configId}`);
        if (draftBanner) {
            draftBanner.querySelector('.ce-draft-resume-btn')?.addEventListener('click', () => this._resumeDraft());
            draftBanner.querySelector('.ce-draft-discard-btn')?.addEventListener('click', () => this._discardDraft());
        }

        // Lock banner force-unlock
        const lockBanner = document.getElementById(`ce-lock-banner-${this.configId}`);
        if (lockBanner) {
            lockBanner.querySelector('.ce-force-unlock-btn')?.addEventListener('click', () => this._forceUnlock());
        }

        // Keyboard shortcut
        this._keyHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.isDirty && !this.readOnly) this._publish();
            }
        };
        document.addEventListener('keydown', this._keyHandler);

        // Cleanup on page unload
        this._beforeUnload = () => {
            if (this.hasLock) {
                this._releaseLock();
            }
        };
        window.addEventListener('beforeunload', this._beforeUnload);
    }

    // === Public API ===

    async load() {
        try {
            // Try to acquire lock first
            await this._acquireLock();

            // Check for existing draft
            const hasDraft = this._checkDraft();

            // Load config from server
            const data = await this.loadFn();
            this.originalYaml = data.yaml || '';
            this.fileHash = data.fileHash || '';

            if (hasDraft && !this.readOnly) {
                // Show draft banner, don't populate editor yet
                return;
            }

            this._initCodeMirror(this.originalYaml);
            this.isDirty = false;
            this._updateStatus();
            this._runValidation();
        } catch (error) {
            console.error(`[ConfigEditor:${this.configId}] Load failed:`, error);
            const body = document.getElementById(`ce-body-${this.configId}`);
            if (body) {
                body.innerHTML = `<div class="config-editor-loading" style="color: #f87171;">
                    Failed to load: ${this._escapeHtml(error.message)}
                </div>`;
            }
        }
    }

    getValue() {
        return this.cm ? this.cm.getValue() : '';
    }

    destroy() {
        this.destroyed = true;
        if (this.validationTimer) clearTimeout(this.validationTimer);
        if (this.draftTimer) clearTimeout(this.draftTimer);
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
        if (this._beforeUnload) window.removeEventListener('beforeunload', this._beforeUnload);
        if (this.hasLock) this._releaseLock();
        if (this.cm) this.cm.toTextArea();
        this._unregisterSessionDraft();
    }

    // === CodeMirror ===

    _initCodeMirror(content) {
        const body = document.getElementById(`ce-body-${this.configId}`);
        if (!body) return;

        body.innerHTML = '<textarea id="ce-textarea-' + this.configId + '"></textarea>';
        const textarea = document.getElementById(`ce-textarea-${this.configId}`);

        this.cm = CodeMirror.fromTextArea(textarea, {
            mode: 'yaml',
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: false,
            styleActiveLine: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            readOnly: this.readOnly,
            gutters: ['CodeMirror-lint-markers', 'CodeMirror-linenumbers'],
            extraKeys: {
                'Tab': (cm) => {
                    cm.replaceSelection('  ', 'end');
                },
                'Shift-Tab': (cm) => {
                    // Dedent
                    const ranges = cm.listSelections();
                    for (const range of ranges) {
                        const from = range.from();
                        const to = range.to();
                        for (let line = from.line; line <= to.line; line++) {
                            const lineContent = cm.getLine(line);
                            if (lineContent.startsWith('  ')) {
                                cm.replaceRange('', {line, ch: 0}, {line, ch: 2});
                            }
                        }
                    }
                }
            }
        });

        this.cm.setValue(content);
        this.cm.clearHistory();

        // On change
        this.cm.on('change', () => {
            if (this.destroyed) return;
            const current = this.cm.getValue();
            const wasDirty = this.isDirty;
            this.isDirty = current !== this.originalYaml;
            if (wasDirty !== this.isDirty) {
                this._updateStatus();
                if (this.onDirtyChange) this.onDirtyChange(this.isDirty);
                if (this.isDirty) {
                    this._registerSessionDraft();
                } else {
                    this._unregisterSessionDraft();
                }
            }

            // Debounced validation
            if (this.validationTimer) clearTimeout(this.validationTimer);
            this.validationTimer = setTimeout(() => this._runValidation(), 300);

            // Debounced draft save
            if (this.isDirty) {
                if (this.draftTimer) clearTimeout(this.draftTimer);
                this.draftTimer = setTimeout(() => this._saveDraft(), 2000);
            }
        });

        // Refresh on next frame to fix rendering
        requestAnimationFrame(() => {
            if (this.cm) this.cm.refresh();
        });
    }

    // === Validation ===

    _runValidation() {
        if (this.destroyed || !this.cm) return;

        const yaml = this.cm.getValue();
        const { errors, parsed } = ConfigSchemas.validate(yaml, this.schemaId);
        this.validationErrors = errors;

        // Clear old gutter markers
        this.cm.clearGutter('CodeMirror-lint-markers');

        // Add gutter markers for errors with line numbers
        for (const err of errors) {
            if (err.line) {
                const marker = document.createElement('div');
                marker.className = err.severity === 'error' ? 'ce-gutter-error' : 'ce-gutter-warning';
                marker.title = err.message;
                marker.innerHTML = err.severity === 'error' ? '\u25CF' : '\u25B2';
                this.cm.setGutterMarker(err.line - 1, 'CodeMirror-lint-markers', marker);
            }
        }

        this._updateValidationPanel();
        this._updatePublishButton();
    }

    _updateValidationPanel() {
        const summary = document.getElementById(`ce-validation-summary-${this.configId}`);
        const details = document.getElementById(`ce-validation-details-${this.configId}`);
        if (!summary || !details) return;

        const errorCount = this.validationErrors.filter(e => e.severity === 'error').length;
        const warningCount = this.validationErrors.filter(e => e.severity === 'warning').length;

        const okEl = summary.querySelector('.ce-validation-ok');
        const errorEl = summary.querySelector('.ce-error-count');
        const warningEl = summary.querySelector('.ce-warning-count');

        if (okEl) {
            okEl.classList.toggle('hidden', errorCount > 0 || warningCount > 0);
        }
        if (errorEl) {
            errorEl.textContent = `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
            errorEl.classList.toggle('hidden', errorCount === 0);
        }
        if (warningEl) {
            warningEl.textContent = `${warningCount} warning${warningCount !== 1 ? 's' : ''}`;
            warningEl.classList.toggle('hidden', warningCount === 0);
        }

        // Populate details
        if (this.validationErrors.length === 0) {
            details.innerHTML = '<div class="ce-validation-empty">No issues found</div>';
        } else {
            details.innerHTML = this.validationErrors.map(err => {
                const icon = err.severity === 'error'
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                const lineInfo = err.line ? `Line ${err.line}: ` : (err.path ? `${err.path}: ` : '');
                return `<div class="ce-validation-item ${err.severity}">
                    ${icon}
                    <span>${lineInfo}${this._escapeHtml(err.message)}</span>
                    ${err.line ? `<button class="ce-jump-btn" data-line="${err.line}">Jump</button>` : ''}
                </div>`;
            }).join('');

            // Bind jump buttons
            details.querySelectorAll('.ce-jump-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const line = parseInt(btn.dataset.line) - 1;
                    if (this.cm) {
                        this.cm.setCursor(line, 0);
                        this.cm.focus();
                        this.cm.scrollIntoView({line, ch: 0}, 100);
                    }
                });
            });
        }
    }

    _updatePublishButton() {
        const btn = document.getElementById(`ce-publish-${this.configId}`);
        if (!btn) return;

        // Only YAML syntax errors (no path) are hard-blockers.
        // Schema validation errors (have path) are soft — show warning but allow publish.
        const syntaxErrors = this.validationErrors.filter(e => e.severity === 'error' && !e.path);
        const schemaErrors = this.validationErrors.filter(e => e.severity === 'error' && e.path);
        const warningCount = this.validationErrors.filter(e => e.severity === 'warning').length;
        const issueCount = schemaErrors.length + warningCount;

        if (this.readOnly) {
            btn.disabled = true;
            btn.title = 'Read-only mode';
            btn.classList.remove('warning');
        } else if (syntaxErrors.length > 0) {
            btn.disabled = true;
            btn.title = `Cannot publish: YAML syntax error`;
            btn.classList.remove('warning');
        } else if (!this.isDirty) {
            btn.disabled = true;
            btn.title = 'No changes to publish';
            btn.classList.remove('warning');
        } else if (issueCount > 0) {
            btn.disabled = false;
            btn.title = `${issueCount} issue(s) — review before publishing`;
            btn.classList.add('warning');
        } else {
            btn.disabled = false;
            btn.title = 'Publish changes';
            btn.classList.remove('warning');
        }
    }

    // === Status ===

    _updateStatus() {
        const status = document.getElementById(`ce-status-${this.configId}`);
        if (!status) return;

        const dot = status.querySelector('.config-editor-status-dot');
        const text = status.querySelector('.ce-status-text');

        if (this.readOnly) {
            status.className = 'config-editor-status readonly';
            if (text) text.textContent = 'Read-only';
        } else if (this.isDirty) {
            status.className = 'config-editor-status modified';
            if (text) text.textContent = 'Unsaved changes';
        } else {
            status.className = 'config-editor-status';
            if (text) text.textContent = 'Saved';
        }

        this._updatePublishButton();
    }

    // === Lock Management ===

    async _acquireLock() {
        try {
            const result = await API.config.acquireLock(this.configId);
            if (result.success) {
                this.hasLock = true;
                this.readOnly = false;
                this._startHeartbeat();
                this._hideLockBanner();
            }
        } catch (error) {
            if (error.status === 409 || (error.data && error.data.error === 'lock_held')) {
                const data = error.data || {};
                this.hasLock = false;
                this.readOnly = true;
                this.lockHolder = data.heldBy || 'another user';
                this._showLockBanner(this.lockHolder, data.heldSince);
            } else {
                // Non-lock error — proceed without lock (best effort)
                console.warn(`[ConfigEditor:${this.configId}] Lock acquisition failed:`, error);
                this.hasLock = false;
            }
        }
    }

    async _releaseLock() {
        if (!this.hasLock) return;
        try {
            await API.config.releaseLock(this.configId);
        } catch (e) {
            console.warn(`[ConfigEditor:${this.configId}] Lock release failed:`, e);
        }
        this.hasLock = false;
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    async _forceUnlock() {
        try {
            await API.config.forceReleaseLock(this.configId);
            Toast.success('Lock force-released');
            // Reload the page to re-acquire
            await this._reload();
        } catch (e) {
            Toast.error('Failed to force-unlock: ' + e.message);
        }
    }

    _startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(async () => {
            if (this.destroyed || !this.hasLock) return;
            try {
                await API.config.heartbeat(this.configId);
            } catch (e) {
                console.warn(`[ConfigEditor:${this.configId}] Heartbeat failed:`, e);
            }
        }, 60000); // Every 60 seconds
    }

    _showLockBanner(holder, since) {
        const banner = document.getElementById(`ce-lock-banner-${this.configId}`);
        if (!banner) return;

        const text = banner.querySelector('.ce-lock-text');
        const sinceStr = since ? ` (${this._timeAgo(since)})` : '';
        if (text) text.textContent = `This config is being edited by ${holder}${sinceStr}`;

        // Show force-unlock for Ashpire
        const forceBtn = banner.querySelector('.ce-force-unlock-btn');
        if (forceBtn && typeof Auth !== 'undefined' && Auth.isAshpire()) {
            forceBtn.classList.remove('hidden');
        }

        banner.classList.remove('hidden');
    }

    _hideLockBanner() {
        const banner = document.getElementById(`ce-lock-banner-${this.configId}`);
        if (banner) banner.classList.add('hidden');
    }

    // === Draft System ===

    _getDraftKey() {
        const staffId = typeof Auth !== 'undefined' ? (Auth.getUser()?.accountId || 0) : 0;
        return `elderos:config-draft:${this.configId}:${staffId}`;
    }

    _saveDraft() {
        if (this.readOnly || !this.cm) return;
        try {
            const staffId = typeof Auth !== 'undefined' ? (Auth.getUser()?.accountId || 0) : 0;
            const staffName = typeof Auth !== 'undefined' ? (Auth.getUser()?.username || '') : '';
            localStorage.setItem(this._getDraftKey(), JSON.stringify({
                configId: this.configId,
                staffId,
                staffName,
                lastEditedAt: Date.now(),
                yaml: this.cm.getValue(),
                basedOnHash: this.fileHash
            }));
        } catch (e) {
            console.warn(`[ConfigEditor:${this.configId}] Draft save failed:`, e);
        }
    }

    _clearDraft() {
        try {
            localStorage.removeItem(this._getDraftKey());
        } catch (e) {
            // ignore
        }
    }

    /**
     * Check for an existing draft. If found, show the draft banner.
     * @returns {boolean} true if a draft exists
     */
    _checkDraft() {
        try {
            const raw = localStorage.getItem(this._getDraftKey());
            if (!raw) return false;

            const draft = JSON.parse(raw);
            const age = Date.now() - draft.lastEditedAt;
            // Expire drafts older than 24 hours
            if (age > 86400000) {
                this._clearDraft();
                return false;
            }

            this._draftData = draft;
            this._showDraftBanner(draft);
            return true;
        } catch (e) {
            return false;
        }
    }

    _showDraftBanner(draft) {
        const banner = document.getElementById(`ce-draft-banner-${this.configId}`);
        if (!banner) return;

        const text = banner.querySelector('.ce-draft-text');
        if (text) text.textContent = `You have an unsaved draft from ${this._timeAgo(draft.lastEditedAt)}`;
        banner.classList.remove('hidden');
    }

    _hideDraftBanner() {
        const banner = document.getElementById(`ce-draft-banner-${this.configId}`);
        if (banner) banner.classList.add('hidden');
    }

    _resumeDraft() {
        this._hideDraftBanner();
        if (this._draftData) {
            this._initCodeMirror(this._draftData.yaml);
            this.isDirty = true;
            this._updateStatus();
            this._runValidation();
            Toast.success('Draft resumed');
        }
        this._draftData = null;
    }

    _discardDraft() {
        this._hideDraftBanner();
        this._clearDraft();
        this._draftData = null;
        this._initCodeMirror(this.originalYaml);
        this.isDirty = false;
        this._updateStatus();
        this._runValidation();
        Toast.success('Draft discarded');
    }

    _registerSessionDraft() {
        if (typeof SessionManager !== 'undefined' && SessionManager.registerDraft) {
            SessionManager.registerDraft(this.configId, this.configId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        }
    }

    _unregisterSessionDraft() {
        if (typeof SessionManager !== 'undefined' && SessionManager.clearDraft) {
            SessionManager.clearDraft(this.configId);
        }
    }

    // === Reload ===

    async _reload() {
        if (this.isDirty) {
            if (!confirm('You have unsaved changes. Reload and discard them?')) return;
        }
        this._clearDraft();
        this._unregisterSessionDraft();
        this._hideDraftBanner();

        // Re-acquire lock
        await this._acquireLock();

        try {
            const data = await this.loadFn();
            this.originalYaml = data.yaml || '';
            this.fileHash = data.fileHash || '';

            if (this.cm) {
                this.cm.setValue(this.originalYaml);
                this.cm.clearHistory();
            } else {
                this._initCodeMirror(this.originalYaml);
            }

            this.isDirty = false;
            this._updateStatus();
            this._runValidation();
            Toast.success('Configuration reloaded');
        } catch (error) {
            Toast.error('Failed to reload: ' + error.message);
        }
    }

    // === Publish ===

    async _publish() {
        if (this.readOnly || !this.cm) return;

        const newYaml = this.cm.getValue();
        if (newYaml === this.originalYaml) return;

        // Check for schema errors and warnings (soft issues — not YAML syntax errors)
        const schemaErrors = this.validationErrors.filter(e => e.severity === 'error' && e.path);
        const warningCount = this.validationErrors.filter(e => e.severity === 'warning').length;
        const issueCount = schemaErrors.length + warningCount;
        if (issueCount > 0) {
            if (!confirm(`There are ${issueCount} validation issue(s). Publish anyway?`)) return;
        }

        // Show diff before confirming
        this._showDiff(this.originalYaml, newYaml, async () => {
            const btn = document.getElementById(`ce-publish-${this.configId}`);
            try {
                if (btn) { btn.disabled = true; btn.textContent = 'Publishing...'; }

                const result = await this.saveFn(newYaml, this.fileHash);

                this.originalYaml = newYaml;
                this.fileHash = result.fileHash || this.fileHash;
                this.isDirty = false;
                this._clearDraft();
                this._unregisterSessionDraft();
                this._updateStatus();
                this._restorePublishButton(btn);
                Toast.success(result.message || 'Configuration published');
            } catch (error) {
                this._restorePublishButton(btn);
                if (error.data && error.data.error === 'version_conflict') {
                    Toast.error('Config was modified by another user. Please reload.');
                } else {
                    Toast.error('Failed to publish: ' + (error.message || 'Unknown error'));
                }
            }
        });
    }

    _restorePublishButton(btn) {
        if (!btn) return;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
            </svg>
            Publish
        `;
        this._updatePublishButton();
    }

    // === Diff View ===

    _showDiff(oldText, newText, onConfirm) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');
        const diff = this._computeDiff(oldLines, newLines);

        let addedCount = 0, removedCount = 0;
        let diffHtml = '';
        for (const entry of diff) {
            const escaped = this._escapeHtml(entry.line);
            if (entry.type === 'removed') {
                diffHtml += `<div class="diff-line removed">- ${escaped}</div>`;
                removedCount++;
            } else if (entry.type === 'added') {
                diffHtml += `<div class="diff-line added">+ ${escaped}</div>`;
                addedCount++;
            } else {
                diffHtml += `<div class="diff-line context">  ${escaped}</div>`;
            }
        }

        if (addedCount === 0 && removedCount === 0) {
            Toast.success('No changes detected');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'config-editor-diff-overlay';
        overlay.innerHTML = `
            <div class="config-editor-diff-modal">
                <div class="config-editor-diff-header">
                    <div>
                        <h3>Review Changes</h3>
                        <div class="diff-stats">
                            <span class="added-count">+${addedCount} added</span>
                            <span class="removed-count">-${removedCount} removed</span>
                        </div>
                    </div>
                    <div class="config-editor-diff-actions">
                        <button class="config-editor-btn" id="ceDiffCancel">Cancel</button>
                        <button class="config-editor-btn primary" id="ceDiffConfirm">Confirm Publish</button>
                    </div>
                </div>
                <div class="config-editor-diff-body">${diffHtml}</div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#ceDiffCancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#ceDiffConfirm').addEventListener('click', () => {
            overlay.remove();
            onConfirm();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    _computeDiff(oldLines, newLines) {
        const result = [];
        let oi = 0, ni = 0;

        while (oi < oldLines.length || ni < newLines.length) {
            if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
                result.push({ type: 'context', line: oldLines[oi] });
                oi++; ni++;
            } else {
                let foundOld = -1, foundNew = -1;
                const lookAhead = 10;

                for (let k = 1; k <= lookAhead; k++) {
                    if (ni + k < newLines.length && oi < oldLines.length && oldLines[oi] === newLines[ni + k]) {
                        foundNew = ni + k;
                        break;
                    }
                }
                for (let k = 1; k <= lookAhead; k++) {
                    if (oi + k < oldLines.length && ni < newLines.length && oldLines[oi + k] === newLines[ni]) {
                        foundOld = oi + k;
                        break;
                    }
                }

                if (foundNew >= 0 && (foundOld < 0 || foundNew - ni <= foundOld - oi)) {
                    while (ni < foundNew) {
                        result.push({ type: 'added', line: newLines[ni] });
                        ni++;
                    }
                } else if (foundOld >= 0) {
                    while (oi < foundOld) {
                        result.push({ type: 'removed', line: oldLines[oi] });
                        oi++;
                    }
                } else {
                    if (oi < oldLines.length) {
                        result.push({ type: 'removed', line: oldLines[oi] });
                        oi++;
                    }
                    if (ni < newLines.length) {
                        result.push({ type: 'added', line: newLines[ni] });
                        ni++;
                    }
                }
            }
        }
        return result;
    }

    // === Utility ===

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    _timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigEditor;
}
