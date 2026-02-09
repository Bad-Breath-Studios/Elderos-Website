/* ============================================================
   ELDEROS STAFF PANEL - PLAYER VIEW RIGHT COLUMN PANELS
   Quick Actions, Notes, Activity Log
   ============================================================ */
console.log('[PlayerViewPanels] Loading player-view-panels.js...');

const PlayerViewPanels = {

    // Notes state (owned by this module)
    notes: [],
    notesLoaded: false,

    /**
     * Render the Quick Actions panel
     */
    renderQuickActions(player, permissions) {
        if (!player) return '';

        const canBan = Auth.hasPermission(CONFIG.PERMISSIONS.TEMP_BAN);
        const canPermBan = Auth.hasPermission(CONFIG.PERMISSIONS.PERM_BAN);
        const canIpBan = Auth.hasPermission(CONFIG.PERMISSIONS.IP_BAN);
        const canMute = Auth.hasPermission(CONFIG.PERMISSIONS.MUTE_PLAYER);
        const canKick = Auth.hasPermission(CONFIG.PERMISSIONS.KICK_PLAYER);
        const canTimeout = Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_TIMEOUTS);

        const hasAny = canBan || canPermBan || canIpBan || canMute || canKick || canTimeout;

        const setupPopup = `Popup.currentPlayer = PlayerView.player;`;

        const buttons = [];

        if (canKick) {
            buttons.push(`
                <button class="pv-action-btn" onclick="${setupPopup} Popup.performAction('kick')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Kick
                </button>
            `);
        }
        if (canMute) {
            buttons.push(`
                <button class="pv-action-btn" onclick="${setupPopup} Popup.performAction('mute')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    Mute
                </button>
            `);
        }
        if (canTimeout) {
            buttons.push(`
                <button class="pv-action-btn" onclick="${setupPopup} Popup.performAction('timeout')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Timeout
                </button>
            `);
        }
        if (canBan) {
            buttons.push(`
                <button class="pv-action-btn danger" onclick="${setupPopup} Popup.performAction('ban')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    Ban
                </button>
            `);
        }
        if (canIpBan) {
            buttons.push(`
                <button class="pv-action-btn danger" onclick="${setupPopup} Popup.performAction('ipban')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                    IP Ban
                </button>
            `);
        }

        return `
            <div class="pv-panel" id="pvPanelActions">
                <div class="pv-panel-header">
                    <div class="pv-panel-header-left">
                        <div class="pv-panel-icon red">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <span class="pv-panel-title">Quick Actions</span>
                    </div>
                </div>
                <div class="pv-panel-body">
                    ${hasAny
                        ? `<div class="pv-actions-grid">${buttons.join('')}</div>`
                        : `<div class="pv-no-actions">No actions available</div>`
                    }
                </div>
            </div>
        `;
    },

    /**
     * Render the Notes panel
     */
    renderNotes(player) {
        if (!Auth.hasPermission(CONFIG.PERMISSIONS.VIEW_NOTES)) return '';
        if (!player) return '';

        const noteCount = this.notesLoaded ? this.notes.length : 0;

        return `
            <div class="pv-panel" id="pvPanelNotes">
                <div class="pv-panel-header">
                    <div class="pv-panel-header-left">
                        <div class="pv-panel-icon blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        </div>
                        <span class="pv-panel-title">Notes</span>
                    </div>
                    ${noteCount > 0 ? `<span class="pv-panel-badge">${noteCount}</span>` : ''}
                </div>
                <div class="pv-panel-body" id="pvNotesContent">
                    ${this.notesLoaded ? this._renderNotesContent() : `
                        <div class="pv-notes-loading">
                            <div class="spinner"></div>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Render notes content (add form + list)
     */
    _renderNotesContent() {
        const canAdd = Auth.hasPermission(CONFIG.PERMISSIONS.ADD_NOTE);
        const canDeleteOther = Auth.hasPermission(CONFIG.PERMISSIONS.DELETE_NOTE);

        const addForm = canAdd ? `
            <div class="pv-notes-add">
                <textarea id="pvNoteInput" class="pv-notes-textarea" placeholder="Write a note..." maxlength="1000" rows="2"></textarea>
                <div class="pv-notes-add-footer">
                    <span class="pv-notes-charcount"><span id="pvNoteCharCount">0</span>/1000</span>
                    <button class="btn btn-primary btn-sm" id="pvNoteSubmitBtn" onclick="PlayerViewPanels.submitNote()" disabled>Add</button>
                </div>
            </div>
        ` : '';

        const notesHtml = this.notes.length === 0
            ? '<div class="pv-notes-empty">No notes yet</div>'
            : `<div class="pv-notes-list">${this.notes.map(note => {
                const canDelete = note.isOwnNote || canDeleteOther;
                return `
                    <div class="pv-note-item ${note.isPinned ? 'pinned' : ''}" data-note-id="${note.id}">
                        <div class="pv-note-header">
                            <div class="pv-note-header-left">
                                ${note.isPinned ? '<svg class="pv-note-pin-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="12" height="12"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>' : ''}
                                <span class="pv-note-author">${Utils.escapeHtml(note.staffUsername)}</span>
                                <span class="pv-note-time">${Utils.formatRelativeTime(note.createdAt)}</span>
                            </div>
                            <div class="pv-note-actions">
                                ${canAdd ? `
                                <button class="pv-note-action-btn" onclick="PlayerViewPanels.toggleNotePin(${note.id})" title="${note.isPinned ? 'Unpin' : 'Pin'}">
                                    <svg viewBox="0 0 24 24" fill="${note.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                                </button>
                                ` : ''}
                                ${canDelete ? `
                                <button class="pv-note-action-btn danger" onclick="PlayerViewPanels.deleteNote(${note.id})" title="Delete">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="pv-note-text">${Utils.escapeHtml(note.noteText)}</div>
                    </div>
                `;
            }).join('')}</div>`;

        return addForm + notesHtml;
    },

    /**
     * Render the Activity Log panel (placeholder for Round 5)
     */
    renderActivityLog(player) {
        if (!player) return '';

        return `
            <div class="pv-panel" id="pvPanelActivity">
                <div class="pv-panel-header">
                    <div class="pv-panel-header-left">
                        <div class="pv-panel-icon green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        </div>
                        <span class="pv-panel-title">Activity</span>
                    </div>
                </div>
                <div class="pv-panel-body">
                    <div class="pv-activity-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        <div>Activity timeline coming soon</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Setup event listeners after DOM insert
     */
    setupListeners() {
        this._setupNoteInput();
    },

    /**
     * Load notes for the current player
     */
    async loadNotes(playerId) {
        try {
            const response = await API.notes.getForPlayer(playerId);
            if (response.success) {
                this.notes = response.notes || [];
                this.notesLoaded = true;
                // Update notes panel in DOM
                const container = document.getElementById('pvNotesContent');
                if (container) {
                    container.innerHTML = this._renderNotesContent();
                    this._setupNoteInput();
                }
                // Update badge count
                const badge = document.querySelector('#pvPanelNotes .pv-panel-badge');
                if (badge) {
                    badge.textContent = this.notes.length;
                    badge.style.display = this.notes.length > 0 ? '' : 'none';
                } else if (this.notes.length > 0) {
                    const headerLeft = document.querySelector('#pvPanelNotes .pv-panel-header');
                    if (headerLeft && !headerLeft.querySelector('.pv-panel-badge')) {
                        headerLeft.insertAdjacentHTML('beforeend', `<span class="pv-panel-badge">${this.notes.length}</span>`);
                    }
                }
            }
        } catch (error) {
            console.error('[PlayerViewPanels] Failed to load notes:', error);
        }
    },

    /**
     * Setup note input character counter
     */
    _setupNoteInput() {
        const input = document.getElementById('pvNoteInput');
        const charCount = document.getElementById('pvNoteCharCount');
        const submitBtn = document.getElementById('pvNoteSubmitBtn');

        if (input && charCount && submitBtn) {
            input.addEventListener('input', () => {
                const len = input.value.length;
                charCount.textContent = len;
                submitBtn.disabled = len === 0 || len > 1000;
            });
        }
    },

    /**
     * Submit a new note
     */
    async submitNote() {
        const player = PlayerView.player;
        if (!player) return;

        const input = document.getElementById('pvNoteInput');
        const submitBtn = document.getElementById('pvNoteSubmitBtn');
        if (!input) return;

        const noteText = input.value.trim();
        if (!noteText || noteText.length > 1000) return;

        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        try {
            await API.notes.create(player.id, noteText);
            Toast.success('Note added');
            input.value = '';
            document.getElementById('pvNoteCharCount').textContent = '0';
            await this.loadNotes(player.id);
        } catch (error) {
            Toast.error(error.message || 'Failed to add note');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add';
        }
    },

    /**
     * Toggle pin on a note
     */
    async toggleNotePin(noteId) {
        try {
            const result = await API.notes.togglePin(noteId);
            Toast.success(result.isPinned ? 'Note pinned' : 'Note unpinned');
            if (PlayerView.player) {
                await this.loadNotes(PlayerView.player.id);
            }
        } catch (error) {
            Toast.error(error.message || 'Failed to toggle pin');
        }
    },

    /**
     * Delete a note
     */
    async deleteNote(noteId) {
        try {
            await API.notes.delete(noteId);
            Toast.success('Note deleted');
            if (PlayerView.player) {
                await this.loadNotes(PlayerView.player.id);
            }
        } catch (error) {
            Toast.error(error.message || 'Failed to delete note');
        }
    },

    /**
     * Reset state (called when player view closes or opens new player)
     */
    reset() {
        this.notes = [];
        this.notesLoaded = false;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerViewPanels;
}
