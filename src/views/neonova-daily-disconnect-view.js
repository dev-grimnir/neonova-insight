class NeonovaDailyDisconnectView extends NeonovaBaseModalView {
    constructor(controller, model) {
        super(controller);
        this.model = model;
        this._hasShown = false;
    }

    show() {
        if (this._hasShown) return;
        this._hasShown = true;

        console.log('DailyDisconnectView.show() called');

        const modalHTML = `
            <div id="daily-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10001] opacity-0 transition-opacity duration-400">
                <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                    <!-- Header -->
                    <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                        <div>
                            <div class="text-emerald-400 text-xs font-mono tracking-widest">${this.model.friendlyName || 'User'}</div>
                            <div class="text-3xl font-semibold text-white mt-1">${this.model.getDateString ? this.model.getDateString() : 'Selected Date'}</div>
                        </div>
                        <button id="close-daily-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                            ✕ Close
                        </button>
                    </div>
                    
                    <!-- Content -->
                    <div id="daily-content" class="flex-1 overflow-y-auto p-8 bg-[#18181b]">
                    </div>
                </div>
            </div>
        `;

        super.createModal(modalHTML).then(() => {
            this.render();
            this.attachListeners();
        }).catch(err => console.error('Modal creation failed:', err));
    }

    render() {
        const content = this.modal.querySelector('#daily-content');
        if (!content) return;

        content.innerHTML = this.generateEKGHTML();

        if (!this.model.events || this.model.events.length < 2) {
            content.innerHTML += `<div class="text-center text-zinc-400 py-20 text-lg">No events found.</div>`;
            return;
        }

        requestAnimationFrame(() => this.initEKGChart());
    }

    generateEKGHTML() {
        return `
            <div class="max-w-6xl mx-auto">
                <h1 class="text-5xl font-bold text-white text-center tracking-tight mb-8">Connection Status – ${this.model.getDateString ? this.model.getDateString() : ''}</h1>
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8" style="height: 620px;">
                    <canvas id="ekgChart" class="w-full h-full"></canvas>
                </div>
            </div>
        `;
    }

    initEKGChart() {
        console.log('initEKGChart called — events count:', this.model.events ? this.model.events.length : 0);
    
        const canvas = document.getElementById('ekgChart');
        if (!canvas) {
            console.error('EKG canvas #ekgChart not found!');
            return;
        }
    
        if (!this.model.events || this.model.events.length < 2) return;
    
        // Sort events chronologically
        const sortedEvents = [...this.model.events].sort((a, b) => 
            (a.dateObj || new Date(0)) - (b.dateObj || new Date(0))
        );
    
        if (!sortedEvents[0]?.dateObj) return;
    
        // Full day range (00:00 → 24:00)
        const firstDate = sortedEvents[0].dateObj;
        const dayStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), 0, 0, 0);
        const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
        // === COLLAPSE TO STATUS CHANGES ONLY ===
        // This is the key fix: we only create a data point when the status actually flips.
        // Long connected periods → one single wide green bar.
        // Long offline periods → one single wide red bar.
        // No more 60 tiny overlapping segments making it look like a barcode.
        const chartData = [];
        let prevConnected = null;
    
        sortedEvents.forEach((event, i) => {
            const isConnected = (event.status === 'connected' || event.status === 'Start');
            
            if (i === 0 || isConnected !== prevConnected) {
                chartData.push({
                    x: event.dateObj.getTime(),
                    y: isConnected ? 1 : -1
                });
                prevConnected = isConnected;
            }
        });
    
        // Extend the LAST bar all the way to midnight (so the final period doesn't stop short)
        if (chartData.length > 0) {
            const lastY = chartData[chartData.length - 1].y;
            chartData.push({ x: dayEnd.getTime(), y: lastY });
        }
    
        // Destroy previous chart if modal reopened
        if (this._ekgChartInstance) {
            this._ekgChartInstance.destroy();
        }
    
        this._ekgChartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Modem Status',
                    data: chartData,
                    borderWidth: 4,
                    stepped: 'after',          // true rectangular EKG blocks
                    tension: 0,
                    fill: 'origin',            // fills solidly to the center line
                    pointRadius: 0,
                    segment: {
                        borderColor: (ctx) => (ctx.p0.parsed.y < 0 ? '#ef4444' : '#10b981'),
                        backgroundColor: (ctx) => (ctx.p0.parsed.y < 0 ? '#ef444488' : '#10b98188')
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                const date = new Date(tooltipItems[0].parsed.x);
                                return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                            },
                            label: (ctx) => ctx.parsed.y > 0 ? '✅ Connected' : '❌ Disconnected'
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: dayStart.getTime(),
                        max: dayEnd.getTime(),
                        grid: {
                            color: '#27272a',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#64748b',
                            maxTicksLimit: 24,
                            maxRotation: 0,
                            autoSkip: true,
                            callback: (value) => {
                                const date = new Date(value);
                                return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                            }
                        }
                    },
                    y: {
                        min: -1.2,
                        max: 1.2,
                        ticks: { display: false },
                        grid: {
                            color: (context) => context.tick.value === 0 ? '#a3a3a3' : '#27272a',
                            lineWidth: (context) => context.tick.value === 0 ? 4 : 1.5   // thick EKG centerline
                        }
                    }
                },
                layout: {
                    padding: { right: 40, left: 20, top: 30, bottom: 20 }
                }
            }
        });
    }
    
    attachListeners() {
        const closeBtn = this.modal.querySelector('#close-daily-btn');
        const modalEl  = this.modal.querySelector('#daily-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => {
            if (e.target === modalEl) this.hide();
        });
    }
}
