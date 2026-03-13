class NeonovaDashboardView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.isMinimized = true;
        this.createElements();
    }

    getHeaderHTML(isMinimized) {
        const actionText = isMinimized ? 'Maximize' : 'Minimize';
        const actionIcon = isMinimized ? 'fa-chevron-up' : 'fa-minus';
        const pollIcon = this.controller.model.isPollingPaused ? 'fa-play' : 'fa-pause';
        const pollText = this.controller.model.isPollingPaused ? 'Resume' : 'Pause';
        const interval = this.controller.model.pollingIntervalMinutes;
        const pollIdSuffix = isMinimized ? '-bar' : '';
        const addIdSuffix = isMinimized ? '-bar' : '';
        const minIdSuffix = isMinimized ? '-bar' : '';
        const tooltipIdSuffix = isMinimized ? '-bar' : '';

        return `
            <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 shrink-0 relative z-10">
                <div class="flex items-center gap-4">
                    <img src="https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/assets/nova-subscriber-logo.png" 
                         alt="Nova Subscriber" class="h-10 w-auto">
                </div>

                <div class="flex items-center gap-4">
                    <!-- Polling control (button + hover slider) -->
                    <div class="relative group/polling">
                        <button id="poll-toggle-btn${pollIdSuffix}" 
                                class="min-w-[180px] px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-2xl flex items-center justify-center gap-2.5 transition-all border border-zinc-700">
                            <i class="fas ${pollIcon} text-emerald-400"></i>
                            <span>${pollText} Polling</span>
                            <span class="text-emerald-400/80 text-sm font-mono">· ${interval} min</span>
                        </button>

                        <!-- Slider tooltip on hover -->
                        <div class="poll-slider-tooltip absolute left-1/2 -translate-x-1/2 top-full mt-3 hidden group-hover/polling:block z-20 pointer-events-auto">
                            <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl w-80">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs uppercase tracking-widest text-zinc-400">Polling Interval</span>
                                    <span id="interval-value-tooltip${tooltipIdSuffix}" class="font-mono text-emerald-400">${interval} min</span>
                                </div>
                                <input type="range" id="polling-interval-slider-tooltip${tooltipIdSuffix}" 
                                       min="1" max="60" value="${interval}" 
                                       class="w-full accent-emerald-500 cursor-pointer">
                            </div>
                            <!-- Arrow -->
                            <div class="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-zinc-900 border-l border-t border-zinc-700 rotate-45"></div>
                        </div>
                    </div>

                    <button class="refresh-btn px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl flex items-center gap-2 transition shadow-sm">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>

                    <button id="add-customer-btn${addIdSuffix}" 
                            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl flex items-center gap-2 transition shadow-sm">
                        Add Customer
                    </button>

                    <button id="minimize-btn${minIdSuffix}" 
                            class="minimize-btn px-5 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition border border-zinc-700">
                        <i class="fas ${actionIcon}"></i> ${actionText}
                    </button>
                </div>
            </div>
        `;
    }

    createElements() {
        // Minimized bar – now contains the FULL header with all buttons (exactly like the maximized header)
        this.minimizeBar = document.createElement('div');
        this.minimizeBar.classList.add('minimizeBar');
        this.minimizeBar.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 92%;
            max-width: 1100px;
            background: #18181b;
            color: white;
            padding: 0;
            border-radius: 24px 24px 0 0;
            cursor: pointer;
            z-index: 10000;
            font-family: system-ui;
            box-shadow: 0 -12px 40px rgba(0,0,0,0.8);
            border: 1px solid #22ff88;
            border-bottom: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
        `;

                // Initial state
        this.minimizeBar.style.display = 'flex';
        this.panel.style.display = 'none';

        this.minimizeBar.innerHTML = this.getHeaderHTML(true);
        this.minimizeBar.addEventListener('click', (e) => {
            // Prevent clicks on buttons from triggering the whole-bar toggle
            if (!e.target.closest('button')) {
                this.toggleMinimize();
            }
        });
        document.body.appendChild(this.minimizeBar);

        // Panel (maximized view) – now reuses the same header via getHeaderHTML(false)
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed; 
            top: 60px; 
            left: 50%; 
            transform: translateX(-50%);
            width: 92%; 
            max-width: 1100px; 
            height: calc(100vh - 80px);
            background: #09090b; 
            border: 1px solid #27272a;
            border-radius: 24px; 
            box-shadow: 0 8px 40px rgba(0,0,0,0.8);
            padding: 0; 
            font-family: system-ui; 
            z-index: 9999; 
            display: none;
            overflow: hidden;  
            transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;
        document.body.appendChild(this.panel);

        // Initial state
        this.minimizeBar.style.display = 'block';
        this.panel.style.display = 'none';

        // Beautiful emerald scrollbar
        if (!document.getElementById('neonova-scroll-style')) {
            const style = document.createElement('style');
            style.id = 'neonova-scroll-style';
            style.innerHTML = `
                .neonova-scroll::-webkit-scrollbar { width: 7px; }
                .neonova-scroll::-webkit-scrollbar-track { background: #18181b; border-radius: 9999px; }
                .neonova-scroll::-webkit-scrollbar-thumb { background: #34d399; border-radius: 9999px; border: 2px solid #18181b; }
                .neonova-scroll::-webkit-scrollbar-thumb:hover { background: #10b981; }
                .neonova-scroll { scrollbar-width: thin; scrollbar-color: #34d399 #18181b; }
                /* Minimized bar tooltip: pops UP instead of down + arrow fix */
                .minimizeBar .poll-slider-tooltip {
                    top: auto !important;
                    bottom: 100% !important;
                    margin-top: 0 !important;
                    margin-bottom: 12px !important;
                }
                .minimizeBar .poll-slider-tooltip > div:last-child {
                    top: auto !important;
                    bottom: -8px !important;
                    transform: rotate(225deg) !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Attach listeners to the minimize bar (once, since it is never rebuilt)
        this.attachMinimizeBarListeners();

        this.render();
    }

    attachMinimizeBarListeners() {
        // Polling toggle
        const barPollBtn = this.minimizeBar.querySelector('#poll-toggle-btn-bar');
        if (barPollBtn) {
            barPollBtn.addEventListener('click', () => {
                this.controller.togglePolling();
                this.updatePollingButton(barPollBtn);
            });
        }

        // Slider in tooltip (bar version)
        const sliderBar = this.minimizeBar.querySelector('#polling-interval-slider-tooltip-bar');
        const intervalDisplayBar = this.minimizeBar.querySelector('#interval-value-tooltip-bar');
        if (sliderBar && intervalDisplayBar) {
            sliderBar.addEventListener('input', () => {
                const minutes = parseInt(sliderBar.value);
                intervalDisplayBar.textContent = `${minutes} min`;
                this.controller.setPollingInterval(minutes);

                const mainSpan = barPollBtn?.querySelector('span.text-emerald-400\\/80');
                if (mainSpan) mainSpan.textContent = `· ${minutes} min`;
            });
        }

        // Refresh
        this.minimizeBar.querySelector('.refresh-btn')?.addEventListener('click', () => this.controller.poll());

        // Add customer
        this.minimizeBar.querySelector('#add-customer-btn-bar')?.addEventListener('click', () => {
            const addController = new NeonovaAddCustomerController(this.controller);
            addController.show();
        });

        // Minimize / Maximize
        this.minimizeBar.querySelector('#minimize-btn-bar')?.addEventListener('click', () => this.toggleMinimize());
    }

    updatePollingButton(btn) {
        if (!btn) return;
        const icon = btn.querySelector('i');
        const textSpan = btn.querySelector('span:not(.text-emerald-400\\/80)');
        const intervalSpan = btn.querySelector('span.text-emerald-400\\/80');

        if (this.controller.model.isPollingPaused) {
            icon.className = 'fas fa-play text-emerald-400';
            textSpan.textContent = 'Resume Polling';
        } else {
            icon.className = 'fas fa-pause text-emerald-400';
            textSpan.textContent = 'Pause Polling';
        }

        if (intervalSpan) {
            intervalSpan.textContent = `· ${this.controller.model.pollingIntervalMinutes} min`;
        }
    }

    updateMinimizeBar() {
        const barPollBtn = this.minimizeBar.querySelector('#poll-toggle-btn-bar');
        if (barPollBtn) {
            this.updatePollingButton(barPollBtn);
        }
        const sliderBar = this.minimizeBar.querySelector('#polling-interval-slider-tooltip-bar');
        if (sliderBar) {
            sliderBar.value = this.controller.model.pollingIntervalMinutes;
        }
    }

    render() {
        if (!this.panel) {
            console.warn('Panel not ready yet');
            return;
        }

        const scrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

        let rows = '';
        this.controller.model.customers.forEach(c => {
            const isConnected = c.status === 'Connected';
            const durationText = c.getDurationStr ? c.getDurationStr() : '0s';
            rows += `
                <tr class="hover:bg-zinc-800 transition group">
                    <td class="friendly-name px-6 py-4 font-medium text-zinc-100" data-username="${c.radiusUsername}" data-editable="false">
                        ${c.friendlyName || c.radiusUsername}
                    </td>
                    <td class="px-6 py-4 font-mono text-zinc-400">${c.radiusUsername}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-2xl text-xs font-semibold ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} text-white">
                            <span class="w-2 h-2 rounded-full bg-current"></span>
                            ${c.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-mono ${isConnected ? 'text-emerald-400' : 'text-red-400'}">
                        ${durationText}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="remove-btn text-zinc-400 hover:text-red-400 px-3 py-1 text-sm" data-username="${c.radiusUsername}">Remove</button>
                        <button class="report-btn ml-3 bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-2xl text-xs font-medium text-white" data-username="${c.radiusUsername}">Report</button>
                    </td>
                </tr>
            `;
        });

        this.panel.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- HEADER – reused from getHeaderHTML -->
                ${this.getHeaderHTML(false)}

                <!-- MAIN CONTENT AREA -->
                <div class="flex-1 overflow-hidden flex flex-col">
                    <div class="flex-1 overflow-y-auto px-6 py-6 neonova-scroll">
                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden h-full">
                            <table class="w-full">
                                <thead class="sticky top-0 bg-zinc-900 z-10">
                                    <tr class="border-b border-zinc-800 text-xs uppercase tracking-widest text-zinc-500">
                                        <th class="px-6 py-4 text-left">Friendly Name</th>
                                        <th class="px-6 py-4 text-left">RADIUS Username</th>
                                        <th class="px-6 py-4 text-left">Status</th>
                                        <th class="px-6 py-4 text-left">Duration</th>
                                        <th class="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Restore scroll
        const newScrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        if (newScrollContainer) newScrollContainer.scrollTop = savedScrollTop;

        // Attach / re-attach panel listeners (panel is rebuilt every render)
        this.attachPanelListeners();

        // Keep the minimized bar in sync
        this.updateMinimizeBar();
    }

    attachPanelListeners() {
        // Polling toggle
        const pollBtn = this.panel.querySelector('#poll-toggle-btn');
        if (pollBtn) {
            pollBtn.addEventListener('click', () => {
                this.controller.togglePolling();
                this.updatePollingButton(pollBtn);
            });
        }

        // Slider tooltip
        const sliderTooltip = this.panel.querySelector('#polling-interval-slider-tooltip');
        const intervalDisplayTooltip = this.panel.querySelector('#interval-value-tooltip');
        if (sliderTooltip && intervalDisplayTooltip) {
            sliderTooltip.addEventListener('input', () => {
                const minutes = parseInt(sliderTooltip.value);
                intervalDisplayTooltip.textContent = `${minutes} min`;
                this.controller.setPollingInterval(minutes);

                const mainIntervalSpan = pollBtn?.querySelector('span.text-emerald-400\\/80');
                if (mainIntervalSpan) mainIntervalSpan.textContent = `· ${minutes} min`;
            });
        }

        // Refresh
        this.panel.querySelector('.refresh-btn')?.addEventListener('click', () => this.controller.poll());

        // Add customer
        this.panel.querySelector('#add-customer-btn')?.addEventListener('click', () => {
            const addController = new NeonovaAddCustomerController(this.controller);
            addController.show();
        });

        // Minimize
        this.panel.querySelector('#minimize-btn')?.addEventListener('click', () => this.toggleMinimize());

        // Remove buttons
        this.panel.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                if (username) this.controller.remove(username);
            });
        });

        // Report buttons
        this.panel.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                const customer = this.controller.model.customers.find(c => c.radiusUsername === username);
                if (customer) {
                    const reportOrderController = new NeonovaReportOrderController(username, customer.friendlyName || username);
                    reportOrderController.start();
                }
            });
        });

        // Friendly name editing
        this.panel.querySelectorAll('.friendly-name').forEach(cell => {
            if (cell.dataset.editable === 'true') return;
            cell.dataset.editable = 'true';
            cell.style.cursor = 'pointer';
            cell.title = 'Click to edit friendly name (blank to reset to username)';

            cell.addEventListener('click', () => {
                if (cell.querySelector('input')) return;
                const username = cell.dataset.username;
                const currentDisplay = cell.textContent.trim();
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentDisplay;
                input.style.cssText = 'width:100%; box-sizing:border-box; padding:2px 4px; font-size:inherit; background:#09090b; color:inherit; border:1px solid #22ff88; border-radius:6px;';
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();
                input.select();

                const save = () => {
                    const newName = input.value.trim();
                    const customer = this.controller.model.customers.find(c => c.radiusUsername === username);
                    if (customer) {
                        customer.friendlyName = newName || null;
                        cell.textContent = customer.friendlyName || customer.radiusUsername;
                    }
                };

                input.addEventListener('blur', save);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') { e.preventDefault(); save(); }
                    if (e.key === 'Escape') { cell.textContent = currentDisplay; }
                });
            });
        });
    }

    openReportModal(username, friendlyName) {
        // Dark overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(overlay);

        // Modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #18181b; border: 1px solid #27272a; border-radius: 24px;
            width: 780px; max-width: 92%; max-height: 92vh;
            overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
            display: flex; flex-direction: column;
            font-family: system-ui;
        `;
        overlay.appendChild(modal);

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 32px; border-bottom: 1px solid #27272a;
            background: #09090b; flex-shrink: 0;
            display: flex; align-items: center; justify-content: space-between;
        `;
        header.innerHTML = `
            <div>
                <div class="text-emerald-400 text-xs font-mono tracking-widest">GENERATE REPORT</div>
                <div class="text-2xl font-semibold text-white mt-1">${friendlyName || username}</div>
            </div>
            <button id="report-close-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                <i class="fas fa-times"></i> Close
            </button>
        `;
        modal.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1 1 auto; overflow-y: auto; padding: 32px;
            background: #18181b;
        `;
        modal.appendChild(content);

        try {
            const orderView = new NeonovaReportOrderView(content, username, friendlyName);
        } catch (err) {
            console.error('ReportOrderView failed to render:', err);
            content.innerHTML = `<div class="text-red-400">Error rendering report form: ${err.message}</div>`;
        }

        const closeModal = () => overlay.remove();
        modal.querySelector('#report-close-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    }

    /**
     * Toggles minimize/expand with smooth slide animation (no overshoot/snap).
     * 
     * Fixes the "slides too far then snaps" bug by:
     *   - Animating max-height from full to minimized (shrink down, stop at bar height).
     *   - Using ease-in-out for controlled motion (starts/ends slow).
     *   - Matching 500ms duration with setTimeout cleanup (no timing mismatch).
     *   - Dynamic heights (viewport - bar height for start, exact bar for end).
     * 
     * No new CSS — keeps your transform + duration setup, but max-height prevents overshoot.
     */
    toggleMinimize() {
        const dash = this.panel;
        const bar = this.minimizeBar;
        this.isMinimized = !this.isMinimized;
    
        if (this.isMinimized) {
            // SLIDE DOWN to position where header is at bottom (reverse of maximize)
            const header = this.panel.querySelector('.flex.items-center.justify-between');
            const headerHeight = header ? header.offsetHeight : 0;
            const panelTop = parseInt(getComputedStyle(dash).top, 10);
            const panelHeight = dash.offsetHeight;
            const viewportHeight = window.innerHeight;
            const targetTop = viewportHeight - headerHeight;
            const delta = targetTop - panelTop;
            const translatePercent = (delta / panelHeight) * 100;
            dash.style.transform = `translate(-50%, ${translatePercent}%)`;
            
            // Hide panel + show minimize bar AFTER animation finishes
            setTimeout(() => {
                dash.style.display = 'none';
                bar.style.display = 'block';
            }, 480);
        } else {
            // MAXIMIZE → SLIDE UP
            bar.style.display = 'none';
            dash.style.display = 'block';
            
            dash.style.transform = 'translate(-50%, 100%)';
            void dash.offsetWidth;
            
            requestAnimationFrame(() => {
                dash.style.transform = 'translateX(-50%)';
            });
        }
    }

    update() { this.render(); }
}
