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

        console.log('DailyDisconnectView: calling super.createModal...');

        super.createModal(modalHTML)
            .then(() => {
                console.log('DailyDisconnectView: createModal Promise RESOLVED → calling render()');
                this.render();
                this.attachListeners();
            })
            .catch(err => {
                console.error('DailyDisconnectView: createModal Promise REJECTED:', err);
            });
    }

    render() {
        console.log('DailyDisconnectView.render() started');

        if (!this.modal) {
            console.error('Daily view: this.modal is null in render()');
            return;
        }

        const content = this.modal.querySelector('#daily-content');
        if (!content) {
            console.error('#daily-content not found in render()');
            return;
        }

        console.log('DailyDisconnectView: populating #daily-content');
        content.innerHTML = this.generateEKGHTML();

        if (!this.model.events || this.model.events.length === 0) {
            console.log('No events → showing empty message');
            content.innerHTML += `
                <div class="text-center text-zinc-400 py-20 text-lg">
                    No connection events found for this day.
                </div>`;
            return;
        }

        console.log(`Rendering chart with ${this.model.events.length} events`);
        requestAnimationFrame(() => this.initEKGChart());
    }

    initEKGChart() {
        console.log('initEKGChart called — events count:', this.model.events ? this.model.events.length : 0);

        const ctx = document.getElementById('ekgChart');
        if (!ctx) {
            console.error('EKG canvas #ekgChart not found!');
            return;
        }

        if (!this.model.events || this.model.events.length < 2) return;

        const labels = [];
        const durations = [];
        const colors = [];

        // Build real duration between consecutive status changes
        for (let i = 0; i < this.model.events.length - 1; i++) {
            const start = this.model.events[i].dateObj.getTime();
            const end   = this.model.events[i + 1].dateObj.getTime();
            const minutes = Math.max(1, Math.round((end - start) / 60000));

            const isConnected = this.model.events[i].status === 'connected' || 
                                this.model.events[i].status === 'Start';

            labels.push(this.model.events[i].dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            durations.push(isConnected ? minutes : -minutes);   // positive = above line, negative = below line
            colors.push(isConnected ? '#10b98188' : '#ef444488');
        }

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Duration (minutes)',
                    data: durations,
                    backgroundColor: colors,
                    borderColor: '#ffffff22',
                    borderWidth: 1,
                    barThickness: 28
                }]
            },
            options: {
                indexAxis: 'y',                    // ← makes the chart horizontal
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false } 
                },
                scales: {
                    x: {
                        position: 'center',
                        min: -180,
                        max: 180,
                        grid: { color: '#27272a' },
                        ticks: { 
                            color: '#64748b',
                            callback: v => Math.abs(v) + 'm'
                        }
                    },
                    y: {
                        grid: { color: '#27272a', lineWidth: 1 },
                        ticks: { color: '#64748b' }
                    }
                },
                layout: { 
                    padding: { left: 20, right: 40, top: 20, bottom: 20 } 
                }
            }
        });
    }
    
    attachListeners() {
        console.log('DailyDisconnectView: attaching listeners');
        if (!this.modal) return;

        const closeBtn = this.modal.querySelector('#close-daily-btn');
        const modalEl  = this.modal.querySelector('#daily-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => {
            if (e.target === modalEl) this.hide();
        });
    }
}
