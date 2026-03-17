class NeonovaDashboardView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.privacyEnabled = localStorage.getItem('neonova-privacy-enabled') === 'true';
        this.controller = controller;
        this.isMinimized = true;
        this.createElements();
    }

    showToast(message, { type = 'error', duration = 5000 } = {}) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl text-white shadow-2xl z-[10000] animate-fade-in-up transition-opacity duration-300`;
    
        // Style based on type (dark theme friendly)
        if (type === 'error') {
            toast.classList.add('bg-red-700/90', 'border', 'border-red-500/50');
        } else if (type === 'success') {
            toast.classList.add('bg-emerald-700/90', 'border', 'border-emerald-500/50');
        } else {
            toast.classList.add('bg-zinc-800/90', 'border', 'border-zinc-600');
        }
    
        document.body.appendChild(toast);
    
        // Fade out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    getHeaderHTML() {
        const pollIcon = this.controller.model.isPollingPaused ? 'fa-play' : 'fa-pause';
        const pollText = this.controller.model.isPollingPaused ? 'Resume' : 'Pause';
        const interval = this.controller.model.pollingIntervalMinutes;

        return `
            <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 shrink-0 relative z-10">
                <div class="flex items-center gap-4">
                    <img src="https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/assets/nova-subscriber-logo.png" 
                         alt="Nova Subscriber" class="h-10 w-auto">
                    <button id="privacy-toggle-btn" 
                            class="px-6 py-2.5 font-medium rounded-2xl flex items-center justify-center transition-all border shadow-sm"
                            title="Toggle Privacy Mode">
                        Privacy Off
                    </button>
                </div>

                <div class="flex items-center gap-4">
                    <!-- Polling control -->
                    <div class="relative group/polling">
                        <button id="poll-toggle-btn" 
                                class="min-w-[180px] px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-2xl flex items-center justify-center gap-2.5 transition-all border border-zinc-700">
                            <i class="fas ${pollIcon} text-emerald-400"></i>
                            <span>${pollText} Polling</span>
                            <span class="text-emerald-400/80 text-sm font-mono">· ${interval} min</span>
                        </button>

                        <!-- Slider tooltip (pops UP when minimized via CSS) -->
                        <div class="poll-slider-tooltip absolute left-1/2 -translate-x-1/2 top-full mt-3 hidden group-hover/polling:block z-20 pointer-events-auto">
                            <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 shadow-2xl w-80">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs uppercase tracking-widest text-zinc-400">Polling Interval</span>
                                    <span id="interval-value-tooltip" class="font-mono text-emerald-400">${interval} min</span>
                                </div>
                                <input type="range" id="polling-interval-slider-tooltip" 
                                       min="1" max="60" value="${interval}" 
                                       class="w-full accent-emerald-500 cursor-pointer">
                            </div>
                            <!-- Arrow -->
                            <div class="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-zinc-900 border-l border-t border-zinc-700 rotate-45"></div>
                        </div>
                    </div>

                    <!-- Last Updated – pure data from model (no calculation here) -->
                    <span id="last-updated" 
                          class="text-xs text-zinc-400 font-mono whitespace-nowrap">
                        Last Updated: <span class="text-emerald-400" id="last-updated-value">--</span>
                    </span>

                    <button class="refresh-btn px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl flex items-center gap-2 transition shadow-sm">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>

                    <button id="add-customer-btn" 
                            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl flex items-center gap-2 transition shadow-sm">
                        Add Customer
                    </button>

                    <button id="minimize-btn" 
                            class="minimize-btn px-5 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition border border-zinc-700">
                        <i class="fas fa-chevron-up"></i> Maximize
                    </button>
                </div>
            </div>
        `;
    }

    createElements() {
        // ==================== SINGLE PANEL (morphs between bar ↔ full dashboard) ====================
        this.panel = document.createElement('div');
        this.panel.classList.add('neonova-dashboard');
        this.panel.style.cssText = `
            position: fixed;
            left: 50%;
            transform: translateX(-50%);
            width: 92%;
            max-width: 1100px;
            background: #09090b;
            color: white;
            font-family: system-ui;
            box-shadow: 0 8px 40px rgba(0,0,0,0.8);
            z-index: 9999;
            overflow: hidden;
            border: 1px solid #27272a;
            border-radius: 24px;
            transition: 
                top 500ms cubic-bezier(0.32, 0.72, 0, 1),
                height 500ms cubic-bezier(0.32, 0.72, 0, 1),
                border 500ms cubic-bezier(0.32, 0.72, 0, 1),
                border-radius 500ms cubic-bezier(0.32, 0.72, 0, 1),
                box-shadow 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;
        document.body.appendChild(this.panel);

        // Inner structure (header + content)
        this.panel.innerHTML = `
            <div class="flex flex-col h-full">
                <div id="header-container"></div>
                <div id="content-area" class="flex-1 overflow-hidden flex flex-col">
                    <!-- Card -->
                    <div class="flex-1 bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden flex flex-col">
                        
                        <!-- STATIC COLUMN HEADER (super compact) -->
                        <div class="px-6 py-1 bg-zinc-900 border-b border-zinc-800">
                            <table class="w-full table-fixed">
                                <colgroup>
                                    <col style="width: 28%;">
                                    <col style="width: 25%;">
                                    <col style="width: 14%;">
                                    <col style="width: 18%;">
                                    <col style="width: 15%;">
                                </colgroup>
                                <thead>
                                    <tr class="text-xs uppercase tracking-widest text-zinc-500">
                                        <th class="px-6 py-2 text-left">Friendly Name</th>
                                        <th class="px-6 py-2 text-left">RADIUS Username</th>
                                        <th class="px-6 py-2 text-left">Status</th>
                                        <th class="px-6 py-2 text-left">Duration</th>
                                        <th class="px-6 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                            </table>
                        </div>

                        <!-- SCROLLABLE BODY ONLY -->
                        <div class="flex-1 overflow-y-auto px-6 neonova-scroll">
                            <table class="w-full table-fixed">
                                <colgroup>
                                    <col style="width: 28%;">
                                    <col style="width: 25%;">
                                    <col style="width: 14%;">
                                    <col style="width: 18%;">
                                    <col style="width: 15%;">
                                </colgroup>
                                <tbody id="customer-table-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.headerContainer = this.panel.querySelector('#header-container');
        this.contentArea = this.panel.querySelector('#content-area');

        // Create the ONE header element
        const temp = document.createElement('div');
        temp.innerHTML = this.getHeaderHTML();
        this.header = temp.firstElementChild;
        this.headerContainer.appendChild(this.header);

        // Initial state = minimized (bar at bottom)
        this.applyMinimizedStyles();
        this.contentArea.style.display = 'none';
        this.isMinimized = true;

        // Scroll styles + minimized tooltip fix
        if (!document.getElementById('neonova-scroll-style')) {
            const style = document.createElement('style');
            style.id = 'neonova-scroll-style';
            style.innerHTML = `
                .neonova-privacy-mode td:nth-child(1),
                .neonova-privacy-mode td:nth-child(2) {
                    filter: blur(5px);
                    transition: filter 300ms ease;
                }

                /* Reveal only the hovered row's sensitive cells */
                .neonova-privacy-mode tr:hover td:nth-child(1),
                .neonova-privacy-mode tr:hover td:nth-child(2) {
                    filter: blur(0);
                }
                
                .neonova-scroll::-webkit-scrollbar { width: 7px; }
                .neonova-scroll::-webkit-scrollbar-track { background: #18181b; border-radius: 9999px; }
                .neonova-scroll::-webkit-scrollbar-thumb { background: #34d399; border-radius: 9999px; border: 2px solid #18181b; }
                .neonova-scroll::-webkit-scrollbar-thumb:hover { background: #10b981; }
                .neonova-scroll { scrollbar-width: thin; scrollbar-color: #34d399 #18181b; }

                /* Tooltip pops UP when panel is minimized */
                .neonova-dashboard.minimized .poll-slider-tooltip {
                    top: auto !important;
                    bottom: 100% !important;
                    margin-top: 0 !important;
                    margin-bottom: 12px !important;
                }
                .neonova-dashboard.minimized .poll-slider-tooltip > div:last-child {
                    top: auto !important;
                    bottom: -8px !important;
                    transform: rotate(225deg) !important;
                }
                .neonova-dashboard.minimized .group\\/polling:hover .poll-slider-tooltip,
                .neonova-dashboard.minimized .poll-slider-tooltip:hover {
                    display: block !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Attach listeners ONCE (header never leaves the DOM)
        this.attachHeaderListeners();

        // Click anywhere on the bar (except buttons) to expand
        this.panel.addEventListener('click', (e) => {
            if (this.isMinimized && !e.target.closest('button')) {
                this.toggleMinimize();
            }
        });

        this.render();
    }

    clearRows() {
        const tbody = this.panel.querySelector('#customer-table-body');
        if (tbody) tbody.replaceChildren();  // modern, clean (or innerHTML = '')
    }
    
    appendRow(trElement) {
        const tbody = this.panel.querySelector('#customer-table-body');
        if (tbody && trElement instanceof HTMLElement) {
            tbody.appendChild(trElement);
        }
    }
    
    setRows(rowElements) {
        this.clearRows();
        if (!Array.isArray(rowElements)) return;
        const fragment = document.createDocumentFragment();
        rowElements.forEach(tr => {
            if (tr instanceof HTMLElement) fragment.appendChild(tr);
        });
        const tbody = this.panel.querySelector('#customer-table-body');
        if (tbody) tbody.appendChild(fragment);
    }

    attachHeaderListeners() {
        const privacyBtn = this.header.querySelector('#privacy-toggle-btn');
        if (privacyBtn) {
            privacyBtn.addEventListener('click', () => this.togglePrivacy());
            this.updatePrivacyButton(privacyBtn);  // set correct eye / eye-slash on load
        }
        
        // Polling toggle
        const pollBtn = this.header.querySelector('#poll-toggle-btn');
        pollBtn?.addEventListener('click', () => {
            this.controller.togglePolling();
            this.updatePollingButton(pollBtn);
        });

        // Slider
        const slider = this.header.querySelector('#polling-interval-slider-tooltip');
        const intervalDisplay = this.header.querySelector('#interval-value-tooltip');
        slider?.addEventListener('input', () => {
            const minutes = parseInt(slider.value);
            intervalDisplay.textContent = `${minutes} min`;
            this.controller.setPollingInterval(minutes);

            const mainSpan = pollBtn?.querySelector('span.text-emerald-400\\/80');
            if (mainSpan) mainSpan.textContent = `· ${minutes} min`;
        });

        // Refresh
        this.header.querySelector('.refresh-btn')?.addEventListener('click', () => this.controller.poll());

        // Add customer
        this.header.querySelector('#add-customer-btn')?.addEventListener('click', () => {
            const addController = new NeonovaAddCustomerController(this.controller);
            addController.show();
        });

        // Minimize button
        this.header.querySelector('#minimize-btn')?.addEventListener('click', () => this.toggleMinimize());
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
        if (intervalSpan) intervalSpan.textContent = `· ${this.controller.model.pollingIntervalMinutes} min`;
    }

    updateHeaderForState() {
        const minBtn = this.header.querySelector('#minimize-btn');
        if (!minBtn) return;
        const actionText = this.isMinimized ? 'Maximize' : 'Minimize';
        const actionIcon = this.isMinimized ? 'fa-chevron-up' : 'fa-minus';
        minBtn.innerHTML = `<i class="fas ${actionIcon}"></i> ${actionText}`;
    }

    updateHeader() {
        const pollBtn = this.header.querySelector('#poll-toggle-btn');
        if (pollBtn) this.updatePollingButton(pollBtn);

        const slider = this.header.querySelector('#polling-interval-slider-tooltip');
        if (slider) slider.value = this.controller.model.pollingIntervalMinutes;

        // Last Updated now comes straight from the model (view does zero work)
        this.updateLastUpdated();
    }

    updateLastUpdated() {
        const valueSpan = this.header.querySelector('#last-updated-value');
        if (!valueSpan) return;

        // This is the ONLY place the view touches the timestamp
        // → Your MODEL/CONTROLLER is now responsible for the string
        valueSpan.textContent = this.controller.model.lastUpdatedDisplay || 'Never';
    }

    // ====================== STYLE MORPH ======================
    applyMinimizedStyles() {
        const headerHeight = this.header.offsetHeight;
        this.panel.style.height = `${headerHeight}px`;
        this.panel.style.top = `${window.innerHeight - headerHeight}px`;
        this.panel.style.bottom = 'auto';
        this.panel.style.border = '1px solid #22ff88';
        this.panel.style.borderBottom = 'none';
        this.panel.style.borderRadius = '24px 24px 0 0';
        this.panel.style.boxShadow = '0 -12px 40px rgba(0,0,0,0.8)';
        this.panel.style.cursor = 'pointer';
        this.panel.classList.add('minimized');
    }

    applyMaximizedStyles() {
        this.panel.style.height = 'calc(100vh - 80px)';
        this.panel.style.top = '60px';
        this.panel.style.bottom = 'auto';
        this.panel.style.border = '1px solid #27272a';
        this.panel.style.borderBottom = '1px solid #27272a';
        this.panel.style.borderRadius = '24px';
        this.panel.style.boxShadow = '0 8px 40px rgba(0,0,0,0.8)';
        this.panel.style.cursor = 'default';
        this.panel.classList.remove('minimized');
    }

    // ====================== RENDER ===================
    render() {
        // No more row generation here
        this.updateHeader();          // keep — updates polling button, last-updated, etc.
        this.updateLastUpdated();     // if separate; or fold into updateHeader()
    }

    // ====================== TOGGLE (now pure morph – no duplicate DOM, no black box) ======================
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        this.updateHeaderForState();

        if (this.isMinimized) {
            this.applyMinimizedStyles();
            this.contentArea.style.display = 'none';
        } else {
            this.contentArea.style.display = 'flex';
            this.applyMaximizedStyles();
        }
    }

    update() { this.render(); }

    applyPrivacyBlur() {
        const tbody = this.panel.querySelector('#customer-table-body');
        if (tbody) {
            tbody.classList.toggle('neonova-privacy-mode', this.privacyEnabled);
        }
    }
    
    togglePrivacy() {
        this.privacyEnabled = !this.privacyEnabled;
        localStorage.setItem('neonova-privacy-enabled', this.privacyEnabled.toString());
        this.applyPrivacyBlur();
        
        const btn = this.header.querySelector('#privacy-toggle-btn');
        this.updatePrivacyButton(btn);
    }
    
    updatePrivacyButton(btn) {
        if (!btn) return;
        
        if (this.privacyEnabled) {
            btn.textContent = 'Privacy On';
            btn.className = 'px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-2xl flex items-center justify-center transition-all border border-zinc-700 shadow-sm';
            btn.title = 'Privacy ON — names blurred';
        } else {
            btn.textContent = 'Privacy Off';
            btn.className = 'px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-2xl flex items-center justify-center transition-all border border-zinc-600 shadow-sm';
            btn.title = 'Privacy OFF — names visible';
        }
    }
}
