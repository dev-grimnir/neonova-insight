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

    // Clear and prepare container — do NOT render chart here
    this.#container.innerHTML = '';
    this.#container.style.cssText = `
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 20px;
      box-sizing: border-box;
      background: #111827;
    `;
  }

  show() {
    super.show();   // Let base class handle the modal open
    console.log('🔵 [SnapshotView] show() called');

    // Gentle enlargement of the existing modal (no stacking fights)
    if (this.#container && this.#container.parentNode) {
      const modal = this.#container.parentNode;
      modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 90vw !important;
        height: 80vh !important;
        max-width: none !important;
        border-radius: 12px !important;
        background: #111827 !important;
        z-index: 99999 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5) !important;
      `;
    }

    // Render chart AFTER modal is shown
    if (this.#periodsList && this.#periodsList.length > 0) {
      this.#renderChart();
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

    // Header
    const formattedDate = this.#snapshotDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    let header = this.#container.querySelector('.snapshot-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'snapshot-header';
      header.style.cssText = 'margin-bottom: 16px; font-weight: 600; font-size: 18px; color: #fff;';
      this.#container.appendChild(header);
    }
    header.innerHTML = `${formattedDate} – <span style="color:#10b981;">${this.#uptimePercent}% uptime</span>`;

    // Canvas with safe height
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
          backgroundColor: (ctx) => (ctx.raw?.y ?? 1) > 0 
            ? 'rgba(16, 185, 129, 0.85)' 
            : 'rgba(239, 68, 68, 0.85)',
          fill: 'origin',
          stepped: 'after',
          borderWidth: 0,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: {
            type: 'category',
            grid: { color: '#374151' },
            ticks: {
              maxRotation: 45,
              autoSkip: true,
              font: { size: 11 },
              color: '#9ca3af',
              callback: (val) => {
                if (typeof val !== 'number') return val;
                const h = Math.floor(val / 60);
                const m = val % 60;
                const hh = h % 12 || 12;
                const ampm = h < 12 ? 'AM' : 'PM';
                return `${hh}:${m.toString().padStart(2,'0')} ${ampm}`;
              }
            }
          },
          y: { min: -1.2, max: 1.2, display: false }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              title: () => '',
              label: (ctx) => {
                const idx = Math.min(Math.floor(ctx.dataIndex), this.#periodsList.length - 1);
                const p = this.#periodsList[idx];
                if (!p) return 'No data';
                const status = p.connected ? '✅ Connected' : '❌ Disconnected';
                const s = p.start.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', hour12:true});
                const e = p.end.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', hour12:true});
                return `${status} • ${s} – ${e} (${this.#formatDuration(p.duration)})`;
              }
            }
          }
        }
      }
    });

    this.#chart.update();
    console.log('🔵 [SnapshotView] chart ready with', dataPoints.length, 'points');
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
