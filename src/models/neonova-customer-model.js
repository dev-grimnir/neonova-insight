class NeonovaCustomerModel {

    static RETENTION_MS = 24 * 60 * 60 * 1000;
    
    constructor(radiusUsername, friendlyName = '', initialState = null) {
        const state = initialState || {};
        this.radiusUsername = radiusUsername.trim();
        this.friendlyName = (friendlyName.trim() || radiusUsername.trim());
        this.status = state.status || 'Connecting...';
        this.durationSec = state.durationSec ?? 0;
        this.lastUpdate = state.lastUpdate || new Date().toLocaleString();
        this.lastEventTime = state.lastEventTime ? new Date(state.lastEventTime) : null;
        this.eventHistory = [];
        if (Array.isArray(state.eventHistory)) {
            for (const e of state.eventHistory) {
                const d = new Date(e.dateObj);
                if (!isNaN(d.getTime())) {
                    this.eventHistory.push({ dateObj: d, status: e.status });
                }
            }
        }
    }

    /**
     * Single funnel for adding events to the buffer.
     * Sorts, dedupes by (timestamp + status), trims to retention window.
     */
    ingestEvents(events) {
        if (!Array.isArray(events) || events.length === 0) return;
    
        const normalized = [];
        for (const e of events) {
            const d = e.dateObj instanceof Date ? e.dateObj : new Date(e.dateObj);
            if (!isNaN(d.getTime())) {
                normalized.push({ dateObj: d, status: e.status });
            }
        }
    
        const merged = this.eventHistory.concat(normalized);
        merged.sort(function(a, b) { return a.dateObj.getTime() - b.dateObj.getTime(); });
    
        const deduped = [];
        let lastKey = null;
        for (const e of merged) {
            const key = e.dateObj.getTime() + '|' + e.status;
            if (key !== lastKey) {
                deduped.push(e);
                lastKey = key;
            }
        }
    
        const cutoff = Date.now() - NeonovaCustomerModel.RETENTION_MS;
        const trimmed = [];
        for (const e of deduped) {
            if (e.dateObj.getTime() >= cutoff) trimmed.push(e);
        }
        
        // Always preserve the most recent event, even if older than the retention window.
        // The renderer needs at least one event to know the modem's pre-window state.
        if (trimmed.length === 0 && deduped.length > 0) {
            trimmed.push(deduped[deduped.length - 1]);
        }
        
        this.eventHistory = trimmed;
    }

    getDurationStr() {
        const seconds = this.durationSec || 0;
        let durationStr = '';

        if (seconds < 60) {
            durationStr = '<1min';
        } else {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (days > 0)  durationStr += `${days}d `;
            if (hours > 0) durationStr += `${hours}h `;
            durationStr += `${minutes}m`;
        }

        let timeStr = '';
        if (this.lastEventTime) {
            const eventDate = new Date(this.lastEventTime);
            if (!isNaN(eventDate.getTime())) {
                timeStr = ` (${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})`;
            }
        }

        return `${durationStr}${timeStr}`;
    }

    update(status, durationSec) {
        this.status = status;
        this.durationSec = durationSec;
        this.lastUpdate = new Date().toLocaleString();
    }

    /**
     * Single funnel for adding events to the buffer. Handles:
     *   - Normalizing input (tolerates string timestamps)
     *   - Merging with existing events
     *   - Sorting chronologically
     *   - Deduping by (timestamp + status)
     *   - Trimming to the retention window
     *
     * Both the add-path (24h backfill) and the poll-path (new events per tick)
     * go through this method. Never mutate eventHistory directly.
     */
    ingestEvents(events) {
        if (!Array.isArray(events) || events.length === 0) return;

        const normalized = events
            .map(e => ({
                dateObj: e.dateObj instanceof Date ? e.dateObj : new Date(e.dateObj),
                status: e.status
            }))
            .filter(e => !isNaN(e.dateObj.getTime()));

        const merged = this.eventHistory.concat(normalized);
        merged.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        // Dedupe — same timestamp + same status is the same event
        const deduped = [];
        let lastKey = null;
        for (const e of merged) {
            const key = `${e.dateObj.getTime()}|${e.status}`;
            if (key !== lastKey) {
                deduped.push(e);
                lastKey = key;
            }
        }

        // Trim to retention window
        const cutoff = Date.now() - NeonovaCustomerModel.RETENTION_MS;
        this.eventHistory = deduped.filter(e => e.dateObj.getTime() >= cutoff);
    }

    toJSON() {
        return {
            radiusUsername: this.radiusUsername,
            friendlyName: this.friendlyName,
            status: this.status,
            durationSec: this.durationSec,
            lastUpdate: this.lastUpdate,
            lastEventTime: this.lastEventTime instanceof Date 
                ? this.lastEventTime.toISOString() 
                : (this.lastEventTime || null),
            eventHistory: this.eventHistory.map(e => ({
                dateObj: e.dateObj.toISOString(),
                status: e.status
            }))
        };
    }
}
