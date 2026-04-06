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
            year: 'numeric' 
        };
        
        const startStr = this.startDate.toLocaleDateString('en-US', options);
        const endStr   = this.endDate.toLocaleDateString('en-US', options);
        
        return this.startDate.toDateString() === this.endDate.toDateString()
            ? startStr
            : `${startStr} – ${endStr}`;
    }

    getUptimePercent() {
        return this.metrics.percentConnected
    }
}
