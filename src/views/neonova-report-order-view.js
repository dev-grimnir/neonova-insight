class NeonovaReportOrderView extends BaseNeonovaView {
    constructor(container, username, friendlyName) {
        super(container);
        this.username = username;
        this.friendlyName = friendlyName || username;
    }

    showModal() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 400ms ease;
        `;

        const modal = document.createElement('div');
        modal.classList.add('neonova-modal');
        modal.style.cssText = `
            background: #18181b; border: 1px solid #27272a; border-radius: 24px;
            width: 820px; max-width: 92vw; max-height: 92vh;
            overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
            display: flex; flex-direction: column;
            transform: translateX(60px); opacity: 0; transition: all 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(modal);

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 32px; border-bottom: 1px solid #27272a;
            background: #09090b; flex-shrink: 0;
            display: flex; align-items: center; justify-content: space-between;
        `;
        header.innerHTML = `
            <div>
                <div class="text-emerald-400 text-xs font-mono tracking-widest">GENERATE REPORT</div>
                <div class="text-2xl font-semibold text-white mt-1">${this.friendlyName}</div>
            </div>
            <button class="close-btn px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                <i class="fas fa-times"></i> Close
            </button>
        `;
        modal.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.style.cssText = `flex: 1; overflow-y: auto; padding: 32px 40px; background: #18181b;`;
        modal.appendChild(content);

        this.container = content;
        this.render();
        this.attachListeners();

        // Close with animation
        const close = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'translateX(60px)';
            modal.style.opacity = '0';
            setTimeout(() => overlay.remove(), 500);
        }

        header.querySelector('.close-btn').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        // Trigger entrance animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'translateX(0)';
            modal.style.opacity = '1';
        });
    }

        
    close () {
        overlay.style.opacity = '0';
        modal.style.transform = 'translateX(60px)';
        modal.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
    }

    render() {
        if (!this.container) {
            return;
        }

        this.container.innerHTML = `
            <div class="p-6 space-y-8">
                <h2 class="text-3xl font-bold mb-8 text-white" 
                    style="text-shadow: 0 0 25px ${this.theme.accentColor};">
                    Generate Report for ${this.friendlyName}
                </h2>

                <!-- Quick Presets -->
                <div class="flex flex-wrap gap-3">
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="1">
                        <i class="fas fa-calendar-day"></i> Last 1 day
                    </button>
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="2">
                        <i class="fas fa-calendar-day"></i> Last 2 days
                    </button>
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="3">
                        <i class="fas fa-calendar-day"></i> Last 3 days
                    </button>    
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="7">
                        <i class="fas fa-calendar-week"></i> Last 7 days
                    </button>
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="30">
                        <i class="fas fa-calendar"></i> Last 30 days
                    </button>
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="90">
                        <i class="fas fa-calendar-alt"></i> Last 90 days
                    </button>
                </div>

                <!-- Custom Date Range -->
                <div class="grid grid-cols-2 gap-8">
                    <div>
                        <label class="block text-xs uppercase tracking-widest text-zinc-500 mb-3">Start Date</label>
                        <div class="grid grid-cols-3 gap-3">
                            <select id="start-year" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="start-month" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="start-day" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs uppercase tracking-widest text-zinc-500 mb-3">End Date</label>
                        <div class="grid grid-cols-3 gap-3">
                            <select id="end-year" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="end-month" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="end-day" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                        </div>
                    </div>
                </div>

                <button id="generate-custom" class="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-4 rounded-2xl transition text-lg">
                    Generate Report
                </button>
            </div>
        `;

        // Populate dropdowns
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const populateYears = (select, defaultYear) => {
            if (!select) return;
            select.innerHTML = '';

            const prevYear = currentYear - 1;
            const years = [prevYear, currentYear];

            years.forEach(y => {
                const opt = new Option(y, y);
                if (y === defaultYear) {
                    opt.selected = true;
                }
                select.add(opt);
            });
        };

        const populateMonths = (select, defaultMonth) => {
            if (!select) return;
            select.innerHTML = '';
            for (let m = 1; m <= 12; m++) {
                const name = new Date(2000, m-1, 1).toLocaleString('default', { month: 'long' });
                const opt = new Option(name, m.toString().padStart(2, '0'));
                select.add(opt);
            }
            select.value = defaultMonth.toString().padStart(2, '0');
        };

        const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();

        const populateDays = (select, year, month, defaultDay) => {
            if (!select) return;
            select.innerHTML = '';
            const days = getDaysInMonth(year, month);
            for (let d = 1; d <= days; d++) {
                const opt = new Option(d, d.toString().padStart(2, '0'));
                select.add(opt);
            }
            select.value = Math.min(defaultDay, days).toString().padStart(2, '0');
        };

        // Calculate defaults
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const defaultStartYear = oneYearAgo.getFullYear();
        const defaultStartMonth = oneYearAgo.getMonth() + 1;
        let defaultStartDay = oneYearAgo.getDate();  // Will be clamped below if needed

        // Start date = exactly one year ago (clamped)
        const sy = this.container.querySelector('#start-year');
        const sm = this.container.querySelector('#start-month');
        const sd = this.container.querySelector('#start-day');
        if (sy) populateYears(sy, defaultStartYear);
        if (sm) populateMonths(sm, defaultStartMonth);
        if (sd) populateDays(sd, defaultStartYear, defaultStartMonth, defaultStartDay);

        // End date = today
        const ey = this.container.querySelector('#end-year');
        const em = this.container.querySelector('#end-month');
        const ed = this.container.querySelector('#end-day');
        if (ey) populateYears(ey, currentYear);
        if (em) populateMonths(em, currentMonth);
        if (ed) populateDays(ed, currentYear, currentMonth, currentDay);

        // Listeners (unchanged)
        const updateDays = (dayId, yearId, monthId) => {
            const y = this.container.querySelector(`#${yearId}`);
            const m = this.container.querySelector(`#${monthId}`);
            const d = this.container.querySelector(`#${dayId}`);
            if (!y || !m || !d) return;
            populateDays(d, parseInt(y.value), parseInt(m.value), parseInt(d.value) || 1);
        };

        sy?.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month'));
        sm?.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month'));
        ey?.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month'));
        em?.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month'));
    }

    close() {
        // Find the overlay (assuming it's the fixed inset:0 div created in showModal)
        const overlay = document.querySelector('div[style*="position: fixed; inset: 0"]');
        if (!overlay) return;  // Safety: no overlay found
    
        const modal = overlay.querySelector('.neonova-modal');
        if (!modal) return;
    
        // Trigger the same exit animation as in the close handler
        overlay.style.opacity = '0';
        modal.style.transform = 'translateX(60px)';
        modal.style.opacity = '0';
    
        // Remove from DOM after animation completes
        setTimeout(() => {
            overlay.remove();
        }, 500);  // Matches your transition duration
    }
    
    attachListeners() {
        // Quick preset buttons — dispatch constant
        this.container.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const days = btn.dataset.days;  // "1", "2", "3", "7", "30", "90"
                const constant = `${days}_DAYS`;  // e.g. "7_DAYS"
                this.dispatchEvent(new CustomEvent('quickReportRequested', {
                    detail: { timeframe: constant }
                }));
            });
        });
    
        // Custom generate button — dispatch raw ISO strings
        const genBtn = this.container.querySelector('#generate-custom');
        if (genBtn) genBtn.addEventListener('click', () => {
            const startY = parseInt(this.container.querySelector('#start-year')?.value);
            const startM = parseInt(this.container.querySelector('#start-month')?.value) - 1;
            const startD = parseInt(this.container.querySelector('#start-day')?.value);
            const start = new Date(startY, startM, startD);
    
            const endY = parseInt(this.container.querySelector('#end-year')?.value);
            const endM = parseInt(this.container.querySelector('#end-month')?.value) - 1;
            const endD = parseInt(this.container.querySelector('#end-day')?.value);
            const end = new Date(endY, endM, endD);
            end.setHours(23, 59, 59, 999);
    
            if (start > end) {
                alert('Start date must be before end date.');
                return;
            }
    
            this.dispatchEvent(new CustomEvent('customReportRequested', {
                detail: {
                    startIso: start.toISOString(),
                    endIso: end.toISOString()
                }
            }));
        });
    }
}
