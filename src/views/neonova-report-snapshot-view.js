/**
 * Inline wrapper for the snapshot paradigm in the report. Receives a
 * parent container and mounts a NeonovaSnapshotPanelView into it.
 * No chrome of its own — the report view owns its surrounding card.
 */
class NeonovaReportSnapshotView {

    #panel = null;

    constructor(controller, model, containerEl) {
        this.controller = controller;
        this.model = model;
        this.container = containerEl;
    }

    show() {
        if (!this.container) return;
        this.#panel = new NeonovaSnapshotPanelView(this.controller, this.model, this.container);
        this.#panel.show();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaReportSnapshotView;
}
