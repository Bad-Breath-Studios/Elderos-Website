/* ============================================================
   ELDEROS STAFF PANEL - GAME COMMANDS
   ============================================================ */
console.log('[Commands] Loading commands.js...');

const Commands = {
    _agentCommands: [],
    _gameCommands: [],
    _commandLog: [],
    _recentCommands: [],
    _selectedWorld: 'all',
    _worlds: [],
    _searchFilter: '',
    _expandedCommand: null,

    DANGEROUS: ['DISCONNECT_ALL', 'KILL_ALL', 'GRACEFUL_SHUTDOWN'],
    RECENT_KEY: 'elderos_recent_commands',
    MAX_RECENT: 5,

    QUICK_ACTIONS: [
        { name: 'PING', icon: 'signal', type: 'game' },
        { name: 'BROADCAST', icon: 'megaphone', type: 'game' },
        { name: 'GET_STATUS', icon: 'activity', type: 'game' },
        { name: 'RESTART', icon: 'refresh', type: 'agent' },
        { name: 'UPDATE', icon: 'download', type: 'agent' }
    ],

    init() {
        this._loadRecent();
    },

    onPageLoad() {
        this.load();
    },

    onPageLeave() {
        // nothing to clean up
    },

    async load() {
        const container = document.getElementById('page-worlds-commands');
        if (!container) return;

        try {
            const [cmdData, worldData] = await Promise.all([
                API.worlds.getCommands(),
                API.worlds.getAll()
            ]);

            this._agentCommands = cmdData.agent_commands || [];
            this._gameCommands = cmdData.game_commands || [];
            this._worlds = worldData.worlds || [];

            this.render();
        } catch (error) {
            console.error('[Commands] Failed to load:', error);
            container.innerHTML = `
                <div class="content-panel">
                    <div class="panel-body">
                        <div class="empty-state">
                            <div class="empty-state-title">Failed to load commands</div>
                            <div class="empty-state-text">${this._escapeHtml(error.message)}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    render() {
        const container = document.getElementById('page-worlds-commands');
        if (!container) return;

        container.innerHTML = `
            <div class="commands-layout">
                <div class="commands-sidebar" id="cmdSidebar">
                    <div class="commands-sidebar-section">
                        <div class="commands-sidebar-title">Quick Actions</div>
                        <div class="cmd-quick-actions" id="cmdQuickActions"></div>
                    </div>
                    <div class="commands-sidebar-section">
                        <div class="commands-sidebar-title">Recent</div>
                        <div class="cmd-recent" id="cmdRecent"></div>
                    </div>
                </div>
                <div class="commands-main" id="cmdMain">
                    <div class="cmd-toolbar">
                        <div class="cmd-world-selector">
                            <label for="cmdWorldSelect">Target:</label>
                            <select id="cmdWorldSelect" class="cmd-select">
                                <option value="all">All Worlds</option>
                                ${this._worlds.map(w => `<option value="${w.id}">World ${w.id} (${w.type})</option>`).join('')}
                            </select>
                        </div>
                        <div class="cmd-search-wrapper">
                            <svg class="cmd-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input type="text" id="cmdSearchInput" class="cmd-search" placeholder="Search commands..." autocomplete="off" spellcheck="false">
                        </div>
                    </div>
                    <div class="cmd-browser" id="cmdBrowser"></div>
                </div>
                <div class="commands-log" id="cmdLog">
                    <div class="commands-log-header">
                        <span class="commands-log-title">Command Log</span>
                        <button class="cmd-log-clear" id="cmdLogClear" title="Clear log">Clear</button>
                    </div>
                    <div class="cmd-log-entries" id="cmdLogEntries">
                        <div class="cmd-log-empty">No commands executed yet</div>
                    </div>
                </div>
            </div>
        `;

        this._renderQuickActions();
        this._renderRecentCommands();
        this._renderCommandBrowser();
        this._bindEvents();
    },

    _bindEvents() {
        // World selector
        document.getElementById('cmdWorldSelect')?.addEventListener('change', (e) => {
            this._selectedWorld = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
        });

        // Search
        const searchInput = document.getElementById('cmdSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this._searchFilter = e.target.value.toLowerCase();
                this._renderCommandBrowser();
            }, 200));
        }

        // Clear log
        document.getElementById('cmdLogClear')?.addEventListener('click', () => {
            this._commandLog = [];
            this._renderLog();
        });
    },

    // === Left Panel ===

    _renderQuickActions() {
        const el = document.getElementById('cmdQuickActions');
        if (!el) return;

        el.innerHTML = this.QUICK_ACTIONS.map(qa => {
            const iconSvg = this._getQuickActionIcon(qa.icon);
            return `
                <button class="cmd-quick-btn" data-name="${qa.name}" data-type="${qa.type}" title="${qa.name}">
                    ${iconSvg}
                    <span>${this._formatCommandName(qa.name)}</span>
                </button>
            `;
        }).join('');

        el.querySelectorAll('.cmd-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                const type = btn.dataset.type;
                this._scrollToCommand(name, type);
            });
        });
    },

    _renderRecentCommands() {
        const el = document.getElementById('cmdRecent');
        if (!el) return;

        if (this._recentCommands.length === 0) {
            el.innerHTML = '<div class="cmd-recent-empty">No recent commands</div>';
            return;
        }

        el.innerHTML = this._recentCommands.map(rc => `
            <button class="cmd-recent-item" data-name="${rc.name}" data-type="${rc.type}" title="${rc.name}">
                <span class="cmd-recent-name">${this._formatCommandName(rc.name)}</span>
                <span class="cmd-recent-type">${rc.type}</span>
            </button>
        `).join('');

        el.querySelectorAll('.cmd-recent-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this._scrollToCommand(btn.dataset.name, btn.dataset.type);
            });
        });
    },

    // === Center Panel ===

    _renderCommandBrowser() {
        const el = document.getElementById('cmdBrowser');
        if (!el) return;

        let html = '';

        // Agent commands section
        const filteredAgent = this._agentCommands.filter(name =>
            !this._searchFilter || name.toLowerCase().includes(this._searchFilter)
        );

        if (filteredAgent.length > 0) {
            html += this._renderCategoryAccordion('Agent Commands', filteredAgent.map(name => ({
                name,
                type: 'agent',
                description: this._getAgentDescription(name),
                icon: this._getAgentIcon(name),
                params: []
            })), 'agent');
        }

        // Game commands grouped by category
        const categories = {};
        this._gameCommands.forEach(cmd => {
            const cat = cmd.category || 'Other';
            if (!categories[cat]) categories[cat] = [];
            if (!this._searchFilter ||
                cmd.name.toLowerCase().includes(this._searchFilter) ||
                (cmd.description || '').toLowerCase().includes(this._searchFilter)) {
                categories[cat].push(cmd);
            }
        });

        for (const [category, commands] of Object.entries(categories)) {
            if (commands.length > 0) {
                html += this._renderCategoryAccordion(category, commands.map(cmd => ({
                    name: cmd.name,
                    type: 'game',
                    description: cmd.description || '',
                    icon: cmd.icon || '',
                    params: cmd.params || [],
                    ipcId: cmd.ipcId
                })), 'game');
            }
        }

        if (!html) {
            html = `
                <div class="cmd-no-results">
                    <div class="cmd-no-results-text">No commands match "${this._escapeHtml(this._searchFilter)}"</div>
                </div>
            `;
        }

        el.innerHTML = html;
        this._bindAccordions();
        this._bindCommandItems();
    },

    _renderCategoryAccordion(title, commands, typeHint) {
        const id = `cat-${title.replace(/\s+/g, '-').toLowerCase()}`;
        return `
            <div class="cmd-category" id="${id}">
                <div class="cmd-category-header" data-category="${id}">
                    <div class="cmd-category-left">
                        <svg class="cmd-category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        <span class="cmd-category-name">${this._escapeHtml(title)}</span>
                    </div>
                    <span class="cmd-category-badge">${commands.length}</span>
                </div>
                <div class="cmd-category-body">
                    ${commands.map(cmd => this._renderCommandItem(cmd)).join('')}
                </div>
            </div>
        `;
    },

    _renderCommandItem(cmd) {
        const isDangerous = this.DANGEROUS.includes(cmd.name);
        const hasParams = cmd.params && cmd.params.length > 0;
        const isExpanded = this._expandedCommand === `${cmd.type}:${cmd.name}`;

        return `
            <div class="cmd-item ${isDangerous ? 'dangerous' : ''} ${isExpanded ? 'expanded' : ''}"
                 data-cmd-name="${cmd.name}" data-cmd-type="${cmd.type}" data-ipc-id="${cmd.ipcId || ''}">
                <div class="cmd-item-header">
                    <div class="cmd-item-info">
                        ${cmd.icon ? `<span class="cmd-item-icon">${cmd.icon}</span>` : ''}
                        <span class="cmd-item-name">${this._formatCommandName(cmd.name)}</span>
                        ${isDangerous ? '<span class="cmd-danger-badge">DANGEROUS</span>' : ''}
                    </div>
                    <div class="cmd-item-actions">
                        ${hasParams ?
                            `<button class="cmd-expand-btn" data-cmd="${cmd.type}:${cmd.name}" title="Configure">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>` :
                            `<button class="cmd-execute-btn" data-cmd-name="${cmd.name}" data-cmd-type="${cmd.type}" title="Execute">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                            </button>`
                        }
                    </div>
                </div>
                ${cmd.description ? `<div class="cmd-item-desc">${this._escapeHtml(cmd.description)}</div>` : ''}
                ${hasParams ? this._renderParamForm(cmd) : ''}
            </div>
        `;
    },

    _renderParamForm(cmd) {
        const isExpanded = this._expandedCommand === `${cmd.type}:${cmd.name}`;
        return `
            <div class="cmd-param-form ${isExpanded ? 'visible' : ''}" id="params-${cmd.type}-${cmd.name}">
                ${cmd.params.map((p, i) => `
                    <div class="cmd-param-group">
                        <label class="cmd-param-label">${this._escapeHtml(p.name)} ${p.required ? '<span class="required">*</span>' : ''}</label>
                        ${this._renderParamInput(cmd, p, i)}
                    </div>
                `).join('')}
                <button class="cmd-execute-btn with-params" data-cmd-name="${cmd.name}" data-cmd-type="${cmd.type}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Execute
                </button>
            </div>
        `;
    },

    _renderParamInput(cmd, param, index) {
        const inputId = `param-${cmd.type}-${cmd.name}-${index}`;
        const defaultVal = param.default || '';

        switch ((param.type || 'STRING').toUpperCase()) {
            case 'BOOLEAN':
                return `<input type="checkbox" id="${inputId}" class="cmd-param-input" data-param-type="BOOLEAN" data-param-index="${index}" ${defaultVal === 'true' ? 'checked' : ''}>`;
            case 'INT':
            case 'LONG':
                return `<input type="number" id="${inputId}" class="cmd-param-input" data-param-type="${param.type.toUpperCase()}" data-param-index="${index}" value="${this._escapeHtml(defaultVal)}" placeholder="${this._escapeHtml(param.name)}">`;
            case 'STRING':
            default:
                return `<input type="text" id="${inputId}" class="cmd-param-input" data-param-type="STRING" data-param-index="${index}" value="${this._escapeHtml(defaultVal)}" placeholder="${this._escapeHtml(param.name)}">`;
        }
    },

    _bindAccordions() {
        document.querySelectorAll('.cmd-category-header').forEach(header => {
            header.addEventListener('click', () => {
                const category = header.closest('.cmd-category');
                category.classList.toggle('open');
            });
        });
    },

    _bindCommandItems() {
        // Expand buttons (for commands with params)
        document.querySelectorAll('.cmd-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.dataset.cmd;
                if (this._expandedCommand === key) {
                    this._expandedCommand = null;
                } else {
                    this._expandedCommand = key;
                }
                this._renderCommandBrowser();
            });
        });

        // Execute buttons (no params — inline)
        document.querySelectorAll('.cmd-execute-btn:not(.with-params)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = btn.dataset.cmdName;
                const type = btn.dataset.cmdType;
                this.executeCommand(type, name, []);
            });
        });

        // Execute buttons (with params)
        document.querySelectorAll('.cmd-execute-btn.with-params').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = btn.dataset.cmdName;
                const type = btn.dataset.cmdType;
                const args = this._collectParams(type, name);
                this.executeCommand(type, name, args);
            });
        });
    },

    _collectParams(type, name) {
        const form = document.getElementById(`params-${type}-${name}`);
        if (!form) return [];

        const args = [];
        form.querySelectorAll('.cmd-param-input').forEach(input => {
            const paramType = input.dataset.paramType;
            let value;

            if (paramType === 'BOOLEAN') {
                value = input.checked;
            } else if (paramType === 'INT' || paramType === 'LONG') {
                value = parseInt(input.value) || 0;
            } else {
                value = input.value || '';
            }

            args.push({ type: paramType, value: value });
        });

        return args;
    },

    // === Right Panel ===

    _renderLog() {
        const el = document.getElementById('cmdLogEntries');
        if (!el) return;

        if (this._commandLog.length === 0) {
            el.innerHTML = '<div class="cmd-log-empty">No commands executed yet</div>';
            return;
        }

        el.innerHTML = this._commandLog.map(entry => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const statusClass = entry.status === 'success' ? 'success' : entry.status === 'pending' ? 'pending' : 'failed';

            return `
                <div class="cmd-log-entry">
                    <div class="cmd-log-entry-header">
                        <span class="cmd-log-time">${timeStr}</span>
                        <span class="cmd-log-cmd">${this._formatCommandName(entry.command)}</span>
                        <span class="cmd-log-status ${statusClass}"></span>
                    </div>
                    <div class="cmd-log-entry-detail">
                        <span class="cmd-log-target">${entry.target}</span>
                        ${entry.message ? `<span class="cmd-log-message">${this._escapeHtml(entry.message)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    _addLogEntry(command, target, status, message) {
        this._commandLog.unshift({
            timestamp: Date.now(),
            command,
            target,
            status,
            message
        });
        // Keep last 50 entries
        if (this._commandLog.length > 50) this._commandLog.pop();
        this._renderLog();
    },

    // === Execution ===

    async executeCommand(type, command, args) {
        const isDangerous = this.DANGEROUS.includes(command);

        if (isDangerous) {
            this._showDangerConfirm(command, () => {
                this._doExecute(type, command, args);
            });
            return;
        }

        const confirmed = confirm(`Execute ${this._formatCommandName(command)} on ${this._selectedWorld === 'all' ? 'All Worlds' : 'World ' + this._selectedWorld}?`);
        if (!confirmed) return;

        this._doExecute(type, command, args);
    },

    async _doExecute(type, command, args) {
        const target = this._selectedWorld === 'all' ? 'All Worlds' : `World ${this._selectedWorld}`;
        this._addLogEntry(command, target, 'pending', 'Executing...');

        // Save to recent
        this._saveRecent({ name: command, type });

        try {
            const result = await API.worlds.executeCommand(this._selectedWorld, type, command, args);

            if (this._selectedWorld === 'all' && result.results) {
                // Multi-world results
                result.results.forEach(r => {
                    this._addLogEntry(
                        command,
                        `World ${r.worldId}`,
                        r.ok ? 'success' : 'failed',
                        r.message || ''
                    );
                });
                // Remove the pending entry
                this._commandLog = this._commandLog.filter(e => e.status !== 'pending' || e.command !== command);
                this._renderLog();

                const successCount = result.results.filter(r => r.ok).length;
                Toast.success(`${command}: ${successCount}/${result.results.length} worlds succeeded`);
            } else {
                // Single world result — update the pending entry
                const pendingIdx = this._commandLog.findIndex(e => e.status === 'pending' && e.command === command);
                if (pendingIdx >= 0) {
                    this._commandLog[pendingIdx].status = result.ok ? 'success' : 'failed';
                    this._commandLog[pendingIdx].message = result.message || '';
                    this._renderLog();
                }

                if (result.ok) {
                    Toast.success(`${command}: ${result.message || 'Success'}`);
                } else {
                    Toast.error(`${command}: ${result.message || 'Failed'}`);
                }
            }
        } catch (error) {
            const pendingIdx = this._commandLog.findIndex(e => e.status === 'pending' && e.command === command);
            if (pendingIdx >= 0) {
                this._commandLog[pendingIdx].status = 'failed';
                this._commandLog[pendingIdx].message = error.message;
                this._renderLog();
            }
            Toast.error(`${command} failed: ${error.message}`);
        }
    },

    _showDangerConfirm(commandName, callback) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'danger-overlay';
        overlay.innerHTML = `
            <div class="danger-modal">
                <div class="danger-modal-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <h3>Dangerous Command</h3>
                </div>
                <p>You are about to execute <strong>${this._escapeHtml(commandName)}</strong> on <strong>${this._selectedWorld === 'all' ? 'ALL WORLDS' : 'World ' + this._selectedWorld}</strong>.</p>
                <p>Type the command name to confirm:</p>
                <input type="text" class="danger-confirm-input" id="dangerConfirmInput" placeholder="${commandName}" autocomplete="off" spellcheck="false">
                <div class="danger-modal-actions">
                    <button class="danger-cancel-btn" id="dangerCancelBtn">Cancel</button>
                    <button class="danger-execute-btn" id="dangerExecuteBtn" disabled>Execute</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = document.getElementById('dangerConfirmInput');
        const executeBtn = document.getElementById('dangerExecuteBtn');
        const cancelBtn = document.getElementById('dangerCancelBtn');

        input.focus();

        input.addEventListener('input', () => {
            executeBtn.disabled = input.value !== commandName;
        });

        cancelBtn.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        executeBtn.addEventListener('click', () => {
            overlay.remove();
            callback();
        });
    },

    // === Search ===

    _scrollToCommand(name, type) {
        // Open the category containing this command and scroll to it
        const item = document.querySelector(`.cmd-item[data-cmd-name="${name}"][data-cmd-type="${type}"]`);
        if (item) {
            const category = item.closest('.cmd-category');
            if (category && !category.classList.contains('open')) {
                category.classList.add('open');
            }
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            item.classList.add('highlighted');
            setTimeout(() => item.classList.remove('highlighted'), 2000);
        }
    },

    // === SessionStorage recent commands ===

    _loadRecent() {
        try {
            const stored = sessionStorage.getItem(this.RECENT_KEY);
            this._recentCommands = stored ? JSON.parse(stored) : [];
        } catch {
            this._recentCommands = [];
        }
    },

    _saveRecent(cmd) {
        // Remove duplicates
        this._recentCommands = this._recentCommands.filter(rc => rc.name !== cmd.name || rc.type !== cmd.type);
        // Add to front
        this._recentCommands.unshift(cmd);
        // Trim
        if (this._recentCommands.length > this.MAX_RECENT) {
            this._recentCommands = this._recentCommands.slice(0, this.MAX_RECENT);
        }
        try {
            sessionStorage.setItem(this.RECENT_KEY, JSON.stringify(this._recentCommands));
        } catch { /* ignore */ }
        this._renderRecentCommands();
    },

    // === Helpers ===

    _formatCommandName(name) {
        if (!name) return '';
        return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    },

    _getAgentDescription(name) {
        const descriptions = {
            'START': 'Start the game server process',
            'STOP': 'Stop the game server process',
            'RESTART': 'Restart the game server process',
            'UPDATE': 'Download latest artifacts and update'
        };
        return descriptions[name] || '';
    },

    _getAgentIcon(name) {
        const icons = { 'START': '▶', 'STOP': '⏹', 'RESTART': '🔄', 'UPDATE': '⬆' };
        return icons[name] || '';
    },

    _getQuickActionIcon(icon) {
        const icons = {
            'signal': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
            'megaphone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
            'activity': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
            'refresh': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
            'download': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
        };
        return icons[icon] || '';
    },

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Commands;
}
