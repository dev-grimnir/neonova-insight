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

    async openDailyDisconnectDetail(dateStr) {   // now expects "2026-03-22" string
        console.log('🚀 openDailyDisconnectDetail START for dateStr:', dateStr);

        try {
            // Parse the clean YYYY-MM-DD string
            const [year, month, day] = dateStr.split('-').map(Number);

            const overrides = {
                syear:  year.toString(),
                smonth: month.toString().padStart(2, '0'),
                sday:   day.toString().padStart(2, '0'),
                eyear:  year.toString(),
                emonth: month.toString().padStart(2, '0'),
                eday:   day.toString().padStart(2, '0')
            };

            console.log('📡 Clean overrides sent to paginateReportLogs:', overrides);

            const searchDoc = await NeonovaHTTPController.paginateReportLogs(
                this.model.username,
                overrides
            );

            console.log('📦 paginateReportLogs returned type:', typeof searchDoc);

            // Robust extraction
            let rawEntries = [];
            if (searchDoc instanceof Map) rawEntries = Array.from(searchDoc.values());
            else if (Array.isArray(searchDoc)) rawEntries = searchDoc;
            else if (searchDoc && typeof searchDoc === 'object') rawEntries = Object.values(searchDoc);

            console.log('🔄 rawEntries length:', rawEntries.length);

            const validEntries = rawEntries.filter(entry => entry && typeof entry === 'object');

            const processed = NeonovaCollector.cleanEntries(validEntries);
            const events = Array.isArray(processed) ? processed : [];

            console.log('✅ events length:', events.length);

            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                new Date(dateStr),
                events
            );

            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('❌ Daily detail failed:', err);
        }
    }
    
}
