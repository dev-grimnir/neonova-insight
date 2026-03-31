class NeonovaReportController {
    model;
    constructor(username, friendlyName, metrics, length, longDisconnects) {
        this.model = new NeonovaReportModel(
            username,
            friendlyName,
            metrics,
            length,
            metrics.longDisconnects || []
        );

        this.view = new NeonovaReportView(this, this.model);
        this.view.show();
    }

    /**
   * Open Neonova Snapshot modal for any day in the report
   * This is how we "wire it in" – zero changes to your existing report logic.
   * Just call this from any row click, date link, or "View EKG" button.
   */
    async showSnapshotForDate(snapshotDate, username, friendlyName = 'Modem') {
      // Create the full-screen modal wrapper FIRST
      const modalContainer = document.createElement('div');
      modalContainer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        z-index: 9999; background: rgba(0,0,0,0.7); 
        display: flex; align-items: center; justify-content: center;
      `;
    
      // Instantiate controller (it creates the view internally)
      const snapshotController = new NeonovaSnapshotController(modalContainer);
    
      // ADD TO DOM BEFORE we call loadForDate / setData / show()
      document.body.appendChild(modalContainer);
    
      // Now load the data – this will render the header + chart inside the container
      await snapshotController.loadForDate(snapshotDate, username, friendlyName);
    
      // Close handler (click outside = close)
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
          modalContainer.remove();
          snapshotController.hide();
        }
      });
    } 
}
