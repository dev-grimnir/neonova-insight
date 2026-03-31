// =============================================
// NeonovaSnapshotView
// Dumb UI container only – extends NeonovaBaseModalView
// Receives single source of truth via setData() and controls all rendering
// src/views/NeonovaSnapshotView.js
// =============================================

class NeonovaSnapshotView extends NeonovaBaseModalView {
  #chart = null;
  #periodsList = null;
  #uptimePercent = 0;
  #snapshotDate = null;
  #container = null;

  constructor(containerElement) {
    super();
    this.#container = containerElement;
  }

  showLoading() {
    this.#container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:320px;background:#f8f9fa;border-radius:8px;">
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="spinner" style="border:4px solid #f3f3f3;border-top:4px solid #10b981;border-radius:50%;width:36px;height:36px;animation:spin 1s linear infinite;margin-bottom:12px;"></div>
          <p style="margin:0;color:#666;font-size:15px;">Building Neonova Snapshot...</p>
        </div>
      </div>
    `;
  }

  /**
   * Single source of truth from controller.
   * periodsList = [{ start: Date, end: Date, connected: boolean, duration: number }, ...]
   * View builds EVERYTHING (header + Chart.js) from this list only.
   */
  setData(periodsList, uptimePercent, snapshotDate) {
    console.log('🔵 [SnapshotView] setData called with', periodsList?.length, 'periods');
    this.#periodsList = Array.isArray(periodsList) ? periodsList : [];
    this.#uptimePercent = Number(uptimePercent) || 0;
    this.#snapshotDate = new Date(snapshotDate);
    console.log('🔵 [SnapshotView] data stored, calling #renderChart');
    this.#renderChart();
  }

  show() {
    super.show(); // inherited from NeonovaBaseModalView – shows the modal
  }

  hide() {
    super.hide(); // inherited from NeonovaBaseModalView – hides the modal
  }

  #renderChart() {
    console.log('🔵 [SnapshotView] #renderChart START');
    // Header (date + uptime)
    const formattedDate = this.#snapshotDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let header = this.#container.querySelector('.neonova-snapshot-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'neonova-snapshot-header';
      header.style.cssText = 'margin-bottom:12px;font-weight:600;font-size:17px;color:#111;';
      this.#container.prepend(header);
    }
    header.innerHTML = `${formattedDate} – <span style="color:#10b981;">${this.#uptimePercent}% uptime</span>`;
    console.log('🔵 [SnapshotView] header created');
    // Canvas (create once)
    let canvas = this.#container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      this.#container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    // Destroy previous chart if any
    if (this.#chart) {
      this.#chart.destroy();
      this.#chart = null;
    }

    console.log('🔵 [SnapshotView] canvas ready, building datasets');

    // Build Chart.js datasets from the single periodsList (one source of truth)
    const { labels, connectedData, disconnectedData, centerData, startOfDay, endOfDay } = this.#buildDatasetsFromPeriods();
    console.log('🔵 [SnapshotView] datasets built, labels length:', labels.length);
    this.#chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Connected',
            data: connectedData,
            borderColor: 'transparent',
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            fill: 'origin',
            stepped: 'after',
            borderWidth: 0,
            pointRadius: 0,
            tension: 0
          },
          {
            label: 'Disconnected',
            data: disconnectedData,
            borderColor: 'transparent',
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            fill: 'origin',
            stepped: 'after',
            borderWidth: 0,
            pointRadius: 0,
            tension: 0
          },
          {
            label: 'Center Line',
            data: centerData,
            borderColor: '#1f2937',
            borderWidth: 4,
            fill: false,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            grid: { color: '#e5e7eb', lineWidth: 1 },
            ticks: { maxRotation: 0, autoSkipPadding: 15 }
          },
          y: {                                 // ← comma added
            min: -1.2,
            max: 1.2,
            display: false,
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: false,
            backgroundColor: '#111827',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (context) => {
                if (context.dataset.label === 'Center Line') return '';
                const period = this.#periodsList[context.dataIndex];
                if (!period) return context.dataset.label;

                const status = period.connected ? 'Connected' : 'Disconnected';
                const startStr = period.start.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                const endStr = period.end.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                const durationStr = this.#formatDuration(period.duration);

                return `${status} - ${startStr} - ${endStr} = Duration: ${durationStr}`;
              }
            }
          }
        }
      }
    });
    console.log('✅ [SnapshotView] new Chart() created successfully');
  }

  #buildDatasetsFromPeriods() {
    const labels = this.#periodsList.map(p => 
      p.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    );
  
    const connectedData = this.#periodsList.map(p => p.connected ? 1 : 0);
    const disconnectedData = this.#periodsList.map(p => p.connected ? 0 : -1);
    const centerData = this.#periodsList.map(() => 0);
  
    return { labels, connectedData, disconnectedData, centerData };
  }

  #formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}
