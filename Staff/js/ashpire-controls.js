/* ============================================================
   ELDEROS STAFF PANEL - ASHPIRE CONTROLS
   ============================================================ */
console.log('[AshpireControls] Loading ashpire-controls.js...');

const AshpireControls = {
    _loaded: false,
    _data: null,

    init() {
        // Nothing to cache
    },

    onPageLoad() {
        this.load();
    },

    onPageLeave() {
        // No timers to clear
    },

    async load() {
        const container = document.getElementById('page-ashpire-controls');
        if (!container) return;

        try {
            const data = await API.ashpire.getAuthSettings();
            this._loaded = true;
            this._data = data;
            this.render(data);
        } catch (error) {
            console.error('[AshpireControls] Failed to load:', error);
            container.innerHTML = `
                <div class="content-panel">
                    <div class="panel-body">
                        <div class="empty-state">
                            <div class="empty-state-title">Failed to load settings</div>
                            <div class="empty-state-text">${this._escapeHtml(error.message)}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    render(data) {
        const container = document.getElementById('page-ashpire-controls');
        if (!container) return;

        const roles = ['ALL', 'SUPPORT', 'MODERATOR', 'ADMINISTRATOR', 'DEVELOPER', 'OWNER'];
        const currentLockdownRole = data.lockdownMinRole || 'ALL';

        container.innerHTML = `
            <div class="ashpire-controls-page">
                <div class="ashpire-warning-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                        <strong>Development Only</strong>
                        <p>These toggles bypass authentication steps for testing. Disable them before going live.</p>
                    </div>
                </div>

                <div class="content-panel">
                    <div class="panel-header">
                        <h3 class="panel-title">Authentication Bypass</h3>
                    </div>
                    <div class="panel-body">
                        <div class="ashpire-toggle-row">
                            <div class="ashpire-toggle-info">
                                <div class="ashpire-toggle-label">Skip 2FA</div>
                                <div class="ashpire-toggle-desc">Bypass two-factor authentication when logging into the staff panel as Ashpire.</div>
                            </div>
                            <label class="ashpire-toggle">
                                <input type="checkbox" id="toggleSkip2fa" ${data.skip2fa ? 'checked' : ''}>
                                <span class="ashpire-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="ashpire-toggle-divider"></div>

                        <div class="ashpire-toggle-row">
                            <div class="ashpire-toggle-info">
                                <div class="ashpire-toggle-label">Skip Discord Session Key</div>
                                <div class="ashpire-toggle-desc">Bypass the daily Discord session key requirement when logging into the staff panel as Ashpire.</div>
                            </div>
                            <label class="ashpire-toggle">
                                <input type="checkbox" id="toggleSkipDiscordKey" ${data.skipDiscordKey ? 'checked' : ''}>
                                <span class="ashpire-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="ashpire-panel-status" id="ashpireStatusBar">
                            <span class="ashpire-status-dot ${data.skip2fa || data.skipDiscordKey ? 'active' : ''}"></span>
                            <span id="ashpireStatusText">${this._statusText(data)}</span>
                        </div>
                    </div>
                </div>

                <!-- Site Lockdown Section -->
                <div class="content-panel">
                    <div class="panel-header">
                        <h3 class="panel-title">Site Lockdown</h3>
                    </div>
                    <div class="panel-body">
                        <div class="ashpire-toggle-row">
                            <div class="ashpire-toggle-info">
                                <div class="ashpire-toggle-label">Lockdown Mode</div>
                                <div class="ashpire-toggle-desc">Restrict staff panel access to staff at or above a specific rank. Staff below the minimum rank will be kicked immediately.</div>
                            </div>
                            <label class="ashpire-toggle">
                                <input type="checkbox" id="toggleLockdown" ${data.lockdownEnabled ? 'checked' : ''}>
                                <span class="ashpire-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="ashpire-toggle-divider"></div>

                        <div class="ashpire-rank-row">
                            <div class="ashpire-rank-header">
                                <div class="ashpire-toggle-label">Minimum Rank</div>
                                <select id="lockdownMinRole" class="ashpire-select" ${!data.lockdownEnabled ? 'disabled' : ''}>
                                    ${roles.map(r => `<option value="${r}" ${r === currentLockdownRole ? 'selected' : ''}>${r === 'ALL' ? 'All Staff (No Restriction)' : r.charAt(0) + r.slice(1).toLowerCase() + '+'}</option>`).join('')}
                                </select>
                            </div>
                            <div class="ashpire-toggle-desc">Only staff at or above this rank can access the panel while lockdown is active.</div>
                        </div>

                        <div class="ashpire-panel-status ${data.lockdownEnabled ? 'lockdown-active' : ''}" id="lockdownStatusBar">
                            <span class="ashpire-status-dot ${data.lockdownEnabled ? 'lockdown' : ''}"></span>
                            <span id="lockdownStatusText">${this._lockdownStatusText(data)}</span>
                        </div>
                    </div>
                </div>

                <!-- Website Lockdown Section -->
                <div class="content-panel">
                    <div class="panel-header">
                        <h3 class="panel-title">Website Lockdown</h3>
                    </div>
                    <div class="panel-body">
                        <div class="ashpire-toggle-row">
                            <div class="ashpire-toggle-info">
                                <div class="ashpire-toggle-label">Lock Public Website</div>
                                <div class="ashpire-toggle-desc">Redirect all public subdomains to the homepage. Hiscores, News, Play, Vote, Adventurers, and Creators will be inaccessible.</div>
                            </div>
                            <label class="ashpire-toggle">
                                <input type="checkbox" id="toggleSiteLockdown" ${data.siteLockdownEnabled ? 'checked' : ''}>
                                <span class="ashpire-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="ashpire-toggle-divider"></div>

                        <div class="ashpire-toggle-row">
                            <div class="ashpire-toggle-info">
                                <div class="ashpire-toggle-label">Allow Admin+ Bypass</div>
                                <div class="ashpire-toggle-desc">Allow logged-in Administrator+ accounts to bypass the website lockdown and access public subdomains normally.</div>
                            </div>
                            <label class="ashpire-toggle">
                                <input type="checkbox" id="toggleSiteLockdownAdminBypass" ${data.siteLockdownAdminBypass ? 'checked' : ''} ${!data.siteLockdownEnabled ? 'disabled' : ''}>
                                <span class="ashpire-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="ashpire-panel-status ${data.siteLockdownEnabled ? 'lockdown-active' : ''}" id="siteLockdownStatusBar">
                            <span class="ashpire-status-dot ${data.siteLockdownEnabled ? 'lockdown' : ''}"></span>
                            <span id="siteLockdownStatusText">${this._siteLockdownStatusText(data)}</span>
                        </div>
                    </div>
                </div>

                <!-- Active Staff Sessions Section -->
                <div class="ashpire-section" id="ashpireSessionsSection">
                    <div class="ashpire-section-header" data-section="sessions">
                        <h3 class="ashpire-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            Active Staff Sessions
                        </h3>
                        <div class="ashpire-section-actions">
                            <button class="ashpire-refresh-btn" id="refreshSessionsBtn" title="Refresh sessions">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="23 4 23 10 17 10"/>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                </svg>
                            </button>
                            <svg class="ashpire-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </div>
                    </div>
                    <div class="ashpire-section-body" id="ashpireSessionsBody">
                        <div class="ashpire-loading">Loading sessions...</div>
                    </div>
                </div>

            </div>
        `;

        // Bind auth bypass toggle events
        document.getElementById('toggleSkip2fa')?.addEventListener('change', (e) => {
            this._updateSetting('skip2fa', e.target.checked);
        });
        document.getElementById('toggleSkipDiscordKey')?.addEventListener('change', (e) => {
            this._updateSetting('skipDiscordKey', e.target.checked);
        });

        // Bind lockdown toggle
        document.getElementById('toggleLockdown')?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            const dropdown = document.getElementById('lockdownMinRole');
            dropdown.disabled = !enabled;
            this._updateLockdown(enabled, dropdown.value);
        });

        // Bind lockdown dropdown
        document.getElementById('lockdownMinRole')?.addEventListener('change', (e) => {
            const lockdownToggle = document.getElementById('toggleLockdown');
            if (lockdownToggle?.checked) {
                this._updateLockdown(true, e.target.value);
            }
        });

        // Bind website lockdown toggle
        document.getElementById('toggleSiteLockdown')?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            const bypassToggle = document.getElementById('toggleSiteLockdownAdminBypass');
            if (bypassToggle) bypassToggle.disabled = !enabled;
            this._updateSiteLockdown(enabled);
        });

        // Bind website lockdown admin bypass toggle
        document.getElementById('toggleSiteLockdownAdminBypass')?.addEventListener('change', (e) => {
            this._updateSiteLockdownAdminBypass(e.target.checked);
        });

        // Bind collapsible section headers
        document.querySelectorAll('.ashpire-section-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking the refresh button
                if (e.target.closest('.ashpire-refresh-btn')) return;

                const body = header.nextElementSibling;
                body.classList.toggle('collapsed');
                header.classList.toggle('collapsed');
            });
        });

        // Bind refresh sessions button
        document.getElementById('refreshSessionsBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._loadSessions();
        });

        // Load sessions
        this._loadSessions();
    },

    async _updateSetting(key, value) {
        try {
            const payload = {};
            payload[key] = value;
            const data = await API.ashpire.updateAuthSettings(payload);

            const statusDot = document.querySelector('#ashpireStatusBar .ashpire-status-dot');
            const statusText = document.getElementById('ashpireStatusText');
            if (statusDot) {
                statusDot.classList.toggle('active', data.skip2fa || data.skipDiscordKey);
            }
            if (statusText) {
                statusText.textContent = this._statusText(data);
            }

            Toast.success(`${key === 'skip2fa' ? '2FA bypass' : 'Discord key bypass'} ${value ? 'enabled' : 'disabled'}`);
        } catch (error) {
            Toast.error('Failed to update setting: ' + error.message);
            this.load();
        }
    },

    async _updateLockdown(enabled, minRole) {
        try {
            const data = await API.ashpire.updateAuthSettings({
                lockdownEnabled: enabled,
                lockdownMinRole: minRole
            });

            // Update lockdown status bar
            const bar = document.getElementById('lockdownStatusBar');
            const dot = bar?.querySelector('.ashpire-status-dot');
            const text = document.getElementById('lockdownStatusText');
            if (bar) bar.classList.toggle('lockdown-active', data.lockdownEnabled);
            if (dot) dot.classList.toggle('lockdown', data.lockdownEnabled);
            if (text) text.textContent = this._lockdownStatusText(data);

            if (data.kicked > 0) {
                Toast.success(`Lockdown ${enabled ? 'enabled' : 'updated'} — ${data.kicked} staff session${data.kicked > 1 ? 's' : ''} kicked`);
                this._loadSessions();
            } else if (enabled) {
                Toast.success(`Lockdown enabled — minimum rank: ${minRole === 'ALL' ? 'No restriction' : minRole}`);
            } else {
                Toast.success('Lockdown disabled — all staff can access');
            }
        } catch (error) {
            Toast.error('Failed to update lockdown: ' + error.message);
            this.load();
        }
    },

    async _updateSiteLockdown(enabled) {
        try {
            const data = await API.ashpire.updateAuthSettings({ siteLockdownEnabled: enabled });

            const bar = document.getElementById('siteLockdownStatusBar');
            const dot = bar?.querySelector('.ashpire-status-dot');
            const text = document.getElementById('siteLockdownStatusText');
            if (bar) bar.classList.toggle('lockdown-active', data.siteLockdownEnabled);
            if (dot) dot.classList.toggle('lockdown', data.siteLockdownEnabled);
            if (text) text.textContent = this._siteLockdownStatusText(data);

            Toast.success(`Website lockdown ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            Toast.error('Failed to update website lockdown: ' + error.message);
            this.load();
        }
    },

    async _updateSiteLockdownAdminBypass(enabled) {
        try {
            const data = await API.ashpire.updateAuthSettings({ siteLockdownAdminBypass: enabled });

            const text = document.getElementById('siteLockdownStatusText');
            if (text) text.textContent = this._siteLockdownStatusText(data);

            Toast.success(`Admin bypass ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            Toast.error('Failed to update admin bypass: ' + error.message);
            this.load();
        }
    },

    // --- Active Staff Sessions ---

    async _loadSessions() {
        const body = document.getElementById('ashpireSessionsBody');
        if (!body) return;

        const refreshBtn = document.getElementById('refreshSessionsBtn');
        if (refreshBtn) {
            refreshBtn.classList.add('spinning');
            refreshBtn.disabled = true;
        }

        try {
            const data = await API.ashpire.getSessions();
            if (!data.sessions || data.sessions.length === 0) {
                body.innerHTML = '<div class="ashpire-empty">No active sessions</div>';
                return;
            }

            let html = `
                <table class="ashpire-sessions-table">
                    <thead>
                        <tr>
                            <th>Staff</th>
                            <th>Role</th>
                            <th>Last Active</th>
                            <th>IP</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            const myAccountId = Auth.getUser()?.accountId;
            for (const s of data.sessions) {
                const ago = this._timeAgo(s.lastActive);
                const isMe = s.accountId === myAccountId;
                html += `
                    <tr>
                        <td class="ashpire-session-user">${this._escapeHtml(s.username)}${isMe ? ' <span class="ashpire-session-you">(you)</span>' : ''}</td>
                        <td><span class="ashpire-role-badge role-${s.role.toLowerCase()}">${s.role}</span></td>
                        <td class="ashpire-session-time">${ago}</td>
                        <td class="ashpire-session-ip">${this._escapeHtml(s.ip || '-')}</td>
                        <td>
                            ${!isMe ? `<button class="ashpire-session-kick-btn" data-account-id="${s.accountId}" data-username="${this._escapeHtml(s.username)}">Kick</button>` : ''}
                        </td>
                    </tr>
                `;
            }

            html += '</tbody></table>';
            body.innerHTML = html;

            // Bind kick buttons
            body.querySelectorAll('.ashpire-session-kick-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const accountId = btn.dataset.accountId;
                    const username = btn.dataset.username;
                    if (!confirm(`Kick "${username}" from the staff panel? They will be logged out immediately.`)) return;

                    btn.disabled = true;
                    btn.textContent = 'Kicking...';

                    try {
                        await API.ashpire.kickSession(accountId);
                        Toast.success(`${username} has been kicked`);
                        this._loadSessions();
                    } catch (error) {
                        Toast.error('Failed to kick: ' + error.message);
                        btn.disabled = false;
                        btn.textContent = 'Kick';
                    }
                });
            });
        } catch (error) {
            body.innerHTML = `<div class="ashpire-empty" style="color:#f87171;">${this._escapeHtml(error.message)}</div>`;
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('spinning');
                refreshBtn.disabled = false;
            }
        }
    },

    // === Helpers ===

    _statusText(data) {
        if (data.skip2fa && data.skipDiscordKey) {
            return 'Full bypass active \u2014 Login goes straight to dashboard';
        } else if (data.skip2fa) {
            return '2FA bypass active \u2014 Session key still required';
        } else if (data.skipDiscordKey) {
            return 'Discord key bypass active \u2014 2FA still required';
        }
        return 'All authentication steps active';
    },

    _lockdownStatusText(data) {
        if (!data.lockdownEnabled) {
            return 'Lockdown disabled \u2014 All staff can access the panel';
        }
        const role = data.lockdownMinRole || 'ALL';
        if (role === 'ALL') {
            return 'Lockdown enabled \u2014 No rank restriction set';
        }
        return `Lockdown active \u2014 ${role.charAt(0) + role.slice(1).toLowerCase()}+ only`;
    },

    _siteLockdownStatusText(data) {
        if (!data.siteLockdownEnabled) {
            return 'Website lockdown inactive \u2014 All subdomains accessible';
        }
        if (data.siteLockdownAdminBypass) {
            return 'Website lockdown active \u2014 Admin+ accounts can bypass';
        }
        return 'Website lockdown active \u2014 All public subdomains redirect to homepage';
    },

    _timeAgo(epochMs) {
        if (!epochMs) return '-';
        const diff = Date.now() - epochMs;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        return Math.floor(hrs / 24) + 'd ago';
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
    module.exports = AshpireControls;
}
