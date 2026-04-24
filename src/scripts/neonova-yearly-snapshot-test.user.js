// ==UserScript==
// @name         NovaSubscriber - Yearly Snapshot Test
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Standalone test harness. Fires a 1-year snapshot for one customer.
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/core/utils.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/models/log-entry.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/models/neonova-snapshot-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/controllers/neonova-crypto-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/controllers/neonova-http-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/controllers/neonova-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/controllers/neonova-analyzer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/controllers/neonova-passphrase-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/controllers/neonova-snapshot-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/views/base-neonova-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/views/neonova-base-modal-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/views/neonova-passphrase-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/views/neonova-spinner-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/dev/src/views/neonova-snapshot-view.js
// ==/UserScript==

(function () {
    'use strict';

    if (window.name !== 'MAIN') return;

    // === CONFIGURE ME ===
    const USERNAME      = 'kandkpepper';
    const FRIENDLY_NAME = 'Display Name';
    // ====================

    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);

    const btn = document.createElement('button');
    btn.textContent = '▶ Yearly Snapshot Test';
    btn.style.cssText = [
        'position:fixed',
        'top:12px',
        'right:12px',
        'z-index:99999',
        'padding:10px 16px',
        'background:#10b981',
        'color:#000',
        'font-weight:600',
        'border:none',
        'border-radius:12px',
        'cursor:pointer',
        'font-family:monospace',
        'box-shadow:0 4px 12px rgba(0,0,0,0.4)'
    ].join(';');
    btn.onclick = () => {
        console.log(`[YearlyTest] ${USERNAME} from ${start.toISOString()} to ${end.toISOString()}`);
        new NeonovaSnapshotController(USERNAME, FRIENDLY_NAME, start, end);
    };
    document.body.appendChild(btn);
})();
