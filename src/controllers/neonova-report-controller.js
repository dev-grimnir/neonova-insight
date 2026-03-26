class NeonovaReportController {
    model;
    constructor(username, friendlyName, metrics, length, longDisconnects) {
        this.model = new NeonovaReportModel(
            username,
            friendlyName,
            metrics,
            length,
            metrics.longDisconnects || []
        );

        this.view = new NeonovaReportView(this, this.model);
        this.view.show();
    }

    async openDailyDisconnectDetail(clickedDate) {
        console.log("NeonovaReportController.openDailyDisconnectDetail() -> START");
        try {
            const startDate = new Date(clickedDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(clickedDate);
            endDate.setHours(23, 59, 59, 999);

            // Use the exact method you specified — no changes to HTTPController
            const overrides = {
                syear:  startDate.getFullYear().toString(),
                smonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
                sday:   startDate.getDate().toString().padStart(2, '0'),
                eyear:  endDate.getFullYear().toString(),
                emonth: (endDate.getMonth() + 1).toString().padStart(2, '0'),
                eday:   endDate.getDate().toString().padStart(2, '0')
            };

            const searchDoc = await NeonovaHTTPController.paginateReportLogs(
                this.model.username,
                overrides
            );

            // Run through collector (exactly like the main report)
            const collector = new NeonovaCollector();
            const processed = collector.process(searchDoc);   // adjust method name if your main report uses something else (e.g. processDailyLogs)

            // Pure data model
            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                clickedDate,
                processed.events || processed   // adjust based on your collector's output shape
            );

            // Launch the EKG modal (report stays open behind it)
            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('Daily detail failed:', err);
            alert('Could not load daily connection details. Check console.');
        }
    }
    
}
