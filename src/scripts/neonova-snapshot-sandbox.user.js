// ==UserScript==
// @name         NovaSubscriber - Snapshot
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Real-time customer modem connection dashboard (separate script)
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/neonova-snapshot-sandbox.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/neonova-snapshot-sandbox.user.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/base-neonova-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-base-modal-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-snapshot-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-snapshot-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/models/neonova-snapshot-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-http-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/core/utils.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-analyzer.js
// ==/UserScript==

(function() {
    'use strict';

    // Only run in the MAIN content frame
    if (window.name !== 'MAIN') {
        return;
    }

    (async () => {
        const snapshot = new NeonovaSnapshotController(lucy99, linda, new Date(2026, 3, 1), new Date(2026, 4, 1));  
    })();
})();

