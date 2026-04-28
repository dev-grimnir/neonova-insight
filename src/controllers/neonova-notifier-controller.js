// src/controllers/neonova-notifier-controller.js
// NeonovaNotifierController — STATIC class, single public method.
//
// The tab controller decides WHEN to notify (threshold tracking, suppression,
// network-tab gating). The notifier decides only WHO and HOW: it reads admins
// from the encrypted blob, builds a message, and dispatches to a transport.
//
// Transport is currently window.alert(). Will be swapped later for EmailJS,
// Cloudflare Worker → Twilio, or similar. Nothing else changes when that swap
// happens — the public surface is the single alert() method.

class NeonovaNotifierController {
    /**
     * Dispatch a notification for a single node state change.
     *
     * @param {('Disconnected'|'Connected')} status
     * @param {string} nodeName
     * @param {string} tabLabel
     */
    static async alert(status, nodeName, tabLabel) {
        const admins = await this.#readAdmins();
        if (!admins.length) return;

        const message = this.#buildMessage(status, nodeName, tabLabel);

        for (const admin of admins) {
            try {
                await this.#dispatch(admin.phoneNumber, message);
            } catch (err) {
                console.error(`[NeonovaNotifierController.alert] failed for ${admin.name}:`, err);
            }
        }
    }

    static #buildMessage(status, nodeName, tabLabel) {
        const verb = status === 'Connected' ? 'RESTORED' : 'DOWN';
        const time = new Date().toLocaleTimeString();
        return `NODE ${verb}: [${tabLabel}] ${nodeName} @ ${time}`;
    }

    static async #readAdmins() {
        try {
            const blob = localStorage.getItem('novaDashboardTabs');
            if (!blob) return [];
            const jsonStr = await NeonovaCryptoController.decryptData(blob);
            const parsed = JSON.parse(jsonStr);
            return Array.isArray(parsed.admins) ? parsed.admins : [];
        } catch (err) {
            console.error('[NeonovaNotifierController.#readAdmins] failed:', err);
            return [];
        }
    }

    /**
     * Stub transport — swap this body when wiring up the real SMS path.
     * Phone number is in the signature even though alert() ignores it,
     * so the signature stays stable when the real transport goes in.
     */
    static async #dispatch(phoneNumber, message) {
        window.alert(`[Notifier → ${phoneNumber}]\n${message}`);
    }
}
