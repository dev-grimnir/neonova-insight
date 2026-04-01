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

    async openDailyDisconnectDetail(dateStr) {   // dateStr like "2026-03-22"
        console.log('NeonovaReportController.openDailyDisconnectDetail() -> START for date:', dateStr);

        try {
            // Parse the date string (YYYY-MM-DD)
            const [year, month, day] = dateStr.split('-').map(Number);

            const startDate = new Date(year, month - 1, day);
            const endDate   = new Date(year, month - 1, day);

            // Use the NEW paginateReportLogs with full day hour/minute support
            const entries = await NeonovaHTTPController.paginateReportLogs(
                this.model.username,
                startDate,      // startDate
                endDate,        // endDate (same day)
                0,              // startHour
                0,              // startMinute  → 00:00
                23,             // endHour
                59              // endMinute    → 23:59
                // onProgress and signal left as undefined (defaults)
            );

            console.log(`paginateReportLogs returned ${entries ? entries.length : 0} entries for ${dateStr}`);

            // Existing processing (unchanged)
            const result = NeonovaCollector.cleanEntries(entries || []);
            const events = result.cleanedEntries || [];
            console.log(`cleanEntries returned ${events.length} cleaned events (ignored ${result.ignored || 0})`);

            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                new Date(dateStr),
                events
            );

            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('Daily detail failed:', err);
            alert('Could not load daily connection details. Check console for details.');
        }
    }
    
}
