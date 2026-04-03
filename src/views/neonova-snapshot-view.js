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
        console.log('=== NeonovaSnapshotView.show() START ===');

        super.createModal(modalHTML).then(() => {
            console.log('createModal resolved successfully. this.modal =', this.modal ? 'exists' : 'MISSING');
            console.log('Modal outerHTML snippet:', this.modal ? this.modal.outerHTML.substring(0, 300) : 'no modal');
            this.render();
            this.attachListeners();
        }).catch(err => console.error('Snapshot modal creation failed:', err));
        
        if (this.#hasShown) return;
        this.#hasShown = true;

        console.log('Creating modal with HTML length:', this.modalHTML ? this.modalHTML.length : 'no html var');

        console.log('NeonovaSnapshotView.show() called');

        const modalHTML = `
            <div id="snapshot-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10001] opacity-0 transition-opacity duration-400">
                <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                    <!-- Header -->
                    <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                        <div>
                            <div class="text-emerald-400 text-xs font-mono tracking-widest">${this.model.friendlyName || 'Customer'}</div>
                            <div class="text-3xl font-semibold text-white mt-1">${this.model.getDateRangeString()}</div>
                            <div class="text-2xl font-medium text-emerald-400 mt-1">
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
    }

    render() {
        const content = this.modal.querySelector('#snapshot-content');
        if (!content) return;

        content.innerHTML = this.generateSnapshotHTML();

        const debugEl = content.querySelector('#debug-info');
        if (debugEl) debugEl.textContent = `Events: ${this.model.events?.length || 0} | Start: ${this.model.startDate} | End: ${this.model.endDate}`;
        
        if (!this.model.events || this.model.events.length < 2) {
            content.innerHTML += `<div class="text-center text-zinc-400 py-20 text-lg">No connection events found for this period.</div>`;
            return;
        }

        requestAnimationFrame(() => this.initSnapshotChart());
    }

    generateSnapshotHTML() {
        const days = Math.ceil((this.model.endDate - this.model.startDate) / (1000 * 60 * 60 * 24));
        const height = Math.max(620, 500 + days * 20); // scale a bit for longer periods

        return `
                <div class="max-w-6xl mx-auto">
                    <h1 class="text-5xl font-bold text-white text-center tracking-tight mb-8">
                        Connection Timeline – ${this.model.getDateRangeString()}
                    </h1>
                    <div id="chart-container" class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8" style="height: 620px;">
                        <canvas id="snapshotChart" class="w-full h-full"></canvas>
                    </div>
                    <div id="debug-info" class="text-xs text-zinc-500 mt-4 text-center"></div>
                </div>
            `;
    }

    initSnapshotChart() {
        console.log('initSnapshotChart called — events count:', this.model.events ? this.model.events.length : 0);
    
        const canvas = document.getElementById('snapshotChart');
        if (!canvas) {
            console.error('Snapshot canvas #snapshotChart not found!');
            return;
        }
    
        if (!this.model.events || this.model.events.length < 2) {
            console.warn('Not enough events for snapshot chart');
            return;
        }
    
        // === CRITICAL: Wait for Chart.js to be available ===
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded yet. Retrying in 100ms...');
            setTimeout(() => this.initSnapshotChart(), 100);
            return;
        }
    
        // Rest of your chart code stays the same...
        const sortedEvents = [...this.model.events].sort((a, b) => 
            (a.dateObj || new Date(0)) - (b.dateObj || new Date(0))
        );
    
        if (!sortedEvents[0]?.dateObj) return;
    
        const startTime = this.model.startDate.getTime();
        const endTime   = this.model.endDate.getTime() + 86399999; // end of last day
    
        const rawPeriods = [];
        let i = 0;
        while (i < sortedEvents.length) {
            const isConnected = (sortedEvents[i].status === 'Start' || sortedEvents[i].status === 'connected');
            const startMs = sortedEvents[i].dateObj.getTime();
    
            let j = i + 1;
            while (j < sortedEvents.length && 
                   (sortedEvents[j].status === 'Start' || sortedEvents[j].status === 'connected') === isConnected) {
                j++;
            }
    
            rawPeriods.push({ x: startMs, y: isConnected ? 1 : -1 });
            i = j;
        }
    
        if (rawPeriods.length > 0) {
            rawPeriods.push({ x: endTime, y: rawPeriods[rawPeriods.length - 1].y });
        }
    
        const chartData = [...rawPeriods];
    
        if (chartData.length > 0) {
            chartData.unshift({ x: startTime, y: chartData[0].y });
        }
    
        if (this.#snapshotChartInstance) this.#snapshotChartInstance.destroy();
    
        this.#snapshotChartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Connected',
                        data: chartData.map(pt => ({ x: pt.x, y: pt.y > 0 ? 1 : 0 })),
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
                        data: chartData.map(pt => ({ x: pt.x, y: pt.y < 0 ? -1 : 0 })),
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
                            label: (context) => {
                                if (context.parsed.y === 0) return '';
                                const isConnected = context.parsed.y > 0;
                                const currentX = context.parsed.x;
                                const datasetData = context.dataset.data;
    
                                let startX = startTime;
                                for (let idx = 0; idx < datasetData.length; idx++) {
                                    if (datasetData[idx].x >= currentX) {
                                        if (idx > 0) startX = datasetData[idx - 1].x;
                                        break;
                                    }
                                }
    
                                const startStr = new Date(startX).toLocaleString([], { 
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                                });
                                const endStr = new Date(currentX).toLocaleString([], { 
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                                });
    
                                const durMs = currentX - startX;
                                const hours = Math.floor(durMs / 3600000);
                                const mins = Math.floor((durMs % 3600000) / 60000);
                                const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
                                return `${isConnected ? 'Connected' : 'Disconnected'} — ${startStr} to ${endStr} (${durationStr})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: startTime,
                        max: endTime,
                        grid: { color: '#27272a', lineWidth: 1 },
                        ticks: {
                            color: '#64748b',
                            maxTicksLimit: 12,
                            callback: (v) => new Date(v).toLocaleDateString([], {month:'short', day:'numeric'})
                        }
                    },
                    y: {
                        min: -1.2,
                        max: 1.2,
                        ticks: { display: false },
                        grid: {
                            color: (ctx) => ctx.tick.value === 0 ? '#a3a3a3' : '#27272a',
                            lineWidth: (ctx) => ctx.tick.value === 0 ? 4 : 1.5
                        }
                    }
                },
                layout: { padding: { right: 40, left: 20, top: 30, bottom: 20 } }
            }
        });
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
