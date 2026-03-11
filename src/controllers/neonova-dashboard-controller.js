class NeonovaDashboardController {
    constructor() {
        this.masterPassphrase = null;   
        this.customers = [];   
        this._initialized = false;
        this.passphraseController = null;
        this.initAsync();
        // Load persisted polling interval (default 1 min) and paused state (default false)
        this.pollingIntervalMinutes = parseInt(localStorage.getItem('novaPollingIntervalMinutes')) || 1;
        this.isPollingPaused = localStorage.getItem('novaPollingPaused') === 'true';  // string 'true' or false

        this.pollIntervalMs = this.pollingIntervalMinutes * 60 * 1000;

        // If paused, don't start polling yet
        if (!this.isPollingPaused) this.startPolling();
        this.view = new NeonovaDashboardView(this);
    }

    startPolling() {
        if (this.pollInterval) return;
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    setPollingInterval(minutes) {
        minutes = Math.max(1, Math.min(60, parseInt(minutes) || 5));
        this.pollingIntervalMinutes = minutes;
        this.pollIntervalMs = minutes * 60 * 1000;
        localStorage.setItem('novaPollingIntervalMinutes', minutes.toString());
        console.log(`[NeonovaDashboardController.setPollingInterval] Saved new interval: ${minutes} minutes`);
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
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
        this.isPollingPaused = !this.isPollingPaused;
        console.log(`[NeonovaDashboardController.togglePolling] Toggled polling paused: ${this.isPollingPaused}`);

        // Always clear the existing interval to avoid duplicates
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log("[NeonovaDashboardController.togglePolling] Cleared existing poll interval");
        }

        // If resuming polling (not paused anymore)
        if (!this.isPollingPaused) {
            // Run an immediate poll to get fresh data
            this.poll();
            console.log("[NeonovaDashboardController.togglePolling] Ran immediate poll on resume");

            // Restart the scheduled interval
            this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
            console.log(`[NeonovaDashboardController.togglePolling] Restarted poll interval: every ${this.pollingIntervalMinutes} minutes`);
        }

        // Always persist the new paused state to localStorage (fix for original inconsistency)
        localStorage.setItem('novaPollingPaused', this.isPollingPaused.toString());
        console.log(`[NeonovaDashboardController.togglePolling] Saved polling paused state: ${this.isPollingPaused}`);

        // Refresh the view to update UI elements (e.g., pause/resume button icon or text)
        this.view?.render();
        console.log("[NeonovaDashboardController.togglePolling] UI refreshed to reflect new polling state");
    }

    async add(radiusUsername, friendlyName) {
        if (!radiusUsername?.trim()) {
            return;
        }
        if (this.customers.some(c => c.radiusUsername === radiusUsername.trim())) {
            alert('Already added');
            return;
        }
        this.customers.push(new Customer(radiusUsername, friendlyName));
        await this.save();
        if (this.view) this.view.render();
        this.poll();  // Immediate update for the new customer
    }

    async remove(radiusUsername) {
        this.customers = this.customers.filter(c => c.radiusUsername !== radiusUsername);
        await this.save();
        if (this.view) this.view.render();
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
    
        this.customers = await this.load();
        this.startPolling();
        if (this.view) this.view.render();
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
            return [];
        }
    
        try {
            const jsonStr = await NeonovaCryptoController.decryptData(data);
            const customers = JSON.parse(jsonStr).map(c => Object.assign(new Customer('', ''), c));
            return customers;
        } catch (e) {
            alert("Decryption failed. Clearing everything.");
            localStorage.removeItem('novaDashboardCustomers');
            return [];
        }
    }

        /**
     * Saves customers to localStorage using the crypto controller.
     * 
     * Now fully delegated — no more global masterKey or direct encrypt calls.
     * Keeps the "protect empty" guard you already liked.
     */
    async save() {
        if (!this.customers) {
            //customers undefined — SKIPPING (protecting data)
            return;
        }
    
        const jsonStr = JSON.stringify(this.customers);
    
        try {
            const encrypted = await NeonovaCryptoController.encryptData(jsonStr);
            localStorage.setItem('novaDashboardCustomers', encrypted);
            //ENCRYPTED and saved successfully
        } catch (e) {
            console.error("[NeonovaDashboardController.save] Encryption failed", e);
        }
    }

    async poll() {
        if (!this._initialized) {
            return;
        }

        if (!this.customers?.length) {
            return;
        }

        if (this.isPollingPaused) {
            return;
        }
    
        const pollStatusEl = this.view?.panel?.querySelector('#pollStatus');
        if (pollStatusEl) pollStatusEl.textContent = 'Fetching...';
    
        for (const customer of this.customers) {
            try {
                await this.updateCustomerStatus(customer);
            } catch (err) {
                customer.update('Error', 0);
            }
        }
    
        await this.save();
        if (this.view) this.view.render();
        if (pollStatusEl) pollStatusEl.textContent = 'Last update: ' + new Date().toLocaleTimeString();
    }

    isPollingActive() {
        return !this.isPollingPaused && !!this.pollInterval;
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
            status = 'Not Connected';
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
