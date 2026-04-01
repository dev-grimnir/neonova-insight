// =============================================
// NeonovaSnapshotView
// Dumb UI container only – extends NeonovaBaseModalView
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
      <div style="display:flex;align-items:center;justify-content:center;height:400px;background:#1f2937;border-radius:8px;color:#fff;">
        <div style="text-align:center;">
          <div class="spinner" style="border:4px solid #374151;border-top:4px solid #10b981;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
          <p style="margin:0;font-size:15px;">Building snapshot...</p>
        </div>
      </div>
    `;
  }

  setData(periodsList, uptimePercent, snapshotDate) {
    console.log('🔵 [SnapshotView] setData called with', periodsList?.length, 'periods');
    this.#periodsList = Array.isArray(periodsList) ? periodsList : [];
    this.#uptimePercent = Number(uptimePercent) || 0;
    this.#snapshotDate = new Date(snapshotDate);

    // ONLY store data — DO NOT render or clear yet
    console.log('🔵 [SnapshotView] data stored — will render after modal is shown');
  }

  show() {
    super.show();  // Let base class fully create/animate the modal first
    console.log('🔵 [SnapshotView] show() called — base modal should now be visible');

    // Gentle size increase ONLY after base show
    if (this.#container && this.#container.parentNode) {
      const modal = this.#container.parentNode;
      modal.style.cssText += `
        width: 92vw !important;
        height: 82vh !important;
        max-width: none !important;
        border-radius: 12px !important;
        background: #111827 !important;
      `;
      console.log('🔵 [SnapshotView] modal enlarged safely');
    }

    // Render chart NOW that the modal is in the DOM and visible
    if (this.#periodsList && this.#periodsList.length > 0) {
      this.#renderChart();
    } else {
      console.warn('⚠️ No periodsList — showing empty modal');
    }
  }

  hide() {
    if (this.#chart) {
      this.#chart.destroy();
      this.#chart = null;
    }
    super.hide();
  }

  #renderChart() {
    console.log('🔵 [SnapshotView] #renderChart START');

    // Header (dark background friendly)
    const formattedDate = this.#snapshotDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    let header = this.#container.querySelector('.snapshot-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'snapshot-header';
      header.style.cssText = 'margin-bottom:16px;font-weight:600;font-size:18px;color:#fff;';
      this.#container.appendChild(header);
    }
    header.innerHTML = `${formattedDate} – <span style="color:#10b981;">${this.#uptimePercent}% uptime</span>`;

    // Canvas with safe fixed height that fits the enlarged modal
    let canvas = this.#container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = `width: 100% !important; height: 520px !important; display: block;`;
      this.#container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (this.#chart) this.#chart.destroy();

    const { dataPoints } = this.#buildDatasetsFromPeriods();

    this.#chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          data: dataPoints,
          borderColor: 'transparent',
          backgroundColor: (context) => {
            const y = context.raw?.y ?? context.parsed?.y ?? 1;
            return y > 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)';
          },
          fill: 'origin',
          stepped: 'after',
          borderWidth: 0,
          pointRadius: 0,
          tension: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
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
          y: { min: -1.2, max: 1.2, display: false, grid: { display: false } }
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
                let periodIndex = Math.floor(context.dataIndex);
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

    this.#chart.update();
    console.log('🔵 [SnapshotView] chart instantiated successfully with', dataPoints.length, 'points');
  }
  
  #buildDatasetsFromPeriods() {
    const dataPoints = [];
    if (!this.#periodsList.length) return { dataPoints };

    const minSinceMidnight = d => d.getHours() * 60 + d.getMinutes();
    const yVal = c => c ? 1 : -1;

    this.#periodsList.forEach(p => {
      dataPoints.push({ x: minSinceMidnight(p.start), y: yVal(p.connected) });
    });

    const last = this.#periodsList[this.#periodsList.length - 1];
    if (last) dataPoints.push({ x: 1440, y: yVal(last.connected) });

    return { dataPoints };
  }

  #formatDuration(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
