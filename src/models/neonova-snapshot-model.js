class NeonovaSnapshotModel {
    constructor(username, friendlyName, startDate, endDate, events, metrics) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.startDate = startDate;   // Date object
        this.endDate = endDate;       // Date object
        this.events = events || [];   // Array of processed connection events
        this.metrics = metrics || {}; // uptimePercent, totalSeconds, disconnectSeconds, longDisconnects, etc.
    }

    getDateRangeString() {
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        };
        const startStr = this.startDate.toLocaleString('en-US', options);
        const endStr   = this.endDate.toLocaleString('en-US', options);
        return `${startStr} – ${endStr}`;
    }

    getUptimePercent() {
        return this.metrics.percentConnected
    }
}
