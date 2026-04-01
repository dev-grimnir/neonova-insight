class NeonovaDailyDisconnectModel {
    constructor(username, friendlyName, date, events) {
        this.username      = username;
        this.friendlyName  = friendlyName;
        this.date          = date;
        this.events        = events || [];
    }

    getDateString() {
        return this.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
}
