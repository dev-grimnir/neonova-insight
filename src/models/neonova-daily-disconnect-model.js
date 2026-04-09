class NeonovaDailyDisconnectModel {
    constructor(username, friendlyName, date, events) {
        this.username      = username;
        this.friendlyName  = friendlyName;
        this.date          = date;
        this.events        = events || [];
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
}
