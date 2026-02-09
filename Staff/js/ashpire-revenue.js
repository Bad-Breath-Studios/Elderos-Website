/* ============================================================
   ELDEROS STAFF PANEL - ASHPIRE REVENUE DASHBOARD
   ============================================================ */
console.log('[AshpireRevenue] Loading ashpire-revenue.js...');

const AshpireRevenue = {
    _chart: null,
    _currentPeriod: 'daily',
    _currentPage: 1,

    init() {
        // Nothing to cache on init
    },

    onPageLoad() {
        this.load();
    },

    onPageLeave() {
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    },

    async load() {
        const container = document.getElementById('page-ashpire-revenue');
        if (!container) return;

        container.innerHTML = `
            <div class="revenue-page">
                <div class="revenue-header">
                    <h2>Revenue Analytics</h2>
                    <button class="revenue-refresh-btn" id="revenueRefresh">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        Refresh
                    </button>
                </div>
                <div class="revenue-summary" id="revenueSummary">
                    ${this._skeletonCards()}
                </div>
                <div class="revenue-chart-section">
                    <div class="revenue-chart-header">
                        <h3>Revenue Over Time</h3>
                        <div class="revenue-chart-controls" id="revenuePeriodBtns">
                            <button class="revenue-period-btn active" data-period="daily">Daily</button>
                            <button class="revenue-period-btn" data-period="weekly">Weekly</button>
                            <button class="revenue-period-btn" data-period="monthly">Monthly</button>
                        </div>
                    </div>
                    <div class="revenue-chart-canvas">
                        <canvas id="revenueChart"></canvas>
                    </div>
                </div>
                <div class="revenue-bottom">
                    <div class="revenue-recent" id="revenueRecent">
                        <div class="revenue-section-header">
                            <h3>Recent Purchases</h3>
                        </div>
                        <div class="revenue-empty">Loading...</div>
                    </div>
                    <div class="revenue-leaderboard" id="revenueLeaderboard">
                        <div class="revenue-section-header">
                            <h3>Top Spenders</h3>
                        </div>
                        <div class="revenue-empty">Loading...</div>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        document.getElementById('revenueRefresh')?.addEventListener('click', () => this.load());
        document.getElementById('revenuePeriodBtns')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.revenue-period-btn');
            if (btn) {
                document.querySelectorAll('.revenue-period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._currentPeriod = btn.dataset.period;
                this._loadChart();
            }
        });

        // Load data in parallel
        await Promise.all([
            this._loadSummary(),
            this._loadChart(),
            this._loadRecent(1),
            this._loadTopSpenders()
        ]);
    },

    async _loadSummary() {
        try {
            const data = await API.ashpire.getRevenueSummary();
            const container = document.getElementById('revenueSummary');
            if (!container) return;

            container.innerHTML = `
                <div class="revenue-card">
                    <div class="revenue-card-label">Total Revenue</div>
                    <div class="revenue-card-value green">$${this._formatDollars(data.totalRevenueCents)}</div>
                </div>
                <div class="revenue-card">
                    <div class="revenue-card-label">Transactions</div>
                    <div class="revenue-card-value blue">${this._formatNumber(data.totalTransactions)}</div>
                </div>
                <div class="revenue-card">
                    <div class="revenue-card-label">Tokens Credited</div>
                    <div class="revenue-card-value purple">${this._formatNumber(data.totalTokensCredited)}</div>
                </div>
                <div class="revenue-card">
                    <div class="revenue-card-label">Unique Buyers</div>
                    <div class="revenue-card-value orange">${this._formatNumber(data.uniqueBuyers)}</div>
                </div>
            `;
        } catch (error) {
            console.error('[AshpireRevenue] Summary error:', error);
        }
    },

    async _loadChart() {
        try {
            const data = await API.ashpire.getRevenueChart(this._currentPeriod, 90);
            const canvas = document.getElementById('revenueChart');
            if (!canvas) return;

            if (this._chart) {
                this._chart.destroy();
            }

            const labels = data.data.map(d => new Date(d.date));
            const revenues = data.data.map(d => d.revenueCents / 100);
            const transactions = data.data.map(d => d.transactions);

            this._chart = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Revenue ($)',
                            data: revenues,
                            borderColor: '#4ade80',
                            backgroundColor: 'rgba(74, 222, 128, 0.1)',
                            fill: true,
                            tension: 0.3,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Transactions',
                            data: transactions,
                            borderColor: '#60a5fa',
                            backgroundColor: 'rgba(96, 165, 250, 0.1)',
                            fill: false,
                            tension: 0.3,
                            yAxisID: 'y1',
                            borderDash: [5, 5]
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#808080', font: { size: 11 } }
                        },
                        tooltip: {
                            backgroundColor: '#1a1a1a',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            titleColor: '#e8e8e8',
                            bodyColor: '#c0c0c0',
                            callbacks: {
                                label: (ctx) => {
                                    if (ctx.datasetIndex === 0) return `Revenue: $${ctx.parsed.y.toFixed(2)}`;
                                    return `Transactions: ${ctx.parsed.y}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: this._currentPeriod === 'monthly' ? 'month' : this._currentPeriod === 'weekly' ? 'week' : 'day',
                                tooltipFormat: 'MMM d, yyyy'
                            },
                            grid: { color: 'rgba(255,255,255,0.04)' },
                            ticks: { color: '#808080', font: { size: 10 } }
                        },
                        y: {
                            position: 'left',
                            grid: { color: 'rgba(255,255,255,0.04)' },
                            ticks: {
                                color: '#4ade80',
                                font: { size: 10 },
                                callback: (v) => '$' + v
                            }
                        },
                        y1: {
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#60a5fa', font: { size: 10 } }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('[AshpireRevenue] Chart error:', error);
        }
    },

    async _loadRecent(page) {
        try {
            this._currentPage = page;
            const data = await API.ashpire.getRecentPurchases(page, 10);
            const container = document.getElementById('revenueRecent');
            if (!container) return;

            if (!data.purchases || data.purchases.length === 0) {
                container.innerHTML = `
                    <div class="revenue-section-header"><h3>Recent Purchases</h3></div>
                    <div class="revenue-empty">No purchases yet</div>
                `;
                return;
            }

            let rows = '';
            for (const p of data.purchases) {
                rows += `
                    <tr>
                        <td><span class="revenue-player-link" data-account-id="${p.accountId}">${this._escapeHtml(p.username || 'Unknown')}</span></td>
                        <td class="revenue-amount">$${this._formatDollars(p.amountCents)}</td>
                        <td>${this._formatNumber(p.tokensCredited)}</td>
                        <td><span class="revenue-status ${p.status}">${p.status}</span></td>
                        <td>${this._formatTime(p.purchasedAt)}</td>
                    </tr>
                `;
            }

            container.innerHTML = `
                <div class="revenue-section-header"><h3>Recent Purchases</h3></div>
                <table class="revenue-table">
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>Amount</th>
                            <th>Tokens</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="revenue-pagination">
                    <span>Page ${data.page} of ${data.pages} (${data.total} total)</span>
                    <div class="revenue-pagination-btns">
                        <button class="revenue-page-btn" id="revPrevPage" ${page <= 1 ? 'disabled' : ''}>Prev</button>
                        <button class="revenue-page-btn" id="revNextPage" ${page >= data.pages ? 'disabled' : ''}>Next</button>
                    </div>
                </div>
            `;

            // Bind pagination
            container.querySelector('#revPrevPage')?.addEventListener('click', () => this._loadRecent(page - 1));
            container.querySelector('#revNextPage')?.addEventListener('click', () => this._loadRecent(page + 1));

            // Bind player links
            container.querySelectorAll('.revenue-player-link').forEach(link => {
                link.addEventListener('click', () => {
                    const accountId = link.dataset.accountId;
                    if (accountId && typeof PlayerView !== 'undefined') {
                        PlayerView.open(accountId);
                    }
                });
            });
        } catch (error) {
            console.error('[AshpireRevenue] Recent purchases error:', error);
        }
    },

    async _loadTopSpenders() {
        try {
            const data = await API.ashpire.getTopSpenders(10);
            const container = document.getElementById('revenueLeaderboard');
            if (!container) return;

            if (!data.spenders || data.spenders.length === 0) {
                container.innerHTML = `
                    <div class="revenue-section-header"><h3>Top Spenders</h3></div>
                    <div class="revenue-empty">No data yet</div>
                `;
                return;
            }

            let items = '';
            data.spenders.forEach((s, i) => {
                const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'default';
                items += `
                    <div class="revenue-leaderboard-item">
                        <div class="revenue-rank ${rankClass}">#${i + 1}</div>
                        <div class="revenue-leaderboard-info">
                            <div class="revenue-leaderboard-name" data-account-id="${s.accountId}">${this._escapeHtml(s.username || 'Unknown')}</div>
                            <div class="revenue-leaderboard-count">${s.purchaseCount} purchase${s.purchaseCount !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="revenue-leaderboard-amount">$${this._formatDollars(s.totalSpentCents)}</div>
                    </div>
                `;
            });

            container.innerHTML = `
                <div class="revenue-section-header"><h3>Top Spenders</h3></div>
                <div class="revenue-leaderboard-list">${items}</div>
            `;

            // Bind player links
            container.querySelectorAll('.revenue-leaderboard-name').forEach(name => {
                name.addEventListener('click', () => {
                    const accountId = name.dataset.accountId;
                    if (accountId && typeof PlayerView !== 'undefined') {
                        PlayerView.open(accountId);
                    }
                });
            });
        } catch (error) {
            console.error('[AshpireRevenue] Top spenders error:', error);
        }
    },

    // === Helpers ===

    _formatDollars(cents) {
        return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    _formatNumber(n) {
        return (n || 0).toLocaleString('en-US');
    },

    _formatTime(epochMs) {
        if (!epochMs) return '-';
        const d = new Date(epochMs);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
               d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    },

    _skeletonCards() {
        let html = '';
        for (let i = 0; i < 4; i++) {
            html += `
                <div class="revenue-card">
                    <div class="revenue-card-label"><div class="revenue-skeleton" style="width:60px;height:12px;"></div></div>
                    <div class="revenue-card-value"><div class="revenue-skeleton" style="width:100px;height:28px;margin-top:8px;"></div></div>
                </div>
            `;
        }
        return html;
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
    module.exports = AshpireRevenue;
}
