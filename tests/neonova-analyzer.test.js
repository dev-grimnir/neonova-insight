import { describe, it, expect, beforeEach } from 'vitest';
import  NeonovaAnalyzer from '../src/controllers/neonova-analyzer.js';

describe('NeonovaAnalyzer', () => {
    let analyzer;                    // ← we can put shared setup here if needed

    beforeEach(() => {
        // Runs before EVERY it() — perfect for resetting state
        // analyzer = new NeonovaAnalyzer(); // (not needed since it's static)
    });

    it('returns roughly empty object when given no entries', () => {
        const result = NeonovaAnalyzer.computeMetrics([]);

        expect(result).toHaveProperty('peakHourStr', 'None');
        expect(result.disconnects).toBe(0);
        expect(result.numSessions).toBe(0);
        expect(result.meanStabilityScore).toBe(0);
        expect(result.rolling7Day).toEqual([]);   // exact array match
    });

    it('correctly counts one completed session', () => {
        const entries = [
            { status: 'Start', dateObj: new Date('2025-06-10T08:00:00Z') },
            { status: 'Stop',  dateObj: new Date('2025-06-10T10:30:00Z') }
        ];

        const result = NeonovaAnalyzer.computeMetrics(entries);

        expect(result.disconnects).toBe(1);
        expect(result.numSessions).toBe(1);
        expect(result.totalConnectedSec).toBe(2.5 * 3600);
        expect(result.avgSessionMin).toBe('150.0');
        expect(result.meanStabilityScore).toBeGreaterThan(80);
    });
});
