// =============================================
// NeonovaSnapshotController
// src/controllers/NeonovaSnapshotController.js
// =============================================

class NeonovaSnapshotController {
  #model = null;
  #view = null;

  constructor(containerElement) {
    // Controller creates and manages the view (per your exact spec)
    this.#view = new NeonovaSnapshotView(containerElement);
  }

  async loadForDate(snapshotDate, username, friendlyName = 'Modem') {
    this.#view.showLoading();   // ← show spinner immediately
  
    console.log('🔵 [SnapshotController] loadForDate START');
  
    // ... rest of your fetch, clean, model, metrics, periodsList code ...
  
    this.#view.setData(periodsList, uptimePercent, this.#model.snapshotDate);
  }

  // PRIMARY ENTRY POINT – fully self-contained
  async loadForDate(snapshotDate, username, friendlyName = 'Modem') {
    console.log('🔵 [SnapshotController] loadForDate START');
    // 1. Fetch raw Radius logs for the exact day
    const rawRadiusData = await NeonovaHTTPController.paginateReportLogs(
      username,
      snapshotDate,
      snapshotDate,
      null,
      null,
      null,
      null,
      null,
      null
    ) || [];

    console.log('🔵 [SnapshotController] rawRadiusData fetched, length:', rawRadiusData?.length);
    
    // 2. Sanitize via NeonovaCollector (single source of truth: cleanedEntries)
    const cleanedBlob = NeonovaCollector.cleanEntries(rawRadiusData);
    const cleanedEvents = cleanedBlob.cleanedEntries;

    console.log('🔵 [SnapshotController] cleanedEvents length:', cleanedEvents?.length);
    
    // 3. Create pure model
    this.#model = new NeonovaSnapshotModel(cleanedEvents, snapshotDate, friendlyName);

    console.log('🔵 [SnapshotController] model created');
    
    // 4. Get uptime % from existing Analyzer method
    const startOfDay = new Date(snapshotDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const metricsBlob = NeonovaAnalyzer.computeMetrics(
      cleanedEvents,
      startOfDay,
      endOfDay
    );

    const uptimePercent = metricsBlob.percentConnected || 0;

    console.log('🔵 [SnapshotController] uptime calculated:', uptimePercent + '%');

    // 5. Prepare the SINGLE list of statuses the view actually needs
    //    (wrapped start + end periods, every raw event preserved)
    const periodsList = NeonovaAnalyzer.computeSnapshotPeriods(
      cleanedEvents,
      startOfDay,
      endOfDay
    );

    console.log('🔵 [SnapshotController] periodsList created, length:', periodsList.length);

    // 6. Feed the one source of truth to the view – nothing more
    this.#view.setData(periodsList, uptimePercent, this.#model.snapshotDate);

    console.log('🔵 [SnapshotController] setData called on view');
    
    // 7. Only call show() / hide() on the view (exact interface from other modals)
    this.#view.show();

    console.log('✅ [SnapshotController] loadForDate FINISHED');
  }

  // Optional direct-load path (pre-cleaned events already available)
  loadSnapshot(snapshotDate, preCleanedEvents, friendlyName = 'Modem') {
    this.#model = new NeonovaSnapshotModel(preCleanedEvents, snapshotDate, friendlyName);

    const startOfDay = new Date(snapshotDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const metricsBlob = NeonovaAnalyzer.computeMetrics(preCleanedEvents, startOfDay, endOfDay);
    const uptimePercent = metricsBlob.percentConnected || 0;

    const periodsList = NeonovaAnalyzer.computeSnapshotPeriods(preCleanedEvents, startOfDay, endOfDay);

    this.#view.setData(periodsList, uptimePercent, this.#model.snapshotDate);
    this.#view.show();
  }

  // Public API for the caller to close the snapshot
  hide() {
    if (this.#view) this.#view.hide();
  }
}
