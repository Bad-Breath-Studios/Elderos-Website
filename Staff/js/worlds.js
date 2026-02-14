/* ============================================================
   ELDEROS STAFF PANEL - WORLDS OVERVIEW
   ============================================================ */
console.log('[Worlds] Loading worlds.js...');

const Worlds = {
    _worlds: [],
    _refreshInterval: null,
    _lastRefreshTime: 0,
    _isLoading: false,
    _expandedWorldId: null,
    _countdownTimerInterval: null,

    init() {
        // Nothing to cache yet — page container populated on load
    },

    onPageLoad() {
        this.load();
        this._startCountdownTimer();
        this.startAutoRefresh(15000);
    },

    onPageLeave() {
        this.stopAutoRefresh();
        this._stopCountdownTimer();
        if (this._expandedWorldId !== null && typeof Telemetry !== 'undefined') {
            Telemetry.destroyWorldDetail(this._expandedWorldId);
        }
    },

    async load() {
        if (this._isLoading) return;
        this._isLoading = true;

        const container = document.getElementById('page-worlds-overview');
        if (!container) return;

        try {
            const data = await API.worlds.getAll();
            this._worlds = data.worlds || [];
            this._lastRefreshTime = Date.now();
            this.render();
            this._adjustRefreshRate();
        } catch (error) {
            console.error('[Worlds] Failed to load:', error);
            container.innerHTML = `
                <div class="content-panel">
                    <div class="panel-body">
                        <div class="empty-state">
                            <div class="empty-state-title">Failed to load worlds</div>
                            <div class="empty-state-text">${this._escapeHtml(error.message)}</div>
                        </div>
                    </div>
                </div>
            `;
        } finally {
            this._isLoading = false;
        }
    },

    render() {
        const container = document.getElementById('page-worlds-overview');
        if (!container) return;

        const canManage = Auth.hasPermission(CONFIG.PERMISSIONS.MANAGE_WORLDS);

        container.innerHTML = `
            <div class="worlds-page-header">
                <div class="worlds-refresh-info">
                    <span class="worlds-refresh-label" id="worldsRefreshLabel">Updated just now</span>
                    <button class="worlds-refresh-btn" id="worldsRefreshBtn" title="Refresh now">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <polyline points="23 4 23 10 17 10"/>
                            <polyline points="1 20 1 14 7 14"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>
            <div class="worlds-grid" id="worldsGrid">
                ${this._worlds.map(w => this._renderWorldCard(w, canManage)).join('')}
            </div>
        `;

        // Bind refresh button
        document.getElementById('worldsRefreshBtn')?.addEventListener('click', () => this.load());

        // Bind action buttons
        if (canManage) {
            container.querySelectorAll('.world-action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const worldId = parseInt(btn.dataset.worldId);
                    const type = btn.dataset.type;
                    const command = btn.dataset.command;
                    this.executeAction(worldId, type, command);
                });
            });
        }

        // Bind world card click for telemetry detail expand
        container.querySelectorAll('.worlds-card').forEach(card => {
            card.classList.add('expandable');
            const worldId = parseInt(card.dataset.worldId);
            if (worldId === this._expandedWorldId) {
                card.classList.add('expanded');
            }
            card.addEventListener('click', (e) => {
                // Don't expand if clicking a button
                if (e.target.closest('.world-action-btn')) return;
                this._toggleDetail(worldId);
            });
        });

        // Re-expand previously expanded world
        if (this._expandedWorldId !== null) {
            this._showDetail(this._expandedWorldId);
        }

        this._updateRefreshLabel();
    },

    _renderWorldCard(world, canManage) {
        const status = (world.status || 'UNREACHABLE').toUpperCase();
        const statusClass = status.toLowerCase();
        const typeBadgeClass = (world.type || 'ECO').toLowerCase();

        const isRunning = status === 'RUNNING';
        const isOffline = status === 'OFFLINE';
        const isUpdating = status === 'UPDATING';
        const isCountdown = status === 'COUNTDOWN';

        // Build status pill text — show timer for COUNTDOWN
        let statusPillText = status;
        if (isCountdown && world.countdownRemaining != null) {
            statusPillText = `COUNTDOWN ${this._formatCountdown(world.countdownRemaining)}`;
        }

        return `
            <div class="worlds-card" data-world-id="${world.id}" data-countdown-remaining="${world.countdownRemaining || 0}">
                <div class="worlds-card-header">
                    <div class="worlds-card-title">
                        <h3>World ${world.id}</h3>
                        <div class="worlds-card-meta">
                            <span class="world-type-badge ${typeBadgeClass}">${world.type}</span>
                            <span class="worlds-card-region">
                                <img src="${this._regionFlag(world.region)}" alt="" class="worlds-flag-icon">
                                ${this._formatRegion(world.region)}
                            </span>
                        </div>
                    </div>
                    <span class="status-pill ${statusClass}" data-world-id="${world.id}">
                        <span class="status-pill-dot"></span>
                        <span class="status-pill-text">${statusPillText}</span>
                    </span>
                </div>
                <div class="worlds-card-stats">
                    <div class="world-stat-item" title="Online Players">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                        </svg>
                        <span class="world-stat-value">${world.players}</span>
                    </div>
                    <div class="world-stat-item" title="Avg Tick Time (target: 0.6ms)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span class="world-stat-value">${world.tickMs}ms</span>
                    </div>
                    <div class="world-stat-item" title="Memory Usage">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        <span class="world-stat-value">${world.memoryPct}%</span>
                    </div>
                    <div class="world-stat-item" title="CPU Load">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                        <span class="world-stat-value">${Math.round(world.cpuLoad * 100)}%</span>
                    </div>
                </div>
                <div class="worlds-card-uptime">
                    Up ${this._formatUptime(world.uptime)}
                </div>
                ${canManage ? this._renderActions(world, isRunning, isOffline, isUpdating, isCountdown) : ''}
            </div>
        `;
    },

    _renderActions(world, isRunning, isOffline, isUpdating, isCountdown) {
        if (isCountdown) {
            return `
                <div class="worlds-card-actions">
                    <button class="world-action-btn cancel-update" data-world-id="${world.id}" data-type="agent" data-command="CANCEL_UPDATE">Cancel Update</button>
                </div>
            `;
        }

        return `
            <div class="worlds-card-actions">
                <button class="world-action-btn start" data-world-id="${world.id}" data-type="agent" data-command="START" ${!isOffline ? 'disabled' : ''}>Start</button>
                <button class="world-action-btn stop" data-world-id="${world.id}" data-type="agent" data-command="STOP" ${!isRunning ? 'disabled' : ''}>Stop</button>
                <button class="world-action-btn restart" data-world-id="${world.id}" data-type="agent" data-command="RESTART" ${!isRunning ? 'disabled' : ''}>Restart</button>
                <button class="world-action-btn update" data-world-id="${world.id}" data-type="agent" data-command="UPDATE" ${isUpdating ? 'disabled' : ''}>Update</button>
                ${Auth.hasRoleLevel(4) ? `<button class="world-action-btn update-agent" data-world-id="${world.id}" data-type="agent" data-command="UPDATE_AGENT">Update Agent</button>` : ''}
            </div>
        `;
    },

    async executeAction(worldId, type, command) {
        const world = this._worlds.find(w => w.id === worldId);
        const worldLabel = world ? `World ${world.id}` : `World ${worldId}`;

        // UPDATE command: show delay modal instead of simple confirm
        if (command === 'UPDATE') {
            this._showUpdateDelayModal(worldId, worldLabel);
            return;
        }

        // CANCEL_UPDATE: no confirm needed
        if (command === 'CANCEL_UPDATE') {
            this._disableWorldButtons(worldId);
            try {
                const result = await API.worlds.executeCommand(worldId, type, command);
                if (result.ok) {
                    Toast.success(`Update cancelled for ${worldLabel}`);
                } else {
                    Toast.error(`Cancel failed for ${worldLabel}: ${result.message || 'Failed'}`);
                }
            } catch (error) {
                Toast.error(`Cancel failed: ${error.message}`);
            }
            setTimeout(() => this.load(), 1500);
            return;
        }

        const confirmed = confirm(`Are you sure you want to ${command} ${worldLabel}?`);
        if (!confirmed) return;

        this._disableWorldButtons(worldId);

        try {
            const result = await API.worlds.executeCommand(worldId, type, command);
            if (result.ok) {
                Toast.success(`${command} on ${worldLabel}: ${result.message || 'Success'}`);
            } else {
                Toast.error(`${command} on ${worldLabel}: ${result.message || 'Failed'}`);
            }
        } catch (error) {
            Toast.error(`${command} failed: ${error.message}`);
        }

        // Refresh to update states
        setTimeout(() => this.load(), 1500);
    },

    _disableWorldButtons(worldId) {
        document.querySelectorAll(`.world-action-btn[data-world-id="${worldId}"]`).forEach(btn => {
            btn.disabled = true;
            btn.classList.add('loading');
        });
    },

    // === Update Delay Modal ===

    _showUpdateDelayModal(worldId, worldLabel) {
        // Remove any existing modal
        document.getElementById('updateDelayModal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'updateDelayModal';
        modal.className = 'update-delay-overlay';
        modal.innerHTML = `
            <div class="update-delay-modal">
                <div class="update-delay-header">
                    <h3>Schedule Server Update</h3>
                    <span class="update-delay-subtitle">${worldLabel}</span>
                </div>
                <div class="update-delay-options">
                    <label class="update-delay-option">
                        <input type="radio" name="updateDelay" value="0" checked>
                        <span class="update-delay-label">Instant</span>
                        <span class="update-delay-desc">Force-stop and update immediately</span>
                    </label>
                    <label class="update-delay-option">
                        <input type="radio" name="updateDelay" value="60">
                        <span class="update-delay-label">1 minute</span>
                        <span class="update-delay-desc">Quick test countdown</span>
                    </label>
                    <label class="update-delay-option">
                        <input type="radio" name="updateDelay" value="300">
                        <span class="update-delay-label">5 minutes</span>
                        <span class="update-delay-desc">Short warning for active players</span>
                    </label>
                    <label class="update-delay-option">
                        <input type="radio" name="updateDelay" value="600">
                        <span class="update-delay-label">10 minutes</span>
                        <span class="update-delay-desc">Standard update window</span>
                    </label>
                    <label class="update-delay-option">
                        <input type="radio" name="updateDelay" value="1800">
                        <span class="update-delay-label">30 minutes</span>
                        <span class="update-delay-desc">Extended warning for busy servers</span>
                    </label>
                    <label class="update-delay-option">
                        <input type="radio" name="updateDelay" value="3600">
                        <span class="update-delay-label">60 minutes</span>
                        <span class="update-delay-desc">Maximum warning time</span>
                    </label>
                    <label class="update-delay-option custom-option">
                        <input type="radio" name="updateDelay" value="custom">
                        <span class="update-delay-label">Custom</span>
                        <input type="number" class="update-delay-custom-input" id="updateDelayCustom" min="1" max="60" placeholder="minutes" disabled>
                    </label>
                </div>
                <div class="update-delay-actions">
                    <button class="update-delay-btn cancel" id="updateDelayCancel">Cancel</button>
                    <button class="update-delay-btn execute" id="updateDelayExecute">Execute Update</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Enable/disable custom input based on radio selection
        modal.querySelectorAll('input[name="updateDelay"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const customInput = document.getElementById('updateDelayCustom');
                customInput.disabled = radio.value !== 'custom';
                if (radio.value === 'custom') customInput.focus();
            });
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Cancel button
        document.getElementById('updateDelayCancel').addEventListener('click', () => modal.remove());

        // Execute button
        document.getElementById('updateDelayExecute').addEventListener('click', async () => {
            const selected = modal.querySelector('input[name="updateDelay"]:checked');
            if (!selected) return;

            let delaySec = 0;
            if (selected.value === 'custom') {
                const customMin = parseInt(document.getElementById('updateDelayCustom').value);
                if (!customMin || customMin < 1 || customMin > 60) {
                    Toast.error('Custom delay must be between 1 and 60 minutes');
                    return;
                }
                delaySec = customMin * 60;
            } else {
                delaySec = parseInt(selected.value);
            }

            modal.remove();
            this._disableWorldButtons(worldId);

            try {
                const args = [{type: 'INT', value: delaySec}];
                const result = await API.worlds.executeCommand(worldId, 'agent', 'UPDATE', args);

                if (result.ok) {
                    if (delaySec > 0) {
                        const minutes = Math.floor(delaySec / 60);
                        Toast.success(`Update countdown started for ${worldLabel}: ${minutes} minute${minutes !== 1 ? 's' : ''}`);
                    } else {
                        Toast.success(`Instant update started for ${worldLabel}`);
                    }
                } else {
                    Toast.error(`Update failed for ${worldLabel}: ${result.message || 'Failed'}`);
                }
            } catch (error) {
                Toast.error(`Update failed: ${error.message}`);
            }

            setTimeout(() => this.load(), 1500);
        });
    },

    // === Countdown Timer (client-side tick between API polls) ===

    _startCountdownTimer() {
        this._stopCountdownTimer();
        this._countdownTimerInterval = setInterval(() => this._tickCountdowns(), 1000);
    },

    _stopCountdownTimer() {
        if (this._countdownTimerInterval) {
            clearInterval(this._countdownTimerInterval);
            this._countdownTimerInterval = null;
        }
    },

    _tickCountdowns() {
        document.querySelectorAll('.status-pill.countdown').forEach(pill => {
            const worldId = pill.dataset.worldId;
            const card = document.querySelector(`.worlds-card[data-world-id="${worldId}"]`);
            if (!card) return;

            let remaining = parseInt(card.dataset.countdownRemaining) || 0;
            if (remaining > 0) {
                remaining--;
                card.dataset.countdownRemaining = remaining;
                const textEl = pill.querySelector('.status-pill-text');
                if (textEl) {
                    textEl.textContent = `COUNTDOWN ${this._formatCountdown(remaining)}`;
                }
            }
        });
    },

    _formatCountdown(seconds) {
        if (!seconds || seconds <= 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    // === Adaptive Refresh Rate ===

    _adjustRefreshRate() {
        const hasCountdown = this._worlds.some(w => (w.status || '').toUpperCase() === 'COUNTDOWN');
        const currentRate = hasCountdown ? 5000 : 15000;

        // Only restart if rate changed
        if (this._currentRefreshRate !== currentRate) {
            this._currentRefreshRate = currentRate;
            this.startAutoRefresh(currentRate);
        }
    },

    startAutoRefresh(ms) {
        this.stopAutoRefresh();
        this._refreshInterval = setInterval(() => {
            this.load();
            this._updateRefreshLabel();
        }, ms);

        // Also update the label every second
        this._labelInterval = setInterval(() => this._updateRefreshLabel(), 1000);
    },

    stopAutoRefresh() {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }
        if (this._labelInterval) {
            clearInterval(this._labelInterval);
            this._labelInterval = null;
        }
    },

    _updateRefreshLabel() {
        const el = document.getElementById('worldsRefreshLabel');
        if (!el) return;

        const elapsed = Math.floor((Date.now() - this._lastRefreshTime) / 1000);
        if (elapsed < 3) {
            el.textContent = 'Updated just now';
        } else {
            el.textContent = `Updated ${elapsed}s ago`;
        }
    },

    _formatUptime(ms) {
        if (!ms || ms <= 0) return 'N/A';
        const totalSeconds = Math.floor(ms / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
        return parts.join(' ');
    },

    _regionFlag(region) {
        const flagMap = {
            'CAN': 'CANADA',
            'US': 'USA',
            'NTL': 'NETHERLANDS',
            'UK': 'GLOBAL',
            'EU': 'GLOBAL',
            'AU': 'GLOBAL'
        };
        const flag = flagMap[region] || 'GLOBAL';
        return `assets/flags/${flag}.png`;
    },

    _formatRegion(region) {
        const regionMap = {
            'CAN': 'Canada',
            'US': 'United States',
            'NTL': 'Netherlands',
            'UK': 'United Kingdom',
            'EU': 'Europe',
            'AU': 'Australia'
        };
        return regionMap[region] || region || 'Unknown';
    },

    _toggleDetail(worldId) {
        if (this._expandedWorldId === worldId) {
            this._hideDetail(worldId);
        } else {
            if (this._expandedWorldId !== null) {
                this._hideDetail(this._expandedWorldId);
            }
            this._showDetail(worldId);
        }
    },

    _showDetail(worldId) {
        this._expandedWorldId = worldId;

        // Mark the card as expanded
        const card = document.querySelector(`.worlds-card[data-world-id="${worldId}"]`);
        if (card) card.classList.add('expanded');

        // Remove existing detail panel
        const existing = document.getElementById(`telemetry-detail-${worldId}`);
        if (existing) existing.remove();

        // Create detail container and insert after the card
        const detail = document.createElement('div');
        detail.id = `telemetry-detail-${worldId}`;
        detail.className = 'telemetry-detail';

        const grid = document.getElementById('worldsGrid');
        if (card && grid) {
            card.after(detail);
        }

        // Render telemetry charts
        if (typeof Telemetry !== 'undefined') {
            Telemetry.renderWorldDetail(worldId, detail);
        } else {
            detail.innerHTML = '<div class="telemetry-no-data">Chart.js not loaded</div>';
        }
    },

    _hideDetail(worldId) {
        if (this._expandedWorldId === worldId) {
            this._expandedWorldId = null;
        }

        const card = document.querySelector(`.worlds-card[data-world-id="${worldId}"]`);
        if (card) card.classList.remove('expanded');

        const detail = document.getElementById(`telemetry-detail-${worldId}`);
        if (detail) detail.remove();

        if (typeof Telemetry !== 'undefined') {
            Telemetry.destroyWorldDetail(worldId);
        }
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
    module.exports = Worlds;
}
