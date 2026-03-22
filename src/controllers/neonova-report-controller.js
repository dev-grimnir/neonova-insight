class NeonovaReportController {
    constructor(username, friendlyName, metrics, length, longDisconnects) {
        this.model = new NeonovaReportModel(
            username,
            friendlyName,
            metrics,
            length,
            longDisconnects,
            sanitizedEntries
        );

        this.view = new NeonovaReportView(this.model);
        
    }
}
