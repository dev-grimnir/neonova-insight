/**
 * Owns the data pipeline and history stack for a snapshot session.
 * Views are dumb: they call drillTo / goBack / canGoBack and re-render.
 *
 * Public surface:
 *   static async buildData(username, friendlyName, startDate, endDate)
 *       -> NeonovaSnapshotModel | null
 *   constructor(username, friendlyName, startDate, endDate, ViewClass)
 *       -> immediately fetches and shows the initial snapshot
 *   async drillTo(startDate, endDate) -> NeonovaSnapshotModel | null
 *   async goBack() -> NeonovaSnapshotModel | null
 *   canGoBack() -> boolean
 */
class NeonovaSnapshotController {

    constructor(username, friendlyName, startDate, endDate, ViewClass = null) {
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.historyStack = [];
        this.ViewClass = ViewClass;  // null when controller is used headlessly (inline/report)
        this.view = null;

        // If a view class is supplied, run the modal flow: show spinner, fetch,
        // swap spinner for view. Inline callers construct via buildData directly
        // and pass the model into their own view.
        if (ViewClass) {
            this.#loadAndShow(startDate, endDate);
        }
    }

    /* ============================================================
     *  STATIC DATA PIPELINE
     * ============================================================ */

    /**
     * Fetch → clean → compute → return NeonovaSnapshotModel.
     * Used by both the modal flow and any inline caller that wants a
     * snapshot model for a specific range without owning the pipeline.
     */
    static async buildData(username, friendlyName, startDate, endDate) {
        try {
            const raw = await NeonovaHttpController.paginateReportLogs(
                username, startDate, endDate
            );
            const cleaned = NeonovaCollector.cleanLogs(raw);
            const metrics = NeonovaAnalyzer.computeMetrics(cleaned, startDate, endDate);
            if (!metrics) return null;
            const entries = NeonovaAnalyzer.getEntries(cleaned, startDate).entries || [];

            return new NeonovaSnapshotModel(
                username,
                friendlyName || username,
                startDate,
                endDate,
                metrics,
                entries
            );
        } catch (err) {
            console.error('NeonovaSnapshotController.buildData failed', err);
            return null;
        }
    }

    /* ============================================================
     *  MODAL FLOW (spinner + view)
     * ============================================================ */

    async #loadAndShow(startDate, endDate) {
        const spinner = new NeonovaSpinnerView('Building snapshot…');
        spinner.show();

        const model = await NeonovaSnapshotController.buildData(
            this.username, this.friendlyName, startDate, endDate
        );
        spinner.hide();

        if (!model) {
            alert('No connection data found for this range.');
            return;
        }

        this.historyStack = [model];
        this.view = new this.ViewClass(this, model);
        this.view.show();
    }

    /* ============================================================
     *  INSTANCE HISTORY API
     * ============================================================ */

    /**
     * Push current onto history, fetch new range, return new model.
     * Caller (view) re-renders with the returned model. Null on failure.
     */
    async drillTo(startDate, endDate) {
        const model = await NeonovaSnapshotController.buildData(
            this.username, this.friendlyName, startDate, endDate
        );
        if (!model) return null;
        this.historyStack.push(model);
        return model;
    }

    /**
     * Pop top of history, return the now-current model. Null if nothing to go back to.
     */
    goBack() {
        if (this.historyStack.length <= 1) return null;
        this.historyStack.pop();
        return this.historyStack[this.historyStack.length - 1];
    }

    canGoBack() {
        return this.historyStack.length > 1;
    }

    /**
     * Used by inline callers (report view) to seed history when the initial
     * model was built directly from in-memory metrics, without going through
     * buildData.
     */
    seedHistory(model) {
        this.historyStack = [model];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaSnapshotController;
}
