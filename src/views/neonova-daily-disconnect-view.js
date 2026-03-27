class NeonovaDailyDisconnectView extends NeonovaBaseModalView {
    constructor(controller, model) {
        super(controller);
        this.model = model;
    }

    show() {
        console.log('📋 DailyDisconnectView.show() called');
        const modalHTML = `
            <div id="daily-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10001] opacity-0 transition-opacity duration-400">
                <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                    <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                        <div>
                            <div class="text-emerald-400 text-xs font-mono tracking-widest">${this.model.friendlyName}</div>
                            <div class="text-3xl font-semibold text-white mt-1">${this.model.getDateString()}</div>
                        </div>
                        <button id="close-daily-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                    <div id="daily-content" class="flex-1 overflow-y-auto p-8 bg-[#18181b]">
                    </div>
                </div>
            </div>
        `;

        super.createModal(modalHTML);
        this.onModalReady();
    }

    onModalReady() {
        this.render();
        this.attachListeners();
    }

    render() {
        const content = this.modal.querySelector('#daily-content');
        if (!content) {
            console.error('❌ #daily-content not found');
            return;
        }

        content.innerHTML = this.generateEKGHTML();

        if (!this.model.events || this.model.events.length === 0) {
            content.innerHTML += `
                <div class="text-center text-zinc-400 py-20 text-lg">
                    No connection events found for this day.<br>
                    (The main report showed ${this.model.events ? '0' : '?'} events)
                </div>`;
            return;
        }

        requestAnimationFrame(() => this.initEKGChart());
    }

    generateEKGHTML() {
        return `
            <div class="max-w-6xl mx-auto">
                <h1 class="text-5xl font-bold text-white text-center tracking-tight">Connection Status – ${this.model.getDateString()}</h1>
                <div class="mt-12 bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
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
        console.log('🎨 initEKGChart called — events count:', this.model.events.length);

        const ctx = document.getElementById('ekgChart');
        if (!ctx) {
            console.error('❌ EKG canvas not found!');
            return;
        }

        if (this.model.events.length === 0) {
            console.warn('⚠️ No events in model — chart will be empty');
            // You can optionally show a message on the canvas here later
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
                labels: labels.length ? labels : Array(24).fill('00:00'),
                datasets: [{
                    label: 'Connection Status',
                    data: dataPoints.length ? dataPoints : Array(24).fill(1),
                    borderColor: accent,
                    borderWidth: 3,
                    stepped: 'after',
                    tension: 0,
                    fill: false,
                    pointRadius: 0,
                    segment: { borderColor: ctx => (ctx.p0.parsed.y === 0 ? '#ef4444' : accent) }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false, min: -0.1, max: 1.1 },
                    x: { grid: { color: '#27272a', lineWidth: 1 }, ticks: { color: '#64748b', maxRotation: 45 } }
                },
                layout: { padding: { right: 30 } }
            }
        });
    }

    attachListeners() {
        const closeBtn = this.modal.querySelector('#close-daily-btn');
        const modalEl  = this.modal.querySelector('#daily-modal');
        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => { if (e.target === modalEl) this.hide(); });
    }
}
