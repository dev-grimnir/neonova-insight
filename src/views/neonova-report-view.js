class NeonovaReportView extends NeonovaBaseModalView {   
    constructor(controller, model) {                      
        super(controller);
        this.controller = controller;
        this.model = model;
        this.username       = this.model.username;
        this.friendlyName   = this.model.friendlyName;
        this.metrics        = this.model.metrics;
        this.longDisconnects = this.model.longDisconnects;
        this.accent         = this.model.accent || 'emerald'; 
    }

        show() {
            const modalHTML = `
                <div id="report-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10000] opacity-0 transition-opacity duration-400">
                    <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                        <!-- Header -->
                        <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                            <div>
                                <div class="text-${this.accent}-400 text-xs font-mono tracking-widest">RADIUS CONNECTION REPORT</div>
                                <div class="text-3xl font-semibold text-white mt-1">${this.friendlyName || this.username}</div>
                            </div>
                            <button id="close-report-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
    
                        <!-- Scrollable content -->
                        <div id="report-content" class="flex-1 overflow-y-auto p-8 bg-[#18181b]">
                            <div class="flex items-center justify-center h-full text-zinc-400">Loading report...</div>
                        </div>
                    </div>
                </div>
            `;
    
        super.createModal(modalHTML);
        this.renderReport();
        this.attachReportListeners();
    }

    generateLongDisconnectsHTML() {
        if (this.longDisconnects.length === 0) return '';
    
        let html = `
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-zinc-800 border-b border-zinc-700">
                        <th class="p-6 text-left text-zinc-400 font-medium">Disconnected At</th>
                        <th class="p-6 text-left text-zinc-400 font-medium">Reconnected At</th>
                        <th class="p-6 text-right text-zinc-400 font-medium">Duration</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-700">`;
    
        this.longDisconnects.forEach(ld => {
            const durationStr = formatDuration(ld.durationSec);
            html += `
                <tr class="hover:bg-zinc-800/70 transition-colors">
                    <td class="p-6 text-zinc-200">${ld.stopDate.toLocaleString()}</td>
                    <td class="p-6 text-zinc-200">${ld.startDate.toLocaleString()}</td>
                    <td class="p-6 text-right font-semibold text-${this.accent}-400">${durationStr}</td>
                </tr>`;
        });
    
        html += `</tbody></table>`;
        return html;
    }

    generateLongDisconnSection() {
        if (this.longDisconnects.length === 0) {
            return `<p class="text-zinc-400 italic text-center py-12">No disconnects longer than 30 minutes.</p>`;
        }

        return `
            <details class="group mt-16 mb-16" open>
                <summary class="bg-zinc-800 hover:bg-zinc-700 transition-colors p-6 rounded-t-3xl cursor-pointer flex justify-between items-center text-${this.accent}-400 font-medium list-none">
                    <span>Long Disconnects (>30 minutes): ${this.longDisconnects.length}</span>
                    <span class="text-xs text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div class="bg-zinc-900 border border-zinc-700 border-t-0 rounded-b-3xl overflow-hidden">
                    ${this.generateLongDisconnectsHTML()}
                </div>
            </details>`;
    }

    initCharts() {
        const accentColor = this.accent === 'emerald' ? '#10b981' :
                           this.accent === 'blue' ? '#3b82f6' :
                           this.accent === 'violet' ? '#8b5cf6' : '#10b981';

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 12, right: 30, top: 10, bottom: 10 } },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    displayColors: false,
                    backgroundColor: '#27272a',
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb',
                    borderColor: accentColor,
                    borderWidth: 1,
                    padding: 12
                },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#27272a' } },
                x: { grid: { color: '#27272a' } }
            }
        };

        // Hourly chart
        new Chart(document.getElementById('hourlyChart'), {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{ label: 'Disconnects', data: this.metrics.hourlyDisconnects || Array(24).fill(0), backgroundColor: accentColor }]
            },
            options: { ...commonOptions }
        });

        // Daily chart (clickable drill-down)
        const dailyCanvas = document.getElementById('dailyChart');
        const dailyChartInstance = new Chart(dailyCanvas, {
            type: 'bar',
            data: {
                labels: this.metrics.dailyLabels || [],
                datasets: [{ 
                    label: 'Disconnects', 
                    data: this.metrics.dailyDisconnects || [], 
                    backgroundColor: accentColor 
                }]
            },
            options: { ...commonOptions }
        });

            // Inside initCharts() — replace the dailyCanvas click listener with this:
            dailyCanvas.style.cursor = 'pointer';
            dailyCanvas.addEventListener('click', (e) => {
                const chart = Chart.getChart(dailyCanvas);
                if (!chart) return;
        
                const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
                if (points.length === 0) return;
        
                const index = points[0].index;
                const label = this.metrics.dailyLabels?.[index];
        
                if (!label) return;
        
                let dateStr = label;
        
                // Convert MM/DD/YYYY or other formats to YYYY-MM-DD if needed
                if (label.includes('/')) {
                    const parts = label.split('/');
                    // Assuming MM/DD/YYYY format from your metrics
                    dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
        
                console.log('Daily bar clicked → requesting details for:', dateStr);
                this.controller.openDailyDisconnectDetail(dateStr);
            });

        // Rolling chart
        new Chart(document.getElementById('rollingChart'), {
            type: 'line',
            data: {
                labels: this.metrics.rollingLabels || [],
                datasets: [{
                    label: '7-Day Rolling Disconnects',
                    data: this.metrics.rolling7Day || [],
                    borderColor: accentColor,
                    borderWidth: 3,
                    tension: 0.1,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: accentColor,
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6
                }]
            },
            options: {
                ...commonOptions,
                plugins: {
                    ...commonOptions.plugins,
                    legend: { display: true, position: 'top', labels: { color: '#e5e7eb', boxWidth: 12 } }
                },
                scales: {
                    ...commonOptions.scales,
                    x: { ticks: { maxRotation: 45, minRotation: 45 } }
                }
            }
        });
    }

    attachReportListeners() {
        const closeBtn = this.modal.querySelector('#close-report-btn');
        const modalEl  = this.modal.querySelector('#report-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => { if (e.target === modalEl) this.hide(); });

        // Export buttons
        this.modal.querySelector('#export-csv-btn')?.addEventListener('click', () => this.exportToCSV());
        this.modal.querySelector('#export-html-btn')?.addEventListener('click', () => this.exportToHTML());
        this.modal.querySelector('#export-pdf-btn')?.addEventListener('click', () => this.exportToPDF());
    }

    exportToCSV() {
        const csv = this.generateCsvContent();
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${this.username || 'radius'}_report.csv`;
        a.click();
    }

    exportToHTML() {
        // Exports just the report (cleaner than whole page)
        const reportHTML = this.generateReportHTML();
        const fullHTML = `<!DOCTYPE html><html><head><title>RADIUS Report</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-zinc-950 text-white">${reportHTML}</body></html>`;
        const blob = new Blob([fullHTML], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${this.username || 'radius'}_report.html`;
        a.click();
    }

    async exportToPDF() {
        // jsPDF + html2canvas must be loaded by the main app (they were in the old <head>)
        if (typeof html2canvas === 'undefined' || typeof jsPDF === 'undefined') {
            alert('PDF libraries not loaded – contact dev if this persists');
            return;
        }
        const content = this.modal.querySelector('#report-content');
        const canvas = await html2canvas(content, { scale: 2 });
        const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${this.username || 'radius'}_report.pdf`);
    }

    generateCsvContent() {
        let csv = 'Metric,Value\n';
        csv += `Total Disconnects,${this.metrics.disconnects || 0}\n`;
        csv += `Average Session Duration,${this.metrics.avgSessionMin ? formatDuration(this.metrics.avgSessionMin * 60) : 'N/A'}\n`;
        csv += `Average Reconnect Time,${this.metrics.avgReconnectMin ? formatDuration(this.metrics.avgReconnectMin * 60) : 'N/A'}\n`;
        csv += `Percent Connected,${Number(this.metrics.percentConnected || 0).toFixed(1)}%\n`;
        csv += `Business Hours Disconnects,${this.metrics.businessDisconnects || 0}\n`;
        csv += `Off-Hours Disconnects,${this.metrics.offHoursDisconnects || 0}\n`;
        csv += `Time Since Last Disconnect,${this.metrics.timeSinceLastStr || 'N/A'}\n`;
        csv += `Peak Disconnect Hour,${this.metrics.peakHourStr || 'None'}\n`;
        csv += `Peak Disconnect Day,${this.metrics.peakDayStr || 'None'}\n`;
        csv += '\nLong Disconnects\nDisconnected At,Reconnected At,Duration\n';
        this.longDisconnects.forEach(ld => {
            csv += `${ld.stopDate.toLocaleString()},${ld.startDate.toLocaleString()},${formatDuration(ld.durationSec)}\n`;
        });
        return csv;
    }

    loadChartJS() {
        return new Promise((resolve) => {
            if (typeof window.Chart !== 'undefined') {
                resolve(true);
                return;
            }

            console.log('📈 Loading Chart.js for modal report...');

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
            script.async = true;
            script.onload = () => {
                console.log('✅ Chart.js loaded');
                resolve(true);
            };
            script.onerror = () => {
                console.error('❌ Failed to load Chart.js');
                resolve(false);
            };
            document.head.appendChild(script);
        });
    }

    async renderReport() {
        if (!this.modal) return;
        const content = this.modal.querySelector('#report-content');
        if (!content) return;

        content.innerHTML = this.generateReportHTML();

        // Wait for Chart.js then initialize
        await this.loadChartJS();

        requestAnimationFrame(() => {
            this.initCharts();
        });
    }
    
    generateReportHTML() {
        const longDisconnSection = this.generateLongDisconnSection();

        return `
            <div class="max-w-6xl mx-auto">
                <h1 class="text-5xl font-bold text-white text-center tracking-tight">RADIUS Connection Report</h1>
                <p class="text-${this.accent}-400 text-center text-2xl mt-2 mb-3">${this.friendlyName || this.username}</p>
                <p class="text-center text-zinc-400 mb-16">Monitoring period: ${this.metrics.monitoringPeriod || 'N/A'} (${Number(this.metrics.daysSpanned || 0).toFixed(1)} days, ${this.metrics.totalResultsCounted || 0} total results counted, ${this.metrics.ignoredAsDuplicates || 0} ignored as duplicates)</p>

                <!-- Stability Scores -->
                <div class="grid grid-cols-2 gap-8 mb-16">
                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center tooltip">
                        <div class="text-7xl font-bold text-${this.accent}-400">${Math.round(Math.max(0, Math.min(100, this.metrics.rawMeanScore || 0)))}/100</div>
                        <span class="tooltiptext text-left">
                            <strong>How this score is calculated (using average session length):</strong><br><br>
                            • Uptime component: ${Number(this.metrics.percentConnected || 0).toFixed(1)}% × 0.9 = ${Number(this.metrics.uptimeComponent || (Number(this.metrics.percentConnected || 0) * 0.9)).toFixed(1)}<br>
                            • Session quality bonus: ${Number(this.metrics.sessionBonusMean || 0).toFixed(1)}<br>
                            • Fast recovery bonus: ${Number(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                            • Flapping penalty: -${Number(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                            • Long outage penalty: -${Number(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                            Raw score: ${Number(this.metrics.rawMeanScore || 0).toFixed(1)}<br>
                            Displayed score: ${Math.round(Math.max(0, Math.min(100, this.metrics.rawMeanScore || 0)))}
                        </span>
                        <p class="text-zinc-400 text-lg mt-4">Mean Stability Score</p>
                    </div>

                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center tooltip">
                        <div class="text-7xl font-bold text-${this.accent}-400">${Math.round(Math.max(0, Math.min(100, this.metrics.rawMedianScore || 0)))}/100</div>
                        <span class="tooltiptext text-left">
                            <strong>How this score is calculated (using median session length):</strong><br><br>
                            • Uptime component: ${Number(this.metrics.percentConnected || 0).toFixed(1)}% × 0.9 = ${Number(this.metrics.uptimeComponent || (Number(this.metrics.percentConnected || 0) * 0.9)).toFixed(1)}<br>
                            • Session quality bonus: ${Number(this.metrics.sessionBonusMedian || 0).toFixed(1)}<br>
                            • Fast recovery bonus: ${Number(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                            • Flapping penalty: -${Number(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                            • Long outage penalty: -${Number(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                            Raw score: ${Number(this.metrics.rawMedianScore || 0).toFixed(1)}<br>
                            Displayed score: ${Math.round(Math.max(0, Math.min(100, this.metrics.rawMedianScore || 0)))}
                        </span>
                        <p class="text-zinc-400 text-lg mt-4">Median Stability Score</p>
                    </div>
                </div>

                <!-- Key Statistics (add the rest of your rows here exactly as they were in the original file) -->
                <div class="mb-16">
                    <h2 class="text-3xl font-semibold text-white mb-8">Key Statistics</h2>
                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-zinc-700 bg-zinc-800">
                                    <th class="p-6 text-left text-zinc-400 font-medium">Metric</th>
                                    <th class="p-6 text-right text-zinc-400 font-medium">Value</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-700 text-sm">
                                <tr><td class="p-6 text-zinc-200">Total Disconnects</td><td class="p-6 text-right font-mono text-white">${this.metrics.disconnects || 0}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Average Session Duration</td><td class="p-6 text-right text-white">${this.metrics.avgSessionMin ? formatDuration(this.metrics.avgSessionMin * 60) : 'N/A'}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Average Reconnect Time</td><td class="p-6 text-right text-white">${this.metrics.avgReconnectMin ? formatDuration(this.metrics.avgReconnectMin * 60) : 'N/A'}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Percent Connected</td><td class="p-6 text-right text-white">${Number(this.metrics.percentConnected || 0).toFixed(1)}%</td></tr>
                                <tr><td class="p-6 text-zinc-200">Business Hours Disconnects</td><td class="p-6 text-right text-white">${this.metrics.businessDisconnects || 0}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Off-Hours Disconnects</td><td class="p-6 text-right text-white">${this.metrics.offHoursDisconnects || 0}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Time Since Last Disconnect</td><td class="p-6 text-right text-white">${this.metrics.timeSinceLastStr || 'N/A'}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Peak Disconnect Hour</td><td class="p-6 text-right text-white">${this.metrics.peakHourStr || 'None'}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Peak Disconnect Day</td><td class="p-6 text-right text-white">${this.metrics.peakDayStr || 'None'}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Longest Session</td><td class="p-6 text-right text-white">${this.metrics.longestSessionMin ? formatDuration(this.metrics.longestSessionMin * 60) : 'N/A'}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Shortest Session</td><td class="p-6 text-right text-white">${this.metrics.shortestSessionMin ? formatDuration(this.metrics.shortestSessionMin * 60) : 'N/A'}</td></tr>
                                <tr><td class="p-6 text-zinc-200">Median Reconnect Time</td><td class="p-6 text-right text-white">${this.metrics.medianReconnectMin ? formatDuration(this.metrics.medianReconnectMin * 60) : 'N/A'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Charts -->
                <div class="space-y-16">
                    <div>
                        <h2 class="text-3xl font-semibold text-white mb-6">Disconnects by Hour of Day</h2>
                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8"><canvas id="hourlyChart" class="w-full h-96"></canvas></div>
                    </div>
                    <div>
                        <h2 class="text-3xl font-semibold text-white mb-6">Disconnects by Day</h2>
                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8"><canvas id="dailyChart" class="w-full h-96"></canvas></div>
                    </div>
                    <div>
                        <h2 class="text-3xl font-semibold text-white mb-6">Rolling 7-Day Disconnects</h2>
                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8"><canvas id="rollingChart" class="w-full h-96"></canvas></div>
                    </div>
                </div>

                ${longDisconnSection}

                <!-- Export Buttons -->
                <div class="flex justify-center gap-4 mt-20">
                    <button id="export-html-btn" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as HTML</button>
                    <button id="export-csv-btn" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as CSV</button>
                    <button id="export-pdf-btn" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as PDF</button>
                </div>

                <style>
                    .tooltip { position: relative; }
                    .tooltip .tooltiptext {
                        visibility: hidden; width: 420px; background: #27272a; color: #e5e5e5;
                        text-align: left; border-radius: 12px; padding: 16px; position: absolute;
                        z-index: 10; top: 100%; left: 50%; margin-left: -210px; opacity: 0;
                        transition: all 0.2s; font-size: 13px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
                    }
                    .tooltip:hover .tooltiptext { visibility: visible; opacity: 1; }

                    /* Green scrollbar (matches the original report and app theme) */
                    #report-content::-webkit-scrollbar {
                        width: 10px;
                    }
                    #report-content::-webkit-scrollbar-track {
                        background: #18181b;
                    }
                    #report-content::-webkit-scrollbar-thumb {
                        background: #10b981; /* emerald-500 green */
                        border-radius: 9999px;
                        border: 2px solid #18181b;
                    }
                    #report-content::-webkit-scrollbar-thumb:hover {
                        background: #34d399; /* slightly brighter on hover */
                    }
                </style>
                
            </div>
        `;
    }
}
