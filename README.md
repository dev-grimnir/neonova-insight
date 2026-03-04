# NeoNova Subscriber Dashboard & Reports

A powerful Tampermonkey userscript suite for NeoNova admins (`admin.neonova.net`). 

**Real-time customer monitoring + professional stability reports** with live polling, one-click customer addition, dual stability scores, rolling 7-day charts, and exports.

Built for field techs and small ISPs who need better visibility into modem flaps, uptime, and reconnect behavior.

![Dashboard Screenshot](https://github.com/dev-grimnir/neonova-post-processor/blob/dev/screenshots/dashboard-ss.png)
*(Live dashboard with polling controls, status table, and Add Customer modal)*

## Sample Interactive Report

Here's a real generated report from an 11 month (max length) monitoring period (interactive version with live charts, tooltips, and export buttons):

<p align="center">
  <a href="https://dev-grimnir.github.io/neonova-post-processor/screenshots/example_radius_report.html" target="_blank">
    <br>
    <strong>Open Interactive Sample Report →</strong>
  </a>
</p>

Or view the raw HTML directly:  
[View raw sample report](https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/refs/heads/dev/screenshots/example_radius_report.html)

## ✨ Current Features

### Live Dashboard
- Real-time customer status polling (configurable interval)
- Pause/Resume + manual Refresh
- One-click **Add Customer** modal (no more inline form clutter)
- Remove & Report buttons per customer
- Clean, consistent UI with Tailwind styling

### Professional Reports
- Dual stability scores (mean + median session-based)
- Uptime %, session/reconnect stats, peak analysis
- Hourly, daily, and **rolling 7-day** disconnect charts (Chart.js)
- Long disconnect table + export (HTML / CSV / PDF)
- Handles 140k+ row reports without breaking
- Total results counted + duplicates ignored note restored

### Under the Hood
- Fully refactored `NeonovaAnalyzer` (clean private helpers, heavily commented)
- Stress-tested on massive admin accounts
- Zero console errors on normal use

## Security & Data Handling

This is a purely client-side Tampermonkey userscript that runs exclusively in the browser on `admin.neonova.net`. No data is ever sent to external servers.

- **All persistent data is encrypted on disk**  
  The only data stored between sessions is the list of monitored customers (usernames, friendly names, latest status) in `localStorage` under the key `novaDashboardCustomers`.  
  This data is **fully AES-256-GCM encrypted** using the Web Crypto API. Encryption is applied immediately before saving and decryption immediately after loading.  
  - On first use: User enters a passphrase (or leaves blank to disable encryption).  
  - The derived key is remembered on the device (stored securely in localStorage) for zero-prompt subsequent loads.  
  - If encryption is disabled: data is stored in plaintext (useful for testing/dev).  
  - All in-memory processing (live polling, report generation) remains unencrypted for performance, as the data is already accessible in browser memory during runtime.

No historical RADIUS logs or generated reports are ever persisted automatically — they only exist in memory during the session and are exported manually by the user (HTML/CSV/PDF downloads).

For maximum security:  
- Use a strong passphrase.  
- To force a re-prompt or clear the key: run `localStorage.removeItem('novaDashboardMasterKey')` in the browser console.

## Installation

1. Install **Tampermonkey** (Chrome / Firefox / Edge).
2. Click these raw links — Tampermonkey will prompt to install:

   - **[NovaSubscriber Dashboard](https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/NovaSubscriber-Dashboard.user.js)** ← Main script
   - All supporting files are auto-required

3. Visit `https://admin.neonova.net` → log in → the dashboard panel appears automatically.

## Usage

- **Dashboard**: Monitor multiple customers live. Use "Add Customer", Refresh, or let it poll.
- **Reports**: Click any "Report" button → generates beautiful HTML with charts and stats.
- **Export**: HTML, CSV, or PDF from any report.

## Recent Major Updates (2026)

- Live dashboard with polling and Add Customer modal
- Complete analyzer refactor (modular, testable, documented)
- Rolling 7-day chart fixed and scaled properly
- Total results counted / ignored duplicates restored
- Button styling unified across the entire UI
- 140k-row stress testing passed

## Tech Stack

- Tampermonkey userscript
- Pure JavaScript + Chart.js
- Tailwind CSS (via CDN for dev speed)
- jsPDF + html2canvas for PDF export

## Contributing

PRs welcome! Especially interested in:
- More chart types
- Configurable scoring weights
- Dark/light theme toggle
- CLI version for bulk reports

## License

MIT

---

**Made with ❤️ for NeoNova admins who hate guessing why the modem keeps dropping.**
