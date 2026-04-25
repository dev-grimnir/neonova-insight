/**
 * Shared chart builder for both NeonovaSnapshotView (modal) and
 * NeonovaReportSnapshotView (inline). Views are dumb — they call
 * build() with a canvas, a model, and a click callback. Tick density
 * and click granularity scale with the range length.
 *
 * Granularity rules:
 *   range >= 60 days        -> month ticks, click drills to clicked month
 *   1 day < range < 60 days -> day ticks,   click drills to clicked day
 *   range == 1 day          -> hour ticks,  click is terminal (no drill)
 */
class NeonovaSnapshotChart {

    static #MS_PER_DAY  = 86400000;
    static #MONTH_THRESHOLD_DAYS = 60;

    static #getGranularity(startDate, endDate) {
        const rangeMs = endDate.getTime() - startDate.getTime();
        const rangeDays = rangeMs / this.#MS_PER_DAY;

        if (rangeDays >= this.#MONTH_THRESHOLD_DAYS) return 'month';
        if (rangeDays > 1.01)                       return 'day';
        return 'hour';
    }

    /* ============================================================
     *  TICK POSITIONS
     * ============================================================ */

    static #monthTicks(startDate, endDate) {
        const ticks = [];
        let year  = startDate.getFullYear();
        let month = startDate.getMonth();
        // First tick: first of the month at/after startDate
        if (startDate.getDate() !== 1 || startDate.getHours() !== 0) {
            month++;
            if (month > 11) { month = 0; year++; }
        }
        while (true) {
            const t = new Date(year, month, 1, 0, 0, 0, 0).getTime();
            if (t > endDate.getTime()) break;
            ticks.push(t);
            month++;
            if (month > 11) { month = 0; year++; }
        }
        return ticks;
    }

    static #dayTicks(startDate, endDate) {
        const ticks = [];
        const cursor = new Date(startDate);
        cursor.setHours(0, 0, 0, 0);
        if (cursor.getTime() < startDate.getTime()) {
            cursor.setDate(cursor.getDate() + 1);
        }
        while (cursor.getTime() <= endDate.getTime()) {
            ticks.push(cursor.getTime());
            cursor.setDate(cursor.getDate() + 1);
        }
        return ticks;
    }

    static #hourTicks(startDate, endDate) {
        const ticks = [];
        const cursor = new Date(startDate);
        cursor.setMinutes(0, 0, 0);
        if (cursor.getTime() < startDate.getTime()) {
            cursor.setHours(cursor.getHours() + 1);
        }
        while (cursor.getTime() <= endDate.getTime()) {
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
     *  CLICK RESOLUTION
     * ============================================================ */

    /**
     * Given a click timestamp and the current granularity, returns
     * the [start, end] range to drill into. Month-grained clicks clip
     * against the original range so drilling into a partial boundary
     * month doesn't lie about data coverage.
     */
    static #resolveClickRange(clickMs, granularity, rangeStart, rangeEnd) {
        if (granularity === 'hour') return null;

        const d = new Date(clickMs);

        if (granularity === 'month') {
            let start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
            let end   = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
            if (start.getTime() < rangeStart.getTime()) start = new Date(rangeStart);
            if (end.getTime()   > rangeEnd.getTime())   end   = new Date(rangeEnd);
            return [start, end];
        }

        // granularity === 'day'
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const end   = new Date(start.getTime() + this.#MS_PER_DAY);
        return [start, end];
    }

    /* ============================================================
     *  DATA ASSEMBLY
     * ============================================================ */

    /**
     * Walks entries into contiguous up/down regions. Regions are the
     * filled areas under the step chart. Returns one dataset with a
     * segmented backgroundColor function keyed to segment state.
     */
    static #buildDatasets(model) {
        const entries = model.getEntries();       // LogEntry list
        const start   = model.startDate;
        const end     = model.endDate;

        // Seed with starting state at range start
        const points = [];
        let state = null;

        // If the first entry is at/after start, we don't know the prior state.
        // The analyzer lead-time injection handled this for metrics; for the
        // chart, we just start from the first entry's inverse and draw from
        // start to first entry at that level.
        if (entries.length > 0) {
            const first = entries[0];
            const firstState = first.status === 'Start' ? 'down' : 'up';
            points.push({ x: start.getTime(), y: firstState === 'up' ? 1 : 0, state: firstState });
            state = firstState;
        } else {
            points.push({ x: start.getTime(), y: 0, state: 'down' });
            state = 'down';
        }

        for (const e of entries) {
            const ts = e.dateObj.getTime();
            if (ts < start.getTime() || ts > end.getTime()) continue;
            // Close previous segment at this x with its y
            points.push({ x: ts, y: state === 'up' ? 1 : 0, state });
            // New state
            state = e.status === 'Start' ? 'up' : 'down';
            points.push({ x: ts, y: state === 'up' ? 1 : 0, state });
        }

        // Close at range end
        points.push({ x: end.getTime(), y: state === 'up' ? 1 : 0, state });

        return points;
    }

    /* ============================================================
     *  PUBLIC BUILD
     * ============================================================ */

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {NeonovaSnapshotModel} model
     * @param {(start: Date, end: Date) => void} onRangeClick
     * @returns {Chart}
     */
    static build(canvas, model, onRangeClick) {
        const start = model.startDate;
        const end   = model.endDate;
        const granularity = this.#getGranularity(start, end);

        const points = this.#buildDatasets(model);

        // Two fills: one for up (green above axis), one for down (red below axis).
        // We use a centered baseline at 0.5 and map up→1, down→0 for visual symmetry.
        const upData   = points.map(p => ({ x: p.x, y: p.state === 'up'   ? 1   : 0.5 }));
        const downData = points.map(p => ({ x: p.x, y: p.state === 'down' ? 0   : 0.5 }));

        const tickValues = granularity === 'month'
            ? this.#monthTicks(start, end)
            : granularity === 'day'
                ? this.#dayTicks(start, end)
                : this.#hourTicks(start, end);

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Connected',
                        data: upData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.55)',
                        fill: { target: { value: 0.5 } },
                        stepped: 'before',
                        pointRadius: 0,
                        borderWidth: 0
                    },
                    {
                        label: 'Disconnected',
                        data: downData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.70)',
                        fill: { target: { value: 0.5 } },
                        stepped: 'before',
                        pointRadius: 0,
                        borderWidth: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                if (!items.length) return '';
                                return new Date(items[0].parsed.x).toLocaleString();
                            },
                            label: (item) => {
                                // Only show the label that corresponds to the current state
                                const ds = item.dataset.label;
                                if (ds === 'Connected' && item.parsed.y === 1)  return 'Connected';
                                if (ds === 'Disconnected' && item.parsed.y === 0) return 'Disconnected';
                                return null;
                            }
                        },
                        filter: (item) => item.formattedValue !== null
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: start.getTime(),
                        max: end.getTime(),
                        grid: { color: '#27272a' },
                        ticks: {
                            color: '#e5e7eb',
                            autoSkip: false,
                            source: 'labels',
                            callback: (value) => this.#formatTick(value, granularity)
                        },
                        afterBuildTicks: (axis) => {
                            axis.ticks = tickValues.map(v => ({ value: v }));
                        }
                    },
                    y: {
                        min: 0,
                        max: 1,
                        display: false,
                        grid: { display: false }
                    }
                }
            }
        });

        canvas.style.cursor = granularity === 'hour' ? 'default' : 'pointer';

        // Chart.js's onClick option only fires when a data element (point/bar) is hit.
        // Stepped lines with pointRadius:0 have nothing to hit, so we listen on the
        // canvas directly. Same coordinate math, more reliable.
        if (onRangeClick && granularity !== 'hour') {
            canvas.addEventListener('click', (e) => {
                const rect = canvas.getBoundingClientRect();
                const px = e.clientX - rect.left;
                console.log('[SnapshotChart] click fired, granularity:', granularity, 'px:', px);
                const xScale = chart.scales.x;
                if (!xScale) return;
                const ms = xScale.getValueForPixel(px);
                console.log('[SnapshotChart] ms:', ms, ms ? new Date(ms) : null);
                if (ms == null || isNaN(ms)) return;
                const resolved = this.#resolveClickRange(ms, granularity, start, end);
                console.log('[SnapshotChart] resolved range:', resolved);
                if (!resolved) return;
                onRangeClick(resolved[0], resolved[1]);
            });
        }

        return chart;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaSnapshotChart;
}
