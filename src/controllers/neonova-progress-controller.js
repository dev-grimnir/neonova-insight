class NeonovaProgressController {
    constructor() {
        // No state needed here
    }

    /**
     * Orchestrates the entire report progress flow:
     * 1. Creates and shows progress view
     * 2. Fetches raw entries
     * 3. Cleans/dedupes
     * 4. Computes metrics
     * 5. Calls view.finish() → opens report in new tab
     * 6. Closes view on success or error
     * 
     * @param {string} username 
     * @param {string} friendlyName 
     * @param {Date|null} startDate 
     * @param {Date|null} endDate 
     * @param {AbortSignal|null} [signal=null] - Optional, for cancellation
     * @returns {Promise<void>} Resolves when report is complete or cancelled
     */
    async start(username, friendlyName, startDate = null, endDate = null, signal = null) {
        // 1. Create and show the progress view
        const progressView = new NeonovaProgressView(this, username, friendlyName);
        progressView.show();

        let rawEntries = [];

        try {
            // 2. Fetch raw log entries
            rawEntries = await NeonovaHTTPController.paginateReportLogs(
                username,
                startDate,
                endDate,
                (fetched, page, total) => {  
                    progressView.updateProgress(fetched, page, total);
                },
                signal || progressView.signal                  
            );

            // 3. Clean/dedupe
            const sanitizedEntries = NeonovaCollector.cleanEntries(rawEntries);

            // 4. Analyze & compute metrics
            const metrics = NeonovaAnalyzer.computeMetrics(sanitizedEntries, startDate, endDate);

            // 5. Success: tell view to finish (opens report tab + closes modal)
            const reportController = new NeonovaReportController(
                username,
                friendlyName,
                metrics,
                sanitizedEntries.length
            );
           
            progressView.markComplete();
               
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('Report generation cancelled by user');
                    // View already closed itself on abort
                    return;
                }

            console.error('Report generation failed:', err);
            progressView.showError(err.message || 'Failed to generate report');
        }
    }
}
