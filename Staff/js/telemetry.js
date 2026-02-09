/* ============================================================
   ELDEROS STAFF PANEL - TELEMETRY CHARTS
   Chart.js-powered telemetry visualization for world detail views.
   ============================================================ */
console.log('[Telemetry] Loading telemetry.js...');

const Telemetry = {
    charts: {},        // worldId -> { cpu, memory, tick, players } Chart instances
    refreshTimers: {}, // worldId -> interval ID
    _currentRange: {}, // worldId -> current range string
    _containers: {},   // worldId -> container element
    _expandedChart: {},// worldId -> expanded chart key or null
    _chartConfigs: [
        { key: 'cpu', title: 'CPU Usage', unit: '%', field: 'cpu', color: '#3b82f6', thresholdKey: 'cpu' },
        { key: 'memory', title: 'Memory', unit: 'MB', field: 'memMb', color: '#8b5cf6', thresholdKey: null },
        { key: 'tick', title: 'Tick Cycle Time', unit: 'ms', field: 'avgCycleMs', color: '#f59e0b', thresholdKey: 'cycleTime' },
        { key: 'players', title: 'Players', unit: '', field: 'players', color: '#22c55e', thresholdKey: null },
    ],

    thresholds: {
        cpu:       { yellow: 50, red: 75 },
        memory:    { yellow: 60, red: 80 },
        cycleTime: { yellow: 300, red: 450 },
    },

    init() {
        // nothing to do
    },

    /**
     * Render a telemetry detail panel for a world (full rebuild).
     */
    async renderWorldDetail(worldId, container, range = '1h') {
        this._containers[worldId] = container;
        this._currentRange[worldId] = range;

        container.innerHTML = '<div class="telemetry-loading"><div class="telemetry-spinner"></div>Loading telemetry data...</div>';

        try {
            const result = await API.telemetry.getHistory(worldId, range);
            const data = result.data || [];

            if (data.length === 0) {
                container.innerHTML = '<div class="telemetry-no-data">No telemetry data available for this range</div>';
                return;
            }

            container.innerHTML = '';

            // Range bar
            const rangeBar = document.createElement('div');
            rangeBar.className = 'telemetry-range-bar';
            rangeBar.id = `telemetry-range-bar-${worldId}`;
            ['1h', '6h', '24h', '7d', '30d'].forEach(r => {
                const pill = document.createElement('button');
                pill.className = `telemetry-range-pill${r === range ? ' active' : ''}`;
                pill.textContent = r;
                pill.addEventListener('click', () => {
                    this._currentRange[worldId] = r;
                    this._expandedChart[worldId] = null; // collapse on range change
                    this.renderWorldDetail(worldId, container, r);
                });
                rangeBar.appendChild(pill);
            });
            container.appendChild(rangeBar);

            // Chart grid
            const grid = document.createElement('div');
            grid.className = 'telemetry-chart-grid';
            grid.id = `telemetry-grid-${worldId}`;
            container.appendChild(grid);

            if (!this.charts[worldId]) this.charts[worldId] = {};

            this._chartConfigs.forEach(cfg => {
                const card = this._buildChartCard(worldId, cfg, data);
                grid.appendChild(card);

                requestAnimationFrame(() => {
                    const canvas = document.getElementById(`telemetry-canvas-${worldId}-${cfg.key}`);
                    if (!canvas) return;
                    if (this.charts[worldId][cfg.key]) {
                        this.charts[worldId][cfg.key].destroy();
                    }
                    this.charts[worldId][cfg.key] = this._createChart(
                        canvas, data, cfg.field, cfg.color, cfg.unit, cfg.thresholdKey
                    );
                });
            });

            // Apply expanded state if one was previously expanded
            if (this._expandedChart[worldId]) {
                this._applyExpand(worldId, this._expandedChart[worldId]);
            }

            // Auto-refresh for short ranges — uses smooth update
            this._stopAutoRefresh(worldId);
            if (range === '1h' || range === '6h') {
                this.refreshTimers[worldId] = setInterval(() => {
                    this._smoothRefresh(worldId);
                }, 30000);
            }

        } catch (error) {
            console.error('[Telemetry] Failed to load data:', error);
            container.innerHTML = `<div class="telemetry-no-data">Failed to load telemetry: ${error.message}</div>`;
        }
    },

    /**
     * Smooth in-place refresh: fetch new data and update existing charts
     * without rebuilding the DOM.
     */
    async _smoothRefresh(worldId) {
        const range = this._currentRange[worldId] || '1h';
        const container = this._containers[worldId];
        if (!container) return;

        // Show subtle refresh indicator
        const rangeBar = document.getElementById(`telemetry-range-bar-${worldId}`);
        if (rangeBar) rangeBar.classList.add('refreshing');

        try {
            const result = await API.telemetry.getHistory(worldId, range);
            const data = result.data || [];

            if (data.length === 0) return;

            // Update each chart in-place
            this._chartConfigs.forEach(cfg => {
                const chart = this.charts[worldId]?.[cfg.key];
                if (chart) {
                    const labels = data.map(d => new Date(d.t));
                    const values = data.map(d => d[cfg.field] || 0);
                    chart.data.labels = labels;
                    chart.data.datasets[0].data = values;
                    chart.update('none'); // no animation for smooth feel
                }

                // Update stat labels
                const values = data.map(d => d[cfg.field] || 0);
                const current = values.length > 0 ? values[values.length - 1] : 0;
                const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
                const peak = values.length > 0 ? Math.max(...values) : 0;

                const statsEl = document.getElementById(`telemetry-stats-${worldId}-${cfg.key}`);
                if (statsEl) {
                    statsEl.innerHTML = `
                        <span class="telemetry-stat-label">Now: <span class="value">${this._formatValue(current, cfg.unit)}</span></span>
                        <span class="telemetry-stat-label">Avg: <span class="value">${this._formatValue(avg, cfg.unit)}</span></span>
                        <span class="telemetry-stat-label">Peak: <span class="value">${this._formatValue(peak, cfg.unit)}</span></span>
                    `;
                }
            });

        } catch (error) {
            console.error('[Telemetry] Smooth refresh failed:', error);
        } finally {
            if (rangeBar) rangeBar.classList.remove('refreshing');
        }
    },

    /**
     * Build a chart card DOM element.
     */
    _buildChartCard(worldId, cfg, data) {
        const card = document.createElement('div');
        card.className = 'telemetry-chart-card';
        card.id = `telemetry-card-${worldId}-${cfg.key}`;

        const values = data.map(d => d[cfg.field] || 0);
        const current = values.length > 0 ? values[values.length - 1] : 0;
        const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
        const peak = values.length > 0 ? Math.max(...values) : 0;

        card.innerHTML = `
            <div class="telemetry-chart-header">
                <div class="telemetry-chart-title-row">
                    <span class="telemetry-chart-title">${cfg.title}</span>
                    <button class="telemetry-expand-btn" title="Expand chart" data-key="${cfg.key}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polyline points="15 3 21 3 21 9"/>
                            <polyline points="9 21 3 21 3 15"/>
                            <line x1="21" y1="3" x2="14" y2="10"/>
                            <line x1="3" y1="21" x2="10" y2="14"/>
                        </svg>
                    </button>
                </div>
                <div class="telemetry-chart-stats" id="telemetry-stats-${worldId}-${cfg.key}">
                    <span class="telemetry-stat-label">Now: <span class="value">${this._formatValue(current, cfg.unit)}</span></span>
                    <span class="telemetry-stat-label">Avg: <span class="value">${this._formatValue(avg, cfg.unit)}</span></span>
                    <span class="telemetry-stat-label">Peak: <span class="value">${this._formatValue(peak, cfg.unit)}</span></span>
                </div>
            </div>
            <div class="telemetry-chart-wrapper">
                <canvas id="telemetry-canvas-${worldId}-${cfg.key}"></canvas>
            </div>
        `;

        // Expand/collapse on button click
        const expandBtn = card.querySelector('.telemetry-expand-btn');
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleExpand(worldId, cfg.key);
        });

        return card;
    },

    /**
     * Toggle a chart between expanded (full-width, taller) and normal.
     */
    _toggleExpand(worldId, chartKey) {
        if (this._expandedChart[worldId] === chartKey) {
            // Collapse
            this._expandedChart[worldId] = null;
            this._applyExpand(worldId, null);
        } else {
            this._expandedChart[worldId] = chartKey;
            this._applyExpand(worldId, chartKey);
        }
    },

    _applyExpand(worldId, expandedKey) {
        this._chartConfigs.forEach(cfg => {
            const card = document.getElementById(`telemetry-card-${worldId}-${cfg.key}`);
            if (!card) return;

            if (expandedKey && cfg.key === expandedKey) {
                card.classList.add('expanded');
                card.querySelector('.telemetry-expand-btn').title = 'Collapse chart';
            } else if (expandedKey && cfg.key !== expandedKey) {
                card.classList.add('hidden');
                card.classList.remove('expanded');
            } else {
                card.classList.remove('expanded', 'hidden');
                card.querySelector('.telemetry-expand-btn').title = 'Expand chart';
            }
        });

        // Resize charts after layout change
        requestAnimationFrame(() => {
            if (this.charts[worldId]) {
                Object.values(this.charts[worldId]).forEach(chart => {
                    if (chart) chart.resize();
                });
            }
        });
    },

    /**
     * Clean up Chart.js instances and timers for a world.
     */
    destroyWorldDetail(worldId) {
        this._stopAutoRefresh(worldId);
        if (this.charts[worldId]) {
            Object.values(this.charts[worldId]).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') chart.destroy();
            });
            delete this.charts[worldId];
        }
        delete this._expandedChart[worldId];
        delete this._containers[worldId];
        delete this._currentRange[worldId];
    },

    /**
     * Create a Chart.js line chart.
     */
    _createChart(canvas, data, field, color, unit, thresholdKey) {
        if (typeof Chart === 'undefined') {
            console.warn('[Telemetry] Chart.js not loaded');
            return null;
        }

        const labels = data.map(d => new Date(d.t));
        const values = data.map(d => d[field] || 0);

        // Threshold background bands via plugin
        const thresholds = thresholdKey ? this.thresholds[thresholdKey] : null;
        const plugins = [];
        if (thresholds) {
            plugins.push({
                id: 'thresholdBands',
                beforeDraw: (chart) => {
                    const { ctx, chartArea, scales } = chart;
                    if (!chartArea) return;
                    const yScale = scales.y;
                    const { left, right, top, bottom } = chartArea;

                    const yYellow = yScale.getPixelForValue(thresholds.yellow);
                    const yRed = yScale.getPixelForValue(thresholds.red);

                    // Green zone: 0 to yellow
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
                    ctx.fillRect(left, Math.max(yYellow, top), right - left, bottom - Math.max(yYellow, top));

                    // Yellow zone: yellow to red
                    ctx.fillStyle = 'rgba(234, 179, 8, 0.08)';
                    ctx.fillRect(left, Math.max(yRed, top), right - left, Math.max(yYellow, top) - Math.max(yRed, top));

                    // Red zone: above red
                    ctx.fillStyle = 'rgba(244, 14, 0, 0.06)';
                    ctx.fillRect(left, top, right - left, Math.max(yRed, top) - top);
                }
            });
        }

        return new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data: values,
                    borderColor: color,
                    backgroundColor: color + '1A',
                    borderWidth: 1.5,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBorderWidth: 2,
                    pointHoverBackgroundColor: color,
                    pointHoverBorderColor: '#fff',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 11 },
                        bodyFont: { size: 12, family: "'JetBrains Mono', monospace" },
                        padding: 8,
                        callbacks: {
                            title: (items) => {
                                if (!items.length) return '';
                                return new Date(items[0].parsed.x).toLocaleString();
                            },
                            label: (item) => ` ${this._formatValue(item.parsed.y, unit)}`
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'PPpp',
                            displayFormats: {
                                minute: 'HH:mm',
                                hour: 'HH:mm',
                                day: 'MMM d',
                            }
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.04)',
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.4)',
                            font: { size: 10 },
                            maxTicksLimit: 8,
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255,255,255,0.04)',
                        },
                        ticks: {
                            color: 'rgba(255,255,255,0.4)',
                            font: { size: 10 },
                            callback: (val) => this._formatValue(val, unit),
                        }
                    }
                },
                animation: {
                    duration: 300
                }
            },
            plugins
        });
    },

    /**
     * Render a tiny SVG sparkline.
     */
    renderSparkline(values, color = '#3b82f6') {
        if (!values || values.length < 2) return '';

        const w = 60, h = 20, pad = 1;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const points = values.map((v, i) => {
            const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
            const y = pad + (1 - (v - min) / range) * (h - 2 * pad);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        return `<span class="telemetry-sparkline">
            <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>`;
    },

    _formatValue(val, unit) {
        if (val === null || val === undefined) return '0';
        const num = typeof val === 'number' ? val : parseFloat(val);
        if (isNaN(num)) return '0';
        const formatted = num % 1 === 0 ? num.toString() : num.toFixed(1);
        return unit ? `${formatted}${unit}` : formatted;
    },

    _stopAutoRefresh(worldId) {
        if (this.refreshTimers[worldId]) {
            clearInterval(this.refreshTimers[worldId]);
            delete this.refreshTimers[worldId];
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Telemetry;
}
