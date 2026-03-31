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
    datasets: [
      {
        label: 'Connection Status',
        data: dataPoints,
        borderColor: 'transparent',
        backgroundColor: (context) => {
          return context.raw.y > 0 
            ? 'rgba(16, 185, 129, 0.85)'   // green above the line
            : 'rgba(239, 68, 68, 0.85)';   // red below the line
        },
        fill: 'origin',
        stepped: 'after',
        borderWidth: 0,
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
        min: startOfDay,
        max: endOfDay,
        grid: { color: '#e5e7eb', lineWidth: 1 },
        ticks: { maxRotation: 0, autoSkipPadding: 15 }
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
            const period = this.#periodsList[context.dataIndex];
            if (!period) return '';

            const status = period.connected ? 'Connected' : 'Disconnected';
            const startStr = period.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const endStr = period.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const durationStr = this.#formatDuration(period.duration);

            return `${status} - ${startStr} - ${endStr} = Duration: ${durationStr}`;
          }
        }
      }
    }
  });
}
}  

  #buildDatasetsFromPeriods() {
    const dataPoints = [];
  
    this.#periodsList.forEach(period => {
      const y = period.connected ? 1 : -1;
      dataPoints.push({ x: period.start, y: y });
      dataPoints.push({ x: period.end,   y: y });
    });
  
    // Close the chart at the end of the day
    const lastPeriod = this.#periodsList[this.#periodsList.length - 1];
    if (lastPeriod) {
      dataPoints.push({ x: lastPeriod.end, y: lastPeriod.connected ? 1 : -1 });
    }
  
    const startOfDay = new Date(this.#snapshotDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
  
    return {
      dataPoints,
      startOfDay,
      endOfDay
    };
  }

  #formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}
