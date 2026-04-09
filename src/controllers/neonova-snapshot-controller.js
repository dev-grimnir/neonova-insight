class NeonovaSnapshotController {
    #history;

    constructor(username, friendlyName, startDate, endDate) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.startDate = startDate instanceof Date ? startDate : new Date(startDate);
        this.endDate   = endDate   instanceof Date ? endDate   : new Date(endDate);

        // Freeze the "captured at" moment — endDate never extends past now
        const now = new Date();
        if (this.endDate > now) this.endDate = now;

        this.spinnerView = new NeonovaSpinnerView(friendlyName);
        this.model = null;
        this.view = null;
        this.#history = [];

        this.#loadInitial();
    }

    async #loadInitial() {
        this.spinnerView.show();
        try {
            this.model = await this.#buildModel(this.startDate, this.endDate);
            this.spinnerView.hide();
            this.view = new NeonovaSnapshotView(this);
            this.view.show();
        } catch (err) {
            this.spinnerView.hide();
            console.error('Failed to load snapshot:', err);
            alert('Could not load connection snapshot. Check console.');
        }
    }

    async drillDown(dateStr) {   // "YYYY-MM-DD"
        const [year, month, day] = dateStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        let   endDate   = new Date(year, month - 1, day, 23, 59, 59, 999);

        // Inherit the parent's frozen cap — drilling into today never extends past it
        if (endDate > this.model.endDate) endDate = this.model.endDate;

        this.view.showLoading(dateStr);

        try {
            const newModel = await this.#buildModel(startDate, endDate);
            this.#history.push(this.model);
            this.model = newModel;
            this.view.render();
            this.view.setBackButtonVisible(true);
        } catch (err) {
            console.error('Drill-down failed:', err);
            this.view.render();   // restore the previous model's view
        }
    }

    goBack() {
        if (this.#history.length === 0) return;
        this.model = this.#history.pop();
        this.view.render();
        this.view.setBackButtonVisible(this.#history.length > 0);
    }

    async #buildModel(startDate, endDate) {
        const rawEntries = await NeonovaHTTPController.paginateReportLogs(
            this.username, startDate, endDate, 0, 0, 23, 59
        );
        const cleanResult = NeonovaCollector.cleanEntries(rawEntries || []);
        const cleaned = cleanResult.cleanedEntries || [];
        const metrics = NeonovaAnalyzer.computeMetrics(cleaned, startDate, endDate);

        return new NeonovaSnapshotModel(
            this.username,
            this.friendlyName,
            startDate,
            endDate,
            cleaned,
            metrics
        );
    }
}
