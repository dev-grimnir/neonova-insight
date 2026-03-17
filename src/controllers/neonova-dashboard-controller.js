class NeonovaDashboardController {
    constructor() {
        this.customerControllers = new Map();
        this.model = new NeonovaDashboardModel();
        this.masterPassphrase = null;    
        this._initialized = false;
        this.passphraseController = null;
        this.initAsync();
        // Load persisted polling interval (default 1 min) and paused state (default false)
        this.model.pollingIntervalMinutes = parseInt(localStorage.getItem('novaPollingIntervalMinutes')) || 1;
        this.model.isPollingPaused = localStorage.getItem('novaPollingPaused') === 'true';  // string 'true' or false

        this.pollIntervalMs = this.model.pollingIntervalMinutes * 60 * 1000;

        // If paused, don't start polling yet
        if (!this.model.isPollingPaused) this.startPolling();
        this.view = new NeonovaDashboardView(this);
    }

    createCustomerController(customer) {
        const ctrl = new NeonovaCustomerController(customer, this);
        this.customerControllers.set(customer.radiusUsername, ctrl);
        return ctrl;
    }
    
    getCustomerController(username) {
        return this.customerControllers.get(username);
    }

    rebuildTable() {
        const rows = [];
        for (const ctrl of this.customerControllers.values()) {
            const row = ctrl.getRowElement();
            if (row) rows.push(row);
        }

         // === SORT: Disconnected/Not Connected at the very top ===
        rows.sort((a, b) => {
            // Status is always the 3rd column (nth-child(3))
            const aStatus = a.querySelector('td:nth-child(3)')?.textContent.trim() || '';
            const bStatus = b.querySelector('td:nth-child(3)')?.textContent.trim() || '';
    
            const aDisconnected = aStatus !== 'Connected' && aStatus !== 'Connecting...';
            const bDisconnected = bStatus !== 'Connected' && bStatus !== 'Connecting...';
    
            if (aDisconnected && !bDisconnected) return -1;   // disconnected first
            if (!aDisconnected && bDisconnected) return 1;
            return 0;   // keep original relative order inside each group (stable)
        });
        
            this.view.setRows(rows);
    }

    startPolling() {
        if (this.pollInterval) return;
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), this.model.pollingIntervalMinutes * 60 * 1000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    setPollingInterval(minutes) {
        minutes = Math.max(1, Math.min(60, parseInt(minutes) || 5));
        this.model.pollingIntervalMinutes = minutes;
        this.pollIntervalMs = this.model.pollingIntervalMinutes * 60 * 1000;
        localStorage.setItem('novaPollingIntervalMinutes', this.model.pollingIntervalMinutes.toString());
        console.log(`[NeonovaDashboardController.setPollingInterval] Saved new interval: ${this.model.pollingIntervalMinutes} minutes`);
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => this.poll(), this.model.pollingIntervalMinutes * 60 * 1000);
        }
    }

    /**
     * Toggles the polling state between paused and active.
     * 
     * Behavior:
     *   - Flips the isPollingPaused flag.
     *   - Always clears any existing poll interval.
     *   - If resuming (not paused): Runs an immediate poll, then restarts the scheduled interval.
     *   - Always saves the new paused state to localStorage for persistence across reloads.
     *   - Refreshes the UI to reflect the new state (e.g., update button icons/text).
     * 
     * This ensures consistent state saving (paused or not) — original only saved on resume.
     */
    togglePolling() {
        // Flip the paused flag
        this.model.isPollingPaused = !this.model.isPollingPaused;
        console.log(`[NeonovaDashboardController.togglePolling] Toggled polling paused: ${this.model.isPollingPaused}`);

        // Always clear the existing interval to avoid duplicates
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        // If resuming polling (not paused anymore)
        if (!this.model.isPollingPaused) {
            // Run an immediate poll to get fresh data
            this.poll();

            // Restart the scheduled interval
            this.pollInterval = setInterval(() => this.poll(), this.model.pollingIntervalMinutes * 60 * 1000);
        }

        // Always persist the new paused state to localStorage (fix for original inconsistency)
        localStorage.setItem('novaPollingPaused', this.model.isPollingPaused.toString());

        // Refresh the view to update UI elements (e.g., pause/resume button icon or text)
        this.view?.render();
    }

    async add(radiusUsername, friendlyName) {
        if (!radiusUsername?.trim()) return;
        const trimmed = radiusUsername.trim();
    
        if (this.model.getCustomer(trimmed)) {
            alert('Already added');
            return;
        }
    
        // Create controller + view + row
        const ctrl = new NeonovaCustomerController(trimmed, friendlyName, this);
        this.customerControllers.set(trimmed, ctrl);
        this.model.addOrUpdateCustomer(ctrl.toJSON());
    
        // Show the row immediately (with "Connecting...")
        this.rebuildTable();  // or this.view.appendRow(ctrl.getRowElement()) for instant add
        this.view.updateHeader();
    
        // Immediate single-customer poll to get real status
        try {
            await this.updateCustomerStatus(ctrl.model);  // uses the model object directly
    
            // If poll found nothing → auto-remove + toast
            if (ctrl.model.status === 'Account Not Found') {
                this.remove(trimmed);
                this.view.showToast('Customer not found in RADIUS', { type: 'error', duration: 5000 });
                return;
            }
    
            // Otherwise → update the row with real status/duration
            ctrl.view.update();
    
            await this.save();
            this.rebuildTable();  // full refresh if needed
        } catch (err) {
            console.error('Initial poll failed:', err);
            ctrl.model.status = 'Error';
            ctrl.view.update();
        }
    }

    async remove(radiusUsername) {
        this.model.removeCustomer(radiusUsername);
        this.customerControllers.delete(radiusUsername);
        await this.save();
        if (this.view) this.rebuildTable();
        this.view.updateHeader();
    }

    /**
     * Main initialization for the dashboard.
     * 
     * Now completely delegates crypto setup to NeonovaCryptoController.
     * No more global masterKey, no more direct calls to old utils functions.
     * 
     * Flow:
     *   1. Init the crypto controller (loads remembered key or prepares for passphrase)
     *   2. If no key yet → show passphrase modal once
     *   3. Load customers (now using decryptData from crypto controller)
     *   4. Start polling and render
     */
    async initAsync() {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
    
        // Delegate ALL key setup to the static crypto controller
        await NeonovaCryptoController.initMasterKey();
    
        // If this is the very first time (no remembered key), show passphrase modal exactly once
        if (!NeonovaCryptoController.hasMasterKey) {
            this.passphraseController = new NeonovaPassphraseController(this);
            await this.passphraseController.show();   // only one modal
        } else {
            
        }
    
        await this.load(); 

        if (!this.model.isPollingPaused) this.startPolling();
        if (this.view) this.rebuildTable();
    }

    /**
     * Loads customers from localStorage using the crypto controller.
     * 
     * Now 100% delegated — no more direct decrypt calls or global masterKey.
     * If decryption fails, we clear only the customers data (never the master key).
     */
    async load() {
        const data = localStorage.getItem('novaDashboardCustomers');
        if (!data) {
            return;
        }
    
        try {
            const jsonStr = await NeonovaCryptoController.decryptData(data);
            const parsed = JSON.parse(jsonStr);
    
            this.model.customers = parsed.customers || [];
    
            this.customerControllers.clear();
            for (const json of this.model.customers) {
                const ctrl = NeonovaCustomerController.fromJSON(json, this);
                this.customerControllers.set(json.radiusUsername, ctrl);
            }
    
            this.model.pollingIntervalMinutes = parsed.pollingIntervalMinutes || 1;
            this.model.isPollingPaused = parsed.isPollingPaused || false;
            
        } catch (e) {
            alert("Decryption failed. Clearing everything.");
            localStorage.removeItem('novaDashboardCustomers');
            return;
        }
    }

    /**
     * Saves customers to localStorage using the crypto controller.
     * 
     * Now fully delegated — no more global masterKey or direct encrypt calls.
     * Keeps the "protect empty" guard you already liked.
     */
    async save() {
        const jsonStr = JSON.stringify(this.model.toJSON());
    
        try {
            const jsonStr = JSON.stringify(this.model.toJSON());
            const encrypted = await NeonovaCryptoController.encryptData(jsonStr);
            localStorage.setItem('novaDashboardCustomers', encrypted);
        } catch (e) {
            console.error("[NeonovaDashboardController.save] Encryption failed", e);
        }
    }

    async poll() {
        if (!this._initialized || !this.customerControllers || this.customerControllers.size === 0 || this.model.isPollingPaused) {
            return;
        }
    
        const pollStatusEl = this.view?.panel?.querySelector('#pollStatus');
        if (pollStatusEl) pollStatusEl.textContent = 'Fetching...';
    
        for (const ctrl of this.customerControllers.values()) {
            try {
                await this.updateCustomerStatus(ctrl.model);  // pass ctrl.model (the live object)
                ctrl.view.update();  // refresh this row with new status/duration
            } catch (err) {
                console.error(`Poll error for ${ctrl.radiusUsername}:`, err);
                ctrl.model.update('Error', 0);
                ctrl.view.update();
            }
        }
    
        await this.save();
        this.rebuildTable();  // or just header if you prefer targeted updates
        this.view.updateHeader();
    
        if (pollStatusEl) pollStatusEl.textContent = 'Last update: ' + new Date().toLocaleTimeString();
    
        this.model.lastUpdatedDisplay = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    isPollingActive() {
        return !this.model.isPollingPaused && !!this.pollInterval;
    }

    async getStatus(username) {
        let url = NeonovaHTTPController.getSearchUrl(username);
        const res = await fetch(url, { credentials: 'include', cache: 'no-cache' });
        if (!res.ok) throw new Error('Fetch failed');

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
        if (!table || table.rows.length < 2) return { status: 'Unknown', durationSec: 0 };

        // Assume newest row first, status in cell 4 (adjust index if needed)
        const latest = table.rows[1];
        const statusText = latest.cells[4]?.textContent.trim().toLowerCase() || '';
        const timestamp = latest.cells[0]?.textContent.trim() || '';

        let status = 'Unknown';
        let durationSec = 0;

        if (statusText.includes('start') || statusText.includes('connect')) {
            status = 'Connected';
        } else if (statusText.includes('stop') || statusText.includes('disconnect')) {
            status = 'Disconnected';
            // Rough duration: from timestamp to now (improve with last Start if available)
            const lastTime = new Date(timestamp).getTime();
            durationSec = Math.round((Date.now() - lastTime) / 1000);
        }

        return { status, durationSec };
    }

    async updateCustomerStatus(customer) {
        try {
            // Compute the "normal" sinceDate (last known event or last poll)
            let sinceDate = null;
            if (customer.lastEventTime !== null) {
                sinceDate = new Date(customer.lastEventTime);
            } else if (customer.lastUpdate) {
                const lastUpdateDate = new Date(customer.lastUpdate);
                if (!isNaN(lastUpdateDate.getTime())) sinceDate = lastUpdateDate;
            }

            // === PROGRESSIVE LOOKBACK FOR NEW CUSTOMERS ===
            const lookbackPeriods = [
                sinceDate,                    // Normal narrow poll
                new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),     // 1 day
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),     // 7 days
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),    // 30 days
                new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),    // 3 months
                new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),   // 6 months
                new Date(Date.now() - 335 * 24 * 60 * 60 * 1000)    // ~11 months max
            ];

            let latest = null;
            for (const trySince of lookbackPeriods) {
                latest = await NeonovaHTTPController.getLatestEntry(customer.radiusUsername, trySince);
                if (latest) break;   // Found something — stop widening
            }

            // No logs at all (even after 30 days) → safe default
            console.log("NeonovaDashboardController.getLatestEntry() -> latest = " + latest);
            if (!latest) {
                if (latest === null) {
                    customer.update('Account Not Found', 0);
                    console.log(`[updateCustomerStatus] No logs found after 11-month lookback — set to 'Account Not Found': ${customer.radiusUsername}`);
                    this.view.showToast('Customer not found in RADIUS', {
                        type: 'error',
                        duration: 5000});
                    return;
                } else if (customer.lastEventTime !== null) {
                    // Existing customer with no new events — increment duration
                    const eventDate = new Date(customer.lastEventTime);
                    if (!isNaN(eventDate.getTime())) {
                        const durationSeconds = Math.floor((Date.now() - eventDate.getTime()) / 1000);
                        if (durationSeconds >= 0) customer.update(customer.status, durationSeconds);
                    }
                }
                return;
            }

            // We have a real event (from any lookback)
            const eventDate = latest.dateObj;
            const eventMs = eventDate.getTime();
            let durationSeconds = Math.floor((Date.now() - eventMs) / 1000);
            if (durationSeconds < 0) durationSeconds = 0;

            const status = latest.status === 'Start' ? 'Connected' : 'Not Connected';

            const isNew = customer.lastEventTime === null || eventMs > customer.lastEventTime;

            if (isNew) {
                customer.update(status, durationSeconds);
                customer.lastEventTime = eventMs;
            } else {
                // No change — just keep incrementing duration
                if (customer.lastEventTime !== null) {
                    const existingEventDate = new Date(customer.lastEventTime);
                    durationSeconds = Math.floor((Date.now() - existingEventDate.getTime()) / 1000);
                    if (durationSeconds >= 0) customer.update(customer.status, durationSeconds);
                }
                //No new event; incremented duration
            }
        } catch (err) {
            console.error('[updateCustomerStatus] error:', err);
            customer.update('Error', 0);
        }
    }

    getCurrentMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }   

}
