class NeonovaReportOrderController {
    constructor(username, friendlyName) {
        console.log("ReportOrderController constructor");
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.view = null;  // Created in start()
        this.start();
    }

    start() {
        // Controller creates its own view
        this.view = new NeonovaReportOrderView(this, this.username, this.friendlyName);

        // Listen to the view's events
        this.view.addEventListener('quickReportRequested', (event) => {
            const { timeframe } = event.detail;
            this.handleQuickReport(timeframe);
        });

        this.view.addEventListener('customReportRequested', (event) => {
            const { startIso, endIso } = event.detail;
            this.handleCustomReport(startIso, endIso);
        });

        // Now show the view (controller manages view lifecycle)
        this.view.show();
    }

    handleQuickReport(timeframe) {
        // Controller decides dates based on constant
        let startDate = null;
        const endDate = new Date();

        if (timeframe === '1_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 1);
        } else if (timeframe === '2_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 2);
        } else if (timeframe === '3_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 3);
        } else if (timeframe === '7_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === '30_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
        } else if (timeframe === '90_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 90);
        } else {
            console.error("NeonovaReportOrderController.handleQuickReport() -> Invalid Timeframe.");
            return;
        }

        this.startProgressController(startDate, endDate);
    }

    handleCustomReport(startIso, endIso) {
        const startDate = new Date(startIso);
        const endDate = new Date(endIso);
        this.startProgressController(startDate, endDate);
    }

    startProgressController(startDate, endDate) {
        // Controller creates the next controller
        const progressCtrl = new NeonovaProgressController();
        progressCtrl.start(
            this.username,
            this.friendlyName,
            startDate,
            endDate
        );
        this.view.close();
    }
}
