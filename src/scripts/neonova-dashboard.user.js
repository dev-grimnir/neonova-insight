// ==UserScript==
// @name         NovaSubscriber - Dashboard
// @namespace    http://tampermonkey.net/
// @version      10.2
// @description  Real-time customer modem connection dashboard (separate script)
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/neonova-dashboard.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/neonova-dashboard.user.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-http-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-progress-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/base-neonova-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-report-order-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/models/customer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-dashboard-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-dashboard-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-report-order-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-progress-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/core/utils.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/models/log-entry.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-analyzer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-report-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-report-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-add-customer-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-add-customer-view.js
// ==/UserScript==

(function() {
    'use strict';

    // Only run in the MAIN content frame (same as report script)
    if (window.name !== 'MAIN') {
        return;
    }

    const dashboardController = new NeonovaDashboardController();

})();

