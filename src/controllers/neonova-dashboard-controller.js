class NeonovaDashboardController {
    constructor() {
        this.masterPassphrase = null;   
        this.customers = [];            
        this.initAsync();               
        //this.customers = await this.load();
        this.pollingIntervalMinutes = 5;
        this.pollIntervalMs = 5 * 60 * 1000;
        this.pollInterval = null;  
        this.view = new NeonovaDashboardView(this);
        this.isPollingPaused = false;
        this.startPolling();
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
    
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
        }
    }

    togglePolling() {
        this.isPollingPaused = !this.isPollingPaused;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        if (!this.isPollingPaused) {
            this.poll();  // Immediate update on resume
            this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
        }
        this.view?.render();  // Refresh UI to show pause/resume state
    }

    async initAsync() {
        this.masterPassphrase = prompt("Enter encryption passphrase (or leave blank to disable):");
        if (!this.masterPassphrase) {
            console.warn("Encryption disabled – using plaintext storage");
            this.masterPassphrase = null;
        }
        this.customers = await await this.load();
        this.startPolling();            // now safe to start
        if (this.view) this.view.render();
    }

    async load() {
        const data = localStorage.getItem('novaDashboardCustomers');
        if (!data) return [];
        if (!this.masterPassphrase) {
            // fallback plaintext for dev / users who disabled
            try {
                return JSON.parse(data).map(c => Object.assign(new Customer('', ''), c));
            } catch { return []; }
        }
        try {
            const jsonStr = await decryptData(data, this.masterPassphrase);
            return JSON.parse(jsonStr).map(c => Object.assign(new Customer('', ''), c));
        } catch (e) {
            console.error("Decryption failed – wrong passphrase or corrupted data");
            alert("Decryption failed. Clearing storage.");
            localStorage.removeItem('novaDashboardCustomers');
            return [];
        }
    }

    async save() {
        if (!this.customers.length) {
            localStorage.removeItem('novaDashboardCustomers');
            return;
        }
        const jsonStr = JSON.stringify(this.customers); // uses Customer.toJSON() automatically
        if (!this.masterPassphrase) {
            localStorage.setItem('novaDashboardCustomers', jsonStr);
            return;
        }
        try {
            const encrypted = await encryptData(jsonStr, this.masterPassphrase);
            localStorage.setItem('novaDashboardCustomers', encrypted);
        } catch (e) {
            console.error("Encryption failed", e);
        }
    }

    /*
    load() {
        const data = localStorage.getItem('novaDashboardCustomers');
        if (!data) return [];
        try {
            return JSON.parse(data).map(c => Object.assign(new Customer('', ''), c));
        } catch {
            return [];
        }
    }
    

    save() {
        localStorage.setItem('novaDashboardCustomers', JSON.stringify(this.customers));
    }
    */

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

    

    async poll() {
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
                new Date(Date.now() - 24 * 60 * 60 * 1000),   // Last 24 hours
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days (full bootstrap)
            ];

            let latest = null;
            for (const trySince of lookbackPeriods) {
                latest = await NeonovaHTTPController.getLatestEntry(customer.radiusUsername, trySince);
                if (latest) break;   // Found something — stop widening
            }

            // No logs at all (even after 30 days) → safe default
            if (!latest) {
                if (customer.status === undefined || customer.status === null) {
                    customer.update('Unknown', 0);
                    console.log(`[updateCustomerStatus] New customer initialized: ${customer.radiusUsername} → Unknown`);
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
                console.log(`[updateCustomerStatus] Updated with new event:`, { status, durationSeconds, timestamp: latest.timestamp });
            } else {
                // No change — just keep incrementing duration
                if (customer.lastEventTime !== null) {
                    const existingEventDate = new Date(customer.lastEventTime);
                    durationSeconds = Math.floor((Date.now() - existingEventDate.getTime()) / 1000);
                    if (durationSeconds >= 0) customer.update(customer.status, durationSeconds);
                }
                console.log('[updateCustomerStatus] No new event; incremented duration');
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
