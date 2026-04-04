class NeonovaSnapshotController {
    constructor(username, friendlyName, startDate, endDate) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.startDate = startDate instanceof Date ? startDate : new Date(startDate);
        this.endDate   = endDate instanceof Date ? endDate : new Date(endDate);
        this.spinnerView = new NeonovaSpinnerView(friendlyName);
        this.model = null;
        this.view = null;

        this.loadAndShow();
    }

    async loadAndShow() {
        this.spinnerView.show();
        try {
            console.log(`Loading snapshot for ${this.username} from ${this.startDate.toISOString()} to ${this.endDate.toISOString()}`);

            // 1. Fetch raw logs
            const rawEntries = await NeonovaHTTPController.paginateReportLogs(
                this.username,
                this.startDate,
                this.endDate,
                0, 0, 23, 59
            );

            // 2. Clean entries
            const cleanResult = NeonovaCollector.cleanEntries(rawEntries || []);
            const cleaned = cleanResult.cleanedEntries || [];

            const metrics = NeonovaAnalyzer.computeMetrics(cleaned, this.startDate, this.endDate);
            const events = metrics?.entries || cleaned;

            // 4. Create model (pure data)
            this.model = new NeonovaSnapshotModel(
                this.username,
                this.friendlyName,
                this.startDate,
                this.endDate,
                events,
                metrics
            );
            
            this.spinnerView.hide();
            // 5. Create and show view
            this.view = new NeonovaSnapshotView(this, this.model);
            this.view.show();

        } catch (err) {
            this.spinnerView.hide();
            console.error('Failed to load snapshot:', err);
            alert('Could not load connection snapshot. Check console.');
        }
    }
}
