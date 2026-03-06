/**
 * @file src/core/utils.js
 * Shared formatting and math helpers + Encryption
 * No dependencies
 */
function formatDuration(sec) {
    if (sec <= 0) return '0s';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    let parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0) parts.push(h + 'h');
    if (m > 0) parts.push(m + 'm');
    if (s > 0 || parts.length === 0) parts.push(s + 's');
    return parts.join(' ');
}

function getSessionBonus(metricMin) {
    const metricHours = parseFloat(metricMin) / 60 || 0;
    return 25 * Math.tanh(metricHours / 6);
}
