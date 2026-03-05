class NeonovaDashboardView extends BaseNeonovaView{
    constructor(controller) {
        super();
        this.controller = controller;
        this.isMinimized = true;
        this.createElements();
    }

    createElements() {
        // Minimized bar – matches dashboard width exactly
        this.minimizeBar = document.createElement('div');
        this.minimizeBar.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 92%;
            max-width: 1100px;
            background: #18181b;
            color: white;
            padding: 12px 32px;                /* same horizontal padding as dashboard content */
            border-radius: 24px 24px 0 0;      /* match dashboard's big radius */
            cursor: pointer;
            z-index: 10000;
            font-family: system-ui;
            display: none;
            box-shadow: 0 -12px 40px rgba(0,0,0,0.8);
            border: 1px solid #22ff88;
            border-bottom: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
        `;

        this.minimizeBar.innerHTML = `
            <div class="flex items-center gap-4">
                <img src="https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/assets/nova-subscriber-logo.png" 
                     alt="Nova Subscriber" 
                     class="h-9 w-auto">
            </div>
            <button class="px-8 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition shadow-md">
                <i class="fas fa-chevron-up"></i> Maximize
            </button>
        `;

        this.minimizeBar.addEventListener('click', () => this.toggleMinimize());
        document.body.appendChild(this.minimizeBar);

        this.panel = document.createElement('div');
        this.panel.style.cssText = `
                // Smooth slide animation for maximize/minimize
                this.panel.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
                position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
                width: 92%; max-width: 1100px; height: calc(100vh - 80px);
                background: #09090b; border: 1px solid #27272a;
                border-radius: 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.8);
                padding: 0; font-family: system-ui; z-index: 9999; display: none;
                overflow: hidden;  
                transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;
        document.body.appendChild(this.panel);

        this.minimizeBar.style.display = 'flex';
        this.panel.style.display = 'none';

        // Beautiful emerald scrollbar (matches the whole UI)
        if (!document.getElementById('neonova-scroll-style')) {
            const style = document.createElement('style');
            style.id = 'neonova-scroll-style';
            style.innerHTML = `
                .neonova-scroll::-webkit-scrollbar {
                    width: 7px;
                }
                .neonova-scroll::-webkit-scrollbar-track {
                    background: #18181b;
                    border-radius: 9999px;
                }
                .neonova-scroll::-webkit-scrollbar-thumb {
                    background: #34d399;        /* emerald-400 */
                    border-radius: 9999px;
                    border: 2px solid #18181b;
                }
                .neonova-scroll::-webkit-scrollbar-thumb:hover {
                    background: #10b981;        /* emerald-500 */
                }

                /* Firefox */
                .neonova-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #34d399 #18181b;
                }
            `;
            document.head.appendChild(style);
        }
        
        this.render();
    }

    render() {
        if (!this.panel) {
            console.warn('Panel not ready yet');
            return
        }

        const scrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
        
        let rows = '';
        this.controller.customers.forEach(c => {
            const isConnected = c.status === 'Connected';
            const durationText = c.getDurationStr();
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
                <!-- HEADER -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
                    <div class="flex items-center gap-3">
                        <img src="https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/assets/nova-subscriber-logo.png" 
                             alt="Nova Subscriber" 
                             class="h-11 w-auto">
                    </div>
                    <button class="minimize-btn px-5 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition">
                        <i class="fas fa-minus"></i> Minimize
                    </button>
                </div>
                <!-- SCROLLABLE TABLE ONLY -->
                <div class="flex-1 overflow-y-auto px-6 pb-6 neonova-scroll">
                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
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

                <!-- BOTTOM CONTROLS - ALL BUTTONS NOW IDENTICAL -->
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl px-6 py-4 mx-6 mb-6 shrink-0">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-6">
                            <div class="flex items-center gap-3">
                                <span class="text-xs uppercase tracking-widest text-zinc-500">Polling</span>
                                <input type="range" id="polling-interval-slider" min="1" max="60" value="${this.controller.pollingIntervalMinutes}" class="w-56 accent-emerald-500">
                                <span id="interval-value" class="font-mono text-emerald-400 w-12">${this.controller.pollingIntervalMinutes} min</span>
                            </div>
                            <button id="poll-toggle-btn" 
                                    class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl text-sm transition-all flex items-center gap-2">
                                ${this.controller.isPollingPaused 
                                    ? '<i class="fas fa-play"></i> Resume Polling' 
                                    : '<i class="fas fa-pause"></i> Pause Polling'}
                            </button>
                        </div>
                        
                        <div class="flex items-center gap-4">
                            <button class="refresh-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl text-sm transition-all flex items-center gap-2">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                            <button id="add-customer-btn" 
                                    class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl text-sm transition-all">
                                Add Customer
                            </button>
                        </div>
                
                        <div class="text-zinc-500 text-xs">
                            Last update: <span class="font-mono text-zinc-400">${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
                
            </div>
        `;

        // === RESTORE SCROLL POSITION AFTER REBUILD ===
        const newScrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        if (newScrollContainer) {
            newScrollContainer.scrollTop = savedScrollTop;
        }

        // === ALL LISTENERS ATTACHED DIRECTLY AFTER RENDER (no global listener) ===
        
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
                const customer = this.controller.customers.find(c => c.radiusUsername === username);
                if (customer) {
                    const reportOrderController = new NeonovaReportOrderController(username, customer.friendlyName || username);
                    reportOrderController.start();  
                }
            });
        });

        // Refresh button
        const refreshBtn = this.panel.querySelector('.refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.controller.poll());

        const addCustomerBtn = this.panel.querySelector('#add-customer-btn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => {
                // Direct instantiation — dashboard controller knows nothing about the modal
                const addController = new NeonovaAddCustomerController(this.controller);
                addController.show();
            });
        }

        // Minimize button
        const minimizeBtn = this.panel.querySelector('.minimize-btn');
        if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.toggleMinimize());

        // Poll toggle button
        const pollBtn = this.panel.querySelector('#poll-toggle-btn');
        if (pollBtn) pollBtn.addEventListener('click', () => {
            this.controller.togglePolling();
            // Update button text directly
            if (this.controller.isPollingPaused) {
                pollBtn.innerHTML = '<i class="fas fa-play"></i> Resume Polling';
            } else {
                pollBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Polling';
            }
        });

        // Slider + tooltip
        const slider = this.panel.querySelector('#polling-interval-slider');
        const display = this.panel.querySelector('#interval-value');
        if (slider && display) {
            slider.addEventListener('input', () => {
                const minutes = parseInt(slider.value);
                display.textContent = minutes;
                this.controller.setPollingInterval(minutes);
            });

            let tooltip = document.getElementById('poll-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'poll-tooltip';
                tooltip.style.cssText = `
                    position: absolute;
                    background: #222;
                    color: #fff;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-family: Arial, sans-serif;
                    white-space: nowrap;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity .15s, transform .15s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    z-index: 10001;
                `;
                document.body.appendChild(tooltip);
            }

            const showTooltip = (e) => {
                const rect = slider.getBoundingClientRect();
                const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const value = Math.round(+slider.min + percent * (+slider.max - +slider.min));

                tooltip.textContent = `${value} minute${value === 1 ? '' : 's'}`;

                const thumbX = rect.left + percent * rect.width;
                tooltip.style.left = `${thumbX - tooltip.offsetWidth / 2}px`;
                tooltip.style.top = `${rect.top - 34}px`;
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(-4px)';
            };

            const hideTooltip = () => {
                tooltip.style.opacity = '0';
                tooltip.style.transform = 'translateY(0)';
            };

            slider.addEventListener('mousemove', showTooltip);
            slider.addEventListener('input', showTooltip);  // update while dragging
            slider.addEventListener('mouseleave', hideTooltip);
            slider.addEventListener('touchmove', (e) => {
                if (e.touches.length) showTooltip(e.touches[0]);
            });
        }

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
                input.style.cssText = 'width:100%; box-sizing:border-box; padding:2px 4px; font-size:inherit;';
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();
                input.select();

                const save = () => {
                    const newName = input.value.trim();
                    const customer = this.controller.customers.find(c => c.radiusUsername === username);
                    if (customer) {
                        customer.friendlyName = newName || null;
                        cell.textContent = customer.friendlyName || customer.radiusUsername;
                    }
                };

                input.addEventListener('blur', save);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                    } else if (e.key === 'Escape') {
                        cell.textContent = currentDisplay;
                    }
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

        // Modal with proper flex layout
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

        // Content container – now flex-1 so it always fills the remaining space
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1 1 auto; overflow-y: auto; padding: 32px;
            background: #18181b;
        `;
        modal.appendChild(content);

        // === Render the form ===
        try {
            const orderView = new NeonovaReportOrderView(content, username, friendlyName);
        } catch (err) {
            console.error('ReportOrderView failed to render:', err);
            content.innerHTML = `<div class="text-red-400">Error rendering report form: ${err.message}</div>`;
        }

        // Close handlers
        const closeModal = () => overlay.remove();
        modal.querySelector('#report-close-btn').addEventListener('click', closeModal);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    }

    toggleMinimize() {
        const dash = this.panel;
        const bar = this.minimizeBar;
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            // SLIDE DOWN → off screen
            dash.style.transform = 'translate(-50%, 100%)';
            
            // Hide panel + show minimize bar AFTER animation finishes
            setTimeout(() => {
                dash.style.display = 'none';
                bar.style.display = 'flex';
            }, 480);   // slightly longer than transition
        } else {
            // MAXIMIZE → SLIDE UP
            bar.style.display = 'none';
            dash.style.display = 'block';
            
            // Start completely off-screen at the bottom
            dash.style.transform = 'translate(-50%, 100%)';
            
            // Force browser to read the new transform (reflow)
            void dash.offsetWidth;
            
            // Now animate it up to centered position
            requestAnimationFrame(() => {
                dash.style.transform = 'translateX(-50%)';
            });
        }
    }

    update() { this.render(); }
/*
    updatePollingButton() {
        const btn = this.panel.querySelector('#poll-toggle-btn');
        if (!btn) return;
    
        if (this.controller.isPollingPaused) {
            btn.innerHTML = '<i class="fas fa-play"></i> Resume Polling';
        } else {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pause Polling';
            }
    }
    */
}
