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
  
    // Clear any previous content (including old spinner)
    this.#container.innerHTML = '';
    this.#container.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 16px;
      box-sizing: border-box;
    `;
    console.log('🔵 [SnapshotView] data stored, calling #renderChart');
    this.#renderChart();
  }

  show() {
    super.show();
    console.log('🔵 [SnapshotView] show() called — calling super.show()');
    // Force visibility
    if (this.#container && this.#container.parentNode) {
      this.#container.parentNode.style.display = 'flex';
      console.log('🔵 [SnapshotView] forced parent display:flex');
    }
  }

  hide() {
    super.hide(); // inherited from NeonovaBaseModalView – hides the modal
  }

  #renderChart() {
    console.log('🔵 [SnapshotView] #renderChart START');

    // Header
    const formattedDate = this.#snapshotDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let header = this.#container.querySelector('.neonova-snapshot-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'neonova-snapshot-header';
      header.style.cssText = 'margin-bottom:12px;font-weight:600;font-size:17px;color:#111;';
      this.#container.appendChild(header);   // use appendChild instead of prepend after clear
    }
    header.innerHTML = `${formattedDate} – <span style="color:#10b981;">${this.#uptimePercent}% uptime</span>`;
    console.log('🔵 [SnapshotView] header created');

    // Canvas
    let canvas = this.#container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '420px';        // good height for the EKG
      this.#container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    if (this.#chart) {
      this.#chart.destroy();
      this.#chart = null;
    }

    console.log('🔵 [SnapshotView] canvas ready, building datasets');

    const { dataPoints, startOfDay, endOfDay } = this.#buildDatasetsFromPeriods();

    this.#chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Connection Status',
          data: dataPoints,
          borderColor: 'transparent',
          backgroundColor: (context) => {
          // context.raw exists for real data points; fallback for legend/internal calls
          const y = context.raw?.y ?? context.parsed?.y ?? 1;
          return y > 0 
            ? 'rgba(16, 185, 129, 0.85)'   // connected (green)
            : 'rgba(239, 68, 68, 0.85)';   // disconnected (red)
          },
          fill: 'origin',
          stepped: 'after',
          borderWidth: 0,
          pointRadius: 0,
          tension: 0
        }]
      },
      options: {
        interaction: {
        intersect: false,
        mode: 'index'
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'category',
            grid: { color: '#374151', lineWidth: 1 },
            ticks: {
              maxRotation: 45,
              autoSkip: true,
              autoSkipPadding: 15,
              font: { size: 11 },
              color: '#9ca3af',
              // Convert minutes back to nice 12-hour time
              callback: function(val) {
                if (typeof val !== 'number') return val;
                const h = Math.floor(val / 60);
                const m = val % 60;
                const hh = h % 12 || 12;
                const ampm = h < 12 ? 'AM' : 'PM';
                return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
              }
            }
          },
          y: {
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
                // Try to map back to the nearest period by index (approximate is fine for tooltip)
                let periodIndex = Math.floor(context.dataIndex / 1); // adjust if needed
                if (periodIndex >= this.#periodsList.length) periodIndex = this.#periodsList.length - 1;
                
                const period = this.#periodsList[periodIndex];
                if (!period) return 'No data';
              
                const status = period.connected ? '✅ Connected' : '❌ Disconnected';
                const startStr = period.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const endStr = period.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                const durationStr = this.#formatDuration(period.duration);
              
                return `${status} • ${startStr} – ${endStr} (${durationStr})`;
              }
            }
          }
        }
      }
    });
    console.log('🔵 [SnapshotView] chart instantiated successfully with', dataPoints.length, 'points');
  }

  #buildDatasetsFromPeriods() {
    const dataPoints = [];
  
    if (this.#periodsList.length === 0) {
      return { dataPoints };
    }
  
    const minutesSinceMidnight = (date) => date.getHours() * 60 + date.getMinutes();
  
    const y = (connected) => connected ? 1 : -1;
  
    this.#periodsList.forEach((period) => {
      dataPoints.push({
        x: minutesSinceMidnight(period.start),
        y: y(period.connected)
      });
    });
  
    // Extend the LAST period all the way to midnight (right edge of chart)
    const lastPeriod = this.#periodsList[this.#periodsList.length - 1];
    if (lastPeriod) {
      const nextMidnightMinutes = 24 * 60; // 1440 = midnight next day
      dataPoints.push({
        x: nextMidnightMinutes,
        y: y(lastPeriod.connected)
      });
    }
  
    return { dataPoints };
  }

  #formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}
