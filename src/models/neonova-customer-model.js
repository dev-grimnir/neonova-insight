class NeonovaCustomerModel {
    static RETENTION_MS = 24 * 60 * 60 * 1000;   // 24h buffer window

    constructor(radiusUsername, friendlyName = '', initialState = null) {
        const state = initialState || {};
        this.radiusUsername = radiusUsername.trim();
        this.friendlyName = (friendlyName.trim() || radiusUsername.trim());
        this.status = state.status || 'Connecting...';
        this.durationSec = state.durationSec ?? 0;
        this.lastUpdate = state.lastUpdate || new Date().toLocaleString();
        this.lastEventTime = state.lastEventTime ? new Date(state.lastEventTime) : null;

        // === Notification state ===
        // disconnectedSince: ms timestamp of when this modem was first observed Disconnected
        //                    in the current down event. null if currently Connected.
        // lastAlertSent:     ms timestamp of when an alert was actually fired for the current
        //                    down event. null if no alert sent (yet, or never crossed threshold).
        // alertsSuppressed:  user toggle — when true, this modem never triggers alerts
        //                    regardless of tab/threshold state.
        this.disconnectedSince = (typeof state.disconnectedSince === 'number') ? state.disconnectedSince : null;
        this.lastAlertSent     = (typeof state.lastAlertSent === 'number')     ? state.lastAlertSent     : null;
        this.alertsSuppressed  = state.alertsSuppressed === true;

        // Rehydrate buffer from persisted state
        this.eventHistory = Array.isArray(state.eventHistory)
            ? state.eventHistory
                .map(e => ({ dateObj: new Date(e.dateObj), status: e.status }))
                .filter(e => !isNaN(e.dateObj.getTime()))
            : [];
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

    // ─── Notification state helpers ────────────────────────────────
    markDisconnected(now = Date.now()) {
        this.disconnectedSince = now;
        this.lastAlertSent = null;
    }

    markAlerted(now = Date.now()) {
        this.lastAlertSent = now;
    }

    markReconnected() {
        this.disconnectedSince = null;
        this.lastAlertSent = null;
    }

    toggleAlertsSuppressed() {
        this.alertsSuppressed = !this.alertsSuppressed;
        return this.alertsSuppressed;
    }

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

        const deduped = [];
        let lastKey = null;
        for (const e of merged) {
            const key = `${e.dateObj.getTime()}|${e.status}`;
            if (key !== lastKey) {
                deduped.push(e);
                lastKey = key;
            }
        }

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
            disconnectedSince: this.disconnectedSince,
            lastAlertSent: this.lastAlertSent,
            alertsSuppressed: this.alertsSuppressed,
            eventHistory: this.eventHistory.map(e => ({
                dateObj: e.dateObj.toISOString(),
                status: e.status
            }))
        };
    }
}
