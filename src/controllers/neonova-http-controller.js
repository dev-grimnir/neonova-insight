// src/controllers/NeonovaHTTPController.js

class NeonovaHTTPController {
    /**************************************************************************
     * STATIC PROPERTIES
     **************************************************************************/

    static baseSearchUrl = 'https://admin.neonova.net/rat/index.php';

    static defaultFormData = {
        ip: '',
        session: '',
        nasip: '',
        statusview: 'both',
        sd: 'fairpoint.net',
        shour: '00',
        smin: '00',
        emonth: '',
        eday: '',
        eyear: '',
        ehour: '',
        emin: '',
        hits: '50',
        order: 'date',
        submit: 'Search'
    };

    /**************************************************************************
     * STATIC PRIVATE METHODS — declared first for Tampermonkey compatibility
     **************************************************************************/

    static #buildPaginationParams(username, sDate, eDate, hitsPerPage, offset) {
        const params = new URLSearchParams({
            acctsearch: '2',
            sd: 'fairpoint.net',
            iuserid: username,
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            syear: sDate.getFullYear().toString(),
            smonth: (sDate.getMonth() + 1).toString().padStart(2, '0'),
            sday: sDate.getDate().toString().padStart(2, '0'),
            shour: '00',
            smin: '00',
            order: 'date',
            hits: hitsPerPage.toString(),
            location: offset.toString(),
            direction: '0',
            dump: ''
        });
    
        // Critical change: if endDate is null or today, use blank end fields (server's "up to now")
        const now = new Date();
        const isToday = eDate.getFullYear() === now.getFullYear() &&
                        eDate.getMonth() === now.getMonth() &&
                        eDate.getDate() === now.getDate();
    
        if (!eDate || isToday) {
            // Blank end = include everything up to the present moment
            params.append('eyear', '');
            params.append('emonth', '');
            params.append('eday', '');
            params.append('ehour', '');
            params.append('emin', '');
        } else {
            // Explicit end date (for custom reports)
            params.append('eyear', eDate.getFullYear().toString());
            params.append('emonth', (eDate.getMonth() + 1).toString().padStart(2, '0'));
            params.append('eday', eDate.getDate().toString().padStart(2, '0'));
            params.append('ehour', '23');
            params.append('emin', '59');
        }
    
        return params;
    }

    static #buildPageUrl(params) {
        return `${this.baseSearchUrl}?${params.toString()}`;
    }

    /**
     * Fetches a page — returns HTML string or null on HTTP error.
     * Throws on network errors or AbortError (handled by caller).
     */
    static async #fetchPageHtml(url, signal = null) {
        const res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-cache',
            headers: {
                'Referer': url,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Upgrade-Insecure-Requests': '1'
            },
            signal
        });

        if (!res.ok) {
            console.warn(`HTTP ${res.status} while fetching pagination page`);
            return null;
        }

        return await res.text();
    }

    /**
     * Extracts the total entry count from the gray header row on the first results page.
     * Returns a number or null if the header is missing/not parsable.
     */
    static #extractTotalEntries(doc) {
        const bodyText = doc.body.textContent || '';
        const headerText = bodyText.substring(0, 10000);  // Wider search — header can be lower
    
        // More precise patterns based on your manual table
        const patterns = [
            /Entry:\s*\d+-\d+\s*of\s*([\d,]+)/i,               // "Entry: 1-100 of 1775"
            /of\s*([\d,]+)\s*(?![^\s]*\d)/i,                  // "of 1775" not followed by more numbers
            /Results.*?of\s*([\d,]+)/i,
            /Displaying.*?of\s*([\d,]+)/i,
            /Total.*?([\d,]+)/i
        ];
    
        for (const regex of patterns) {
            const match = headerText.match(regex);
            if (match && match[1]) {
                const cleaned = match[1].replace(/,/g, '');
                const total = parseInt(cleaned, 10);
                if (!isNaN(total) && total > 0) {
                    return total;
                }
            }
        }
    
        return null;
    }

    static #parsePageRows(doc) {
        const table = doc.querySelector('table[width="500"]') || doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
        if (!table) return [];
    
        const rows = Array.from(table.querySelectorAll('tr'));
        const entries = [];

        Array.from(table.rows).slice(1).forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 7) return;
    
            const timestampStr = cells[0].textContent.trim();
            const status = cells[4].textContent.trim();
            const sessionTime = cells[6].textContent.trim();
    
            // Parse as local time: browser assumes the string is in your timezone (EST)
            const dateObj = new Date(timestampStr.replace(' ', 'T'));
    
            if (isNaN(dateObj.getTime())) {
                console.warn('[#parsePageRows] Invalid date parse:', timestampStr);
                return;
            }
    
            entries.push({
                timestamp: timestampStr,
                status,
                sessionTime,
                dateObj
            });
        });
    
        return entries;
    }

    /**************************************************************************
     * STATIC PUBLIC METHODS
     **************************************************************************/

    static async safeFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            cache: 'no-cache',
        };
        const res = await fetch(url, { ...defaultOptions, ...options });
        if (!res.ok) {
            throw new Error(`Fetch failed: HTTP ${res.status}`);
        }
        return res;
    }

    static async submitSearch(username, overrides = {}) {
        const formData = new URLSearchParams({
            ...this.defaultFormData,
            iuserid: username,
            acctsearch: '2',
            ...overrides
        });

        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentDay = '01';
        if (!formData.has('syear')) formData.set('syear', currentYear);
        if (!formData.has('smonth')) formData.set('smonth', currentMonth);
        if (!formData.has('sday')) formData.set('sday', currentDay);

        const res = await fetch(this.baseSearchUrl, {
            method: 'POST',
            credentials: 'include',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            referrer: `${this.baseSearchUrl}?acctsearch=1&userid=${encodeURIComponent(username)}`,
        });

        if (!res.ok) {
            throw new Error(`Search failed: HTTP ${res.status}`);
        }

        const html = await res.text();
        return new DOMParser().parseFromString(html, 'text/html');
    }

    static findNextPageLink(doc) {
        return Array.from(doc.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
    }

    static getSearchUrl(username) {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');

        const params = new URLSearchParams({
            acctsearch: '2',
            sd: 'fairpoint.net',
            iuserid: username,
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            syear: currentYear,
            smonth: currentMonth,
            sday: '01',
            shour: '00',
            smin: '00',
            emonth: '',
            eday: '',
            eyear: '',
            ehour: '',
            emin: '',
            hits: '50',
            order: 'date',
            location: '0',
            direction: '1',
            dump: ''
        });

        return `https://admin.neonova.net/rat/index.php?${params.toString()}`;
    }


/**
 * paginateReportLogs — now with:
 *   • Total count scraped from first page and passed to onProgress as 3rd arg
 *   • AbortSignal support for cancellation (pass as final argument)
 *   • Returns the entries array directly
 *   • Backward-compatible: old onProgress handlers ignoring the 3rd arg still work
 */
static async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null, signal = null) {
    // Line 1: Log the start of the function with all input parameters.
    // Purpose: Debugging — shows exactly what dates, username, and callbacks were passed in.
    // If this log doesn't appear → the function never ran (caller error or crash before here).
    // Lines 4–11: Legacy argument handling (backward compatibility for old callers).
    // Purpose: Allows old code that called paginateReportLogs(username, onProgress) to still work.
    // How it works: If the second argument is a function, assume it's onProgress and shift parameters.
    // If startDate is a function → treat it as onProgress, set startDate/endDate/signal to defaults.
    // If endDate is a function → same thing.
    // This block is purely for compatibility — new callers should pass named params properly.
    if (typeof startDate === 'function') {
        onProgress = startDate;
        startDate = null;
        endDate = null;
        signal = null;
    } else if (typeof endDate === 'function') {
        onProgress = endDate;
        endDate = null;
        signal = null;
    }

    // Line 13: Get current time once (used for default start/end dates).
    // Purpose: Ensures consistent "now" reference throughout the function.
    const now = new Date();

    // Lines 14–15: Set default start date to beginning of current month if not provided.
    // Purpose: If caller didn't give startDate, default to first day of month at 00:00.
    // Why month start? Historical choice — most reports cover current billing cycle.
    const sDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);

    // Line 16: Set default end date to right now if not provided.
    // Purpose: If no endDate, include everything up to current moment.
    const eDate = endDate ? new Date(endDate) : new Date(now);

    // Line 18: Fixed page size — always request 100 entries per page.
    // Purpose: Consistent pagination. 100 is a balance between speed and server load.
    const hitsPerPage = 100;

    // Line 19: Array to hold all parsed log entries from all pages.
    // Purpose: Final output — accumulates every valid entry across pagination.
    const entries = [];

    // Line 20: Starting offset for pagination (0 = first page).
    // Purpose: Increments by hitsPerPage each loop to fetch next chunk.
    let offset = 0;

    // Line 21: Page counter (starts at 1) — used for logging and progress callback.
    let page = 1;

    // Line 22: Total entry count (scraped from first page header) — used to know when to stop.
    // Starts as null → set after first page.
    let total = null;

    // Line 26: Main pagination loop — keeps fetching until no more pages or total reached.
    while (true) {
        // Line 27: Build URL parameters for this page.
        // Calls private helper #buildPaginationParams with current offset.
        const params = this.#buildPaginationParams(username, sDate, eDate, hitsPerPage, offset);

        // Line 28: Construct full URL by appending params to baseSearchUrl.
        const url = this.#buildPageUrl(params);

        // Line 30–37: Try to fetch the page HTML.
        // Uses private #fetchPageHtml (which does fetch with credentials/no-cache).
        // Catches AbortError separately (user cancelled) → returns partial results.
        let html;
        try {
            html = await this.#fetchPageHtml(url, signal);
        } catch (err) {
            if (err.name === 'AbortError') {
                // If aborted (e.g., user cancelled report), sort what we have and return early.
                entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
                return entries;
            }
            // Any other fetch error (network, timeout) → log and break loop.
            console.warn('Unexpected error fetching page:', err);
            break;
        }

        // Line 39–41: If fetch returned null (HTTP error), stop loop.
        if (html === null) {
            console.warn('[paginateReportLogs] HTTP error on page', page, '- stopping');
            break; // HTTP error
        }

        // Line 43: Parse the HTML string into DOM document for querying.
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Lines 45–48: Extract total entry count ONLY from page 1.
        // Uses private #extractTotalEntries — if it fails, total stays null.
        if (page === 1 && total === null) {
            total = this.#extractTotalEntries(doc);

            if (total === null) {
                return null;
            }
        }

        // Line 50: Parse the rows from this page into LogEntry objects.
        // Uses private #parsePageRows — returns array of entries for this page only.
        const pageEntries = this.#parsePageRows(doc);

        // Line 52: Append this page's entries to the master list.
        entries.push(...pageEntries);

        // Lines 54–56: Call progress callback if provided.
        // Passes: total fetched so far, current page number, total count (or null).
        if (typeof onProgress === 'function') {
            onProgress(entries.length, page, total);
        }

        // Lines 58–64: Termination conditions.
        // Stop if this page had fewer than hitsPerPage → last page.
        if (pageEntries.length < hitsPerPage) {
            break;
        }

        // Line 66–67: Prepare for next page.
        offset += hitsPerPage;
        page++;
    }

    // Line 71: Log the very last entry in the array (should be the newest if server returns newest-first).
    if (entries.length > 0) {
        entries[entries.length - 1].timestamp, entries[entries.length - 1].status;
    }

    // Line 75: Return the raw, unsorted entries array.
    // Caller (e.g. getLatestEntry) can take entries[entries.length - 1] as newest.
    return entries;
    }

    static async getLatestEntry(username, sinceDate = null) {
        try {
            const now = new Date();
            let startDate = new Date(now.getTime() - (30 * 24 * 3600 * 1000));  // Default: 30 days
    
            if (sinceDate instanceof Date && !isNaN(sinceDate.getTime())) {
                const elapsedHours = (now.getTime() - sinceDate.getTime()) / (3600 * 1000);
                let bufferHours;
                if (elapsedHours < 1) {
                    bufferHours = 0.1667;  // ~10 min
                } else if (elapsedHours < 24) {
                    bufferHours = 1;
                } else {
                    bufferHours = 24;
                }
                startDate = new Date(sinceDate.getTime() - bufferHours * 3600 * 1000);
            }
    
            const entries = await this.paginateReportLogs(
                username,
                startDate,
                now
            );
    
            if (entries === null) {
                return null;
            }
    
            // Trust server's order: last entry is newest
            const newest = entries[entries.length - 1];
    
            return newest;
        } catch (err) {
            console.error('[getLatestEntry] failed:', err);
            return null;
        }
    }

}
