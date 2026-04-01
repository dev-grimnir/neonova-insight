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

        // Create the modal first
        super.createModal(modalHTML).then(() => {
            this.render();
            this.attachListeners();
        }).catch(err => {
            console.error('Failed to show daily modal:', err);
        });
    }

    render() {
        if (!this.modal) {
            console.error('Daily view: this.modal is null in render()');
            return;
        }

        const content = this.modal.querySelector('#daily-content');
        if (!content) {
            console.error('#daily-content not found in render()');
            return;
        }

        content.innerHTML = this.generateEKGHTML();

        if (!this.model.events || this.model.events.length === 0) {
            content.innerHTML += `
                <div class="text-center text-zinc-400 py-20 text-lg">
                    No connection events found for this day.
                </div>`;
            return;
        }

        // Defer chart initialization
        requestAnimationFrame(() => this.initEKGChart());
    }

    generateEKGHTML() {
        return `
            <div class="max-w-6xl mx-auto">
                <h1 class="text-5xl font-bold text-white text-center tracking-tight mb-10">Connection Status – ${this.model.getDateString ? this.model.getDateString() : ''}</h1>
                
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
                    <canvas id="ekgChart" class="w-full h-[520px]"></canvas>
                </div>
            </div>

            <style>
                #daily-content::-webkit-scrollbar { width: 10px; }
                #daily-content::-webkit-scrollbar-track { background: #18181b; }
                #daily-content::-webkit-scrollbar-thumb { background: #10b981; border-radius: 9999px; border: 2px solid #18181b; }
            </style>
        `;
    }

    initEKGChart() {
        console.log('initEKGChart called — events count:', this.model.events ? this.model.events.length : 0);

        const ctx = document.getElementById('ekgChart');
        if (!ctx) {
            console.error('EKG canvas #ekgChart not found!');
            return;
        }

        if (!this.model.events || this.model.events.length === 0) {
            console.warn('No events for chart');
            return;
        }

        const labels = [];
        const dataPoints = [];
        const accent = '#10b981';

        this.model.events.forEach(event => {
            labels.push(event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            dataPoints.push(event.status === 'connected' ? 1 : 0);
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Connection Status',
                    data: dataPoints,
                    borderColor: accent,
                    borderWidth: 3,
                    stepped: 'after',
                    tension: 0,
                    fill: false,
                    pointRadius: 0,
                    segment: {
                        borderColor: ctx => (ctx.p0.parsed.y === 0 ? '#ef4444' : accent)
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false, min: -0.1, max: 1.1 },
                    x: { 
                        grid: { color: '#27272a', lineWidth: 1 },
                        ticks: { color: '#64748b', maxRotation: 45 }
                    }
                },
                layout: { padding: { right: 30 } }
            }
        });
    }

    attachListeners() {
        if (!this.modal) return;

        const closeBtn = this.modal.querySelector('#close-daily-btn');
        const modalEl  = this.modal.querySelector('#daily-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => {
            if (e.target === modalEl) this.hide();
        });
    }
}
