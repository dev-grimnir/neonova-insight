/**
 * Shared chart builder for both NeonovaSnapshotView (modal) and
 * NeonovaReportSnapshotView (inline). Views are dumb — they call
 * build() with a canvas, a model, and a click callback.
 *
 * Visual style ported from original NeonovaSnapshotView#initChart.
 * Tick density scales with range (month / day / hour) instead of
 * the original's fixed maxTicksLimit: 5, so 11-month charts get
 * monthly labels and become useful click targets.
 */
class NeonovaSnapshotChart {

    static #MS_PER_DAY = 86400000;
    static #MONTH_THRESHOLD_DAYS = 60;

    /* ============================================================
     *  GRANULARITY + TICKS
     * ============================================================ */

    static #getGranularity(startMs, endMs) {
        const days = (endMs - startMs) / this.#MS_PER_DAY;
        if (days >= this.#MONTH_THRESHOLD_DAYS) return 'month';
        if (days > 1.01) return 'day';
        return 'hour';
    }

    static #monthTickValues(startMs, endMs) {
        const ticks = [];
        const start = new Date(startMs);
        let year  = start.getFullYear();
        let month = start.getMonth();
        // First tick: the 1st of the month at/after startMs
        if (start.getDate() !== 1 || start.getHours() !== 0 || start.getMinutes() !== 0) {
            month++;
            if (month > 11) { month = 0; year++; }
        }
        while (true) {
            const t = new Date(year, month, 1, 0, 0, 0, 0).getTime();
            if (t > endMs) break;
            ticks.push(t);
            month++;
            if (month > 11) { month = 0; year++; }
        }
        return ticks;
    }

    static #dayTickValues(startMs, endMs) {
        const ticks = [];
        const cursor = new Date(startMs);
        cursor.setHours(0, 0, 0, 0);
        if (cursor.getTime() < startMs) cursor.setDate(cursor.getDate() + 1);
        while (cursor.getTime() <= endMs) {
            ticks.push(cursor.getTime());
            cursor.setDate(cursor.getDate() + 1);
        }
        return ticks;
    }

    static #hourTickValues(startMs, endMs) {
        const ticks = [];
        const cursor = new Date(startMs);
        cursor.setMinutes(0, 0, 0);
        if (cursor.getTime() < startMs) cursor.setHours(cursor.getHours() + 1);
        while (cursor.getTime() <= endMs) {
            ticks.push(cursor.getTime());
            cursor.setHours(cursor.getHours() + 1);
        }
        return ticks;
    }

    static #formatTick(ms, granularity) {
        const d = new Date(ms);
        if (granularity === 'month') {
            return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }
        if (granularity === 'day') {
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
        return `${d.getHours().toString().padStart(2, '0')}:00`;
    }

    /* ============================================================
     *  PERIOD BUILDING
     * ============================================================ */

    /**
     * Group consecutive same-state events into periods. The first period
     * is anchored at startTime regardless of when the first real event
     * is, so the chart fills its full x-range without diagonals. The
     * synthetic anchor inherits the inverse of the first real event's
     * status (if first event is "Start"/connected, prior state was down).
     */
    static #buildPeriods(sortedEvents, startTime, endTime) {
        const periods = [];
        if (sortedEvents.length === 0) return periods;

        // Synthesize an opening event at chart start if the first real event
        // is later. This forces the first period to begin at startTime.
        const events = [...sortedEvents];
        const firstRealMs = events[0].dateObj.getTime();
        if (firstRealMs > startTime) {
            const firstIsConnected = (events[0].status === 'Start' || events[0].status === 'connected');
            events.unshift({
                dateObj: new Date(startTime),
                status: firstIsConnected ? 'Stop' : 'Start'
            });
        }

        let i = 0;
        while (i < events.length) {
            const isConnected = (events[i].status === 'Start' || events[i].status === 'connected');
            const startMs = events[i].dateObj.getTime();

            let j = i + 1;
            while (j < events.length &&
                   ((events[j].status === 'Start' || events[j].status === 'connected') === isConnected)) {
                j++;
            }

            const endMs = j < events.length
                ? events[j].dateObj.getTime() - 1
                : endTime;

            periods.push({ startMs, endMs, isConnected });
            i = j;
        }
        return periods;
    }

    /* ============================================================
     *  PUBLIC BUILD
     * ============================================================ */

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {NeonovaSnapshotModel} model
     * @param {(startDate: Date, endDate: Date) => void} onRangeClick
     *        Called when the user clicks a tick label. Range matches the
     *        current display granularity (a month for long-range charts,
     *        a day for short-range). Not called on hour-grained charts.
     * @returns {{ chart: Chart, periods: Array }}
     */
    static build(canvas, model, onRangeClick) {
        const events = (model.getEvents ? model.getEvents() : model.events) || [];
        const sortedEvents = [...events].sort((a, b) =>
            (a.dateObj || new Date(0)) - (b.dateObj || new Date(0))
        );

        const startTime = model.startDate.getTime();
        const endTime   = model.endDate.getTime();

        const periods = this.#buildPeriods(sortedEvents, startTime, endTime);
        const granularity = this.#getGranularity(startTime, endTime);

        console.log('[SnapshotChart] events:', sortedEvents.length,
                    'periods:', periods.length,
                    'first period:', periods[0],
                    'granularity:', granularity);

        const tickValues = granularity === 'month' ? this.#monthTickValues(startTime, endTime)
                         : granularity === 'day'   ? this.#dayTickValues(startTime, endTime)
                         :                            this.#hourTickValues(startTime, endTime);

        // Build chart points from periods (two points each = no diagonals)
        const rawPeriods = [];
        periods.forEach(p => {
            const y = p.isConnected ? 1 : -1;
            rawPeriods.push({ x: p.startMs, y });
            rawPeriods.push({ x: p.endMs,   y });
        });

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Connected',
                        data: rawPeriods.map(pt => ({ x: pt.x, y: pt.y > 0 ? 1 : 0 })),
                        borderColor: '#10b981',
                        backgroundColor: '#10b98188',
                        borderWidth: 0,
                        stepped: 'before',
                        tension: 0,
                        fill: 'origin',
                        pointRadius: 0
                    },
                    {
                        label: 'Disconnected',
                        data: rawPeriods.map(pt => ({ x: pt.x, y: pt.y < 0 ? -1 : 0 })),
                        borderColor: '#ef4444',
                        backgroundColor: '#ef444488',
                        borderWidth: 0,
                        stepped: 'before',
                        tension: 0,
                        fill: 'origin',
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    decimation: { enabled: false },
                    tooltip: {
                        enabled: true,
                        intersect: false,
                        mode: 'index',
                        callbacks: {
                            title: (items) => {
                                if (!items.length) return '';
                                return new Date(items[0].parsed.x).toLocaleString([], {
                                    month: 'short', day: 'numeric',
                                    hour: 'numeric', minute: '2-digit'
                                });
                            },
                            label: (ctx) => {
                                if (ctx.parsed.y === 0) return '';

                                const currentX = ctx.parsed.x;
                                const period = periods.find(p => currentX >= p.startMs && currentX <= p.endMs);
                                if (!period) return '';

                                const fmt = (ms) => new Date(ms).toLocaleString([], {
                                    month: 'short', day: 'numeric',
                                    hour: 'numeric', minute: '2-digit'
                                });

                                const durMs  = period.endMs - period.startMs;
                                const hours  = Math.floor(durMs / 3600000);
                                const mins   = Math.floor((durMs % 3600000) / 60000);
                                const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                                const label = period.isConnected ? 'Connected' : 'Disconnected';
                                return `${label} — ${fmt(period.startMs)} to ${fmt(period.endMs)} (${durStr})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: startTime,
                        max: endTime,
                        grid: { color: '#27272a' },
                        ticks: {
                            color: '#64748b',
                            autoSkip: false,
                            callback: (value) => this.#formatTick(value, granularity)
                        },
                        afterBuildTicks: (axis) => {
                            axis.ticks = tickValues.map(v => ({ value: v }));
                        }
                    },
                    y: {
                        min: -3,
                        max: 3,
                        ticks: { display: false },
                        grid: {
                            color: ctx => ctx.tick.value === 0 ? '#a3a3a3' : '#27272a',
                            lineWidth: ctx => ctx.tick.value === 0 ? 4 : 1.5
                        }
                    }
                },
                layout: { padding: { right: 40, left: 20, top: 30, bottom: 20 } }
            }
        });

        setTimeout(() => chart?.resize(), 100);

        // Click in the bottom label zone to drill down. The drill range
        // matches the current display granularity: clicking a month label on
        // an 11-month chart drills into that month; clicking a day label on
        // a 30-day chart drills into that day. Hour-grained charts are
        // terminal — no drill.
        canvas.addEventListener('click', (e) => {
            if (!onRangeClick || granularity === 'hour') return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (y < chart.chartArea.bottom - 30) return;

            const clickedMs = chart.scales.x.getValueForPixel(x);
            if (clickedMs == null || isNaN(clickedMs)) return;

            const clicked = new Date(clickedMs);
            let drillStart, drillEnd;

            if (granularity === 'month') {
                drillStart = new Date(clicked.getFullYear(), clicked.getMonth(), 1, 0, 0, 0, 0);
                drillEnd   = new Date(clicked.getFullYear(), clicked.getMonth() + 1, 1, 0, 0, 0, 0);
                drillEnd   = new Date(drillEnd.getTime() - 1);
                // Clip to chart range so the first/last partial month
                // doesn't drill into nonexistent days.
                if (drillStart.getTime() < startTime) drillStart = new Date(startTime);
                if (drillEnd.getTime()   > endTime)   drillEnd   = new Date(endTime);
            } else {
                // day granularity
                drillStart = new Date(clicked.getFullYear(), clicked.getMonth(), clicked.getDate(), 0, 0, 0, 0);
                drillEnd   = new Date(clicked.getFullYear(), clicked.getMonth(), clicked.getDate(), 23, 59, 59, 999);
            }

            onRangeClick(drillStart, drillEnd);
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            if (granularity === 'hour') {
                canvas.style.cursor = 'default';
                return;
            }
            canvas.style.cursor = y > chart.chartArea.bottom - 30 ? 'pointer' : 'default';
        });

        return { chart, periods };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaSnapshotChart;
}
