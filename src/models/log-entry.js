/**
 * @file src/models/log-entry.js
 * Simple data container for log events
 * No dependencies
 */
class LogEntry {
    constructor(timestamp, status, dateObj) {
        this.timestamp = timestamp;
        this.status = status; // "Start" or "Stop"
        this.dateObj = dateObj;
    }
}
