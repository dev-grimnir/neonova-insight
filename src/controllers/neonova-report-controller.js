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
        console.log('🚀 openDailyDisconnectDetail START for date:', clickedDate);

        try {
            const startDate = new Date(clickedDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(clickedDate);
            endDate.setHours(23, 59, 59, 999);

            const overrides = {
                syear:  startDate.getFullYear().toString(),
                smonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
                sday:   startDate.getDate().toString().padStart(2, '0'),
                eyear:  endDate.getFullYear().toString(),
                emonth: (endDate.getMonth() + 1).toString().padStart(2, '0'),
                eday:   endDate.getDate().toString().padStart(2, '0')
            };

            console.log('📡 Calling submitSearch with overrides:', overrides);

            const searchDoc = await NeonovaHTTPController.submitSearch(
                this.model.username,
                overrides
            );

            console.log('📦 submitSearch returned document (Map)');

            // ← THIS IS THE FIX: convert Map → array before cleanEntries
            const rawEntries = Array.from(searchDoc.values());

            const processed = NeonovaCollector.cleanEntries(rawEntries);

            console.log('🔧 cleanEntries finished — processed events:', processed.length);

            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                clickedDate,
                processed   // this is now the cleaned array
            );

            console.log('✅ Daily model created with', dailyModel.events.length, 'events');

            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('❌ Daily detail failed:', err);
            alert('Could not load daily details. Check console.');
        }
    }
    
}
