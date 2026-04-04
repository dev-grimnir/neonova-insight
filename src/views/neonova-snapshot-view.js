class NeonovaSnapshotView extends NeonovaBaseModalView {
    #hasShown = null;
    #snapshotChartInstance = null;
    constructor(controller, model) {
        super(controller);
        this.model = model;
        this.#hasShown = false;
        this.#snapshotChartInstance = null;
    }

    show() {
        if (this.#hasShown) return;
        this.#hasShown = true;
    
        console.log('=== NeonovaSnapshotView.show() START ===');
    
        const modalHTML = `
            <div id="snapshot-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10001] opacity-0 transition-opacity duration-400">
                <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                    <!-- Header -->
                    <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                        <div>
                            <div class="text-emerald-400 text-xs font-mono tracking-widest">${this.model.friendlyName || 'Customer'} — Connection Timeline</div>
                            <div class="text-3xl font-semibold text-white mt-1">${this.model.getDateRangeString()}</div>
                            <div class="text-lg font-medium text-emerald-400 mt-1">
                                Uptime: ${this.model.getUptimePercent()}%
                            </div>
                        </div>
                        <button id="close-snapshot-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                            ✕ Close
                        </button>
                    </div>
                    
                    <!-- Content -->
                    <div id="snapshot-content" class="flex-1 overflow-y-auto p-8 bg-[#18181b]">
                    </div>
                </div>
            </div>
        `;
    
        super.createModal(modalHTML).then(() => {
            console.log('createModal resolved successfully');
    
            this.render();
            this.attachListeners();
    
            // Ensure modal is visible + give layout time before charting
            const modalOverlay = this.modal.querySelector('#snapshot-modal');
            if (modalOverlay) {
                modalOverlay.style.opacity = '1';
                modalOverlay.style.transform = 'scale(1)';
            }
    
            setTimeout(() => {
                this.initSnapshotChart();
            }, 150);
    
        }).catch(err => {
            console.error('Snapshot modal creation failed:', err);
        });
    }

    render() {
        const content = this.modal?.querySelector('#snapshot-content');
        if (!content) {
            console.error('#snapshot-content not found in modal!');
            return;
        }
    
        content.innerHTML = this.generateSnapshotHTML();
    
        if (!this.model.events || this.model.events.length < 2) {
            content.innerHTML += `<div class="text-center text-zinc-400 py-20 text-lg">No connection events found for this period.</div>`;
        } else {
            console.log(`Rendered chart container with ${this.model.events.length} events`);
        }
    }

    generateSnapshotHTML() {
        const days = Math.ceil((this.model.endDate - this.model.startDate) / (1000 * 60 * 60 * 24));
        const height = Math.max(620, 500 + days * 20); // scale a bit for longer periods
        return `
            <div class="max-w-6xl mx-auto">
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8" style="height: 620px; min-height: 620px;">
                    <canvas id="snapshotChart" class="w-full h-full"></canvas>
                </div>
            </div>
            <style>
                #snapshot-content::-webkit-scrollbar { width: 7px; }
                #snapshot-content::-webkit-scrollbar-track { background: #18181b; border-radius: 9999px; }
                #snapshot-content::-webkit-scrollbar-thumb { background: #34d399; border-radius: 9999px; border: 2px solid #18181b; }
                #snapshot-content::-webkit-scrollbar-thumb:hover { background: #10b981; }
                #snapshot-content { scrollbar-width: thin; scrollbar-color: #34d399 #18181b; }
            </style>
        `;
    }

    initSnapshotChart() {
        const canvas = document.getElementById('snapshotChart');
        if (!canvas) return;
    
        const sortedEvents = [...this.model.events].sort((a, b) => 
            (a.dateObj || new Date(0)) - (b.dateObj || new Date(0))
        );
    
        const startTime = this.model.startDate.getTime();
        const endTime   = this.model.endDate.getTime();

        // Build periods FIRST — single source of truth for tooltip
        const periods = [];
        let i = 0;
        while (i < sortedEvents.length) {
            const isConnected = (sortedEvents[i].status === 'Start' || sortedEvents[i].status === 'connected');
            const startMs = sortedEvents[i].dateObj.getTime();
        
            let j = i + 1;
            while (j < sortedEvents.length &&
                   (sortedEvents[j].status === 'Start' || sortedEvents[j].status === 'connected') === isConnected) {
                j++;
            }
        
            const endMs = j < sortedEvents.length
                ? sortedEvents[j].dateObj.getTime() - 1
                : endTime;
        
            periods.push({ startMs, endMs, isConnected });
            i = j;
        }
        this._periods = periods;

        // Build chart points from periods (two points each = no diagonals)
        const rawPeriods = [];
        periods.forEach(p => {
            const y = p.isConnected ? 1 : -1;
            rawPeriods.push({ x: p.startMs, y });
            rawPeriods.push({ x: p.endMs,   y });
        });
    
        if (this.#snapshotChartInstance) this.#snapshotChartInstance.destroy();
    
        this.#snapshotChartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Connected',
                        data: rawPeriods.map(pt => ({ x: pt.x, y: pt.y > 0 ? 1 : 0 })),
                        borderColor: '#10b981',
                        backgroundColor: '#10b98188',
                        borderWidth: 0,
                        stepped: 'after',
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
                        stepped: 'after',
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
                                    // Only process one dataset — skip the zero-value hit entirely
                                    if (ctx.parsed.y === 0) return null;
                        
                                    const currentX = ctx.parsed.x;
                                    const period = this._periods.find(p => currentX >= p.startMs && currentX <= p.endMs);
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
                                },
                                // Filter out null returns (the zero-value dataset hit)
                                afterLabel: () => null
                            }
                        }
                },
                scales: {
                    x: { type: 'linear', min: startTime, max: endTime, grid: { color: '#27272a' }, ticks: { color: '#64748b', maxTicksLimit: 5, callback: v => new Date(v).toLocaleDateString('en-US', {month:'short', day:'numeric'}) }},
                    y: { min: -1.2, max: 1.2, ticks: { display: false }, grid: { color: ctx => ctx.tick.value === 0 ? '#a3a3a3' : '#27272a', lineWidth: ctx => ctx.tick.value === 0 ? 4 : 1.5 }}
                },
                layout: { padding: { right: 40, left: 20, top: 30, bottom: 20 } }
            }
        });
    
        setTimeout(() => this.#snapshotChartInstance?.resize(), 100);
    }
    
    attachListeners() {
        const closeBtn = this.modal.querySelector('#close-snapshot-btn');
        const modalEl  = this.modal.querySelector('#snapshot-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => {
            if (e.target === modalEl) this.hide();
        });
    }

    hide() {
        if (this.#snapshotChartInstance) {
            this.#snapshotChartInstance.destroy();
            this.#snapshotChartInstance = null;
        }
        super.hide();
    }
}
