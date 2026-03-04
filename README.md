# NeoNova Subscriber Dashboard & Reports

A powerful Tampermonkey userscript suite for NeoNova admins (`admin.neonova.net`). 

**Real-time customer monitoring + professional stability reports** with live polling, two-click customer addition, dual stability scores, rolling 7-day charts, and exports.

Built for admins, field techs, and small ISPs who need better visibility into modem flaps, uptime, and reconnect behavior.

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
- Stress-tested on massive accounts with over 100k results in one report
- Zero console errors on normal use

## Security & Data Handling

This is a **client-side Tampermonkey userscript** designed to make life easier for NeoNova administrators. It runs **entirely inside your browser** on `admin.neonova.net` and does nothing unless you are actively logged in.

### Why it can process large datasets quickly (and why that's not scary)
The script can generate reports that pull and analyze hundreds of thousands of RADIUS log entries in hours rather than days simply because it automates the exact same actions you already perform manually in the admin portal.  
- It uses the **exact same pagination endpoints** the official web UI already exposes.  
- Everything (fetching, cleaning, and calculating metrics) happens locally in your browser using standard JavaScript.  
- It does **not** bypass any rate limits, does **not** use hidden APIs, and does **not** create any extra load on the server beyond what a human clicking through pages would generate.  
In short: it just saves you from having to sit there clicking “Next” for 45 minutes.

### Authentication & Access
- The script **cannot function at all** without an active, 2FA-verified session on the NeoNova admin portal.  
- It never stores, transmits, or interacts with passwords, 2FA tokens, or any credentials.  
- It performs only actions that the currently logged-in user is already authorized to do through the normal web interface.

### Data Access
- The script only reads and processes data that is already visible or exportable in the standard NeoNova admin UI while you are logged in.  
- No additional privileges are requested or used.

### Persistent Storage (Encrypted)
- The **only** data saved between sessions is your personal list of monitored customers (usernames, friendly names, and latest status).  
- This data is stored in the browser’s `localStorage` and is **fully AES-256-GCM encrypted** on disk using the Web Crypto API.  
- On first use you set a passphrase (or leave it blank to disable encryption). The key is remembered securely on your device for zero-prompt future visits.  
- To force a re-prompt or wipe the key at any time: run `localStorage.removeItem('novaDashboardMasterKey')` in the console.

### No Persistent Logs or Reports
Historical RADIUS data and generated reports exist **only in memory** while the dashboard or report modal is open. They are never automatically saved to disk — you must explicitly export them (HTML/CSV/PDF) if needed.

The script does not run in the background, does not contact any external servers, and does not perform any actions outside of an active authenticated session.

If you have any security, compliance, or operational questions, feel free to reach out — we’re happy to walk through anything.

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
