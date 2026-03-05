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

// === SAFE ENCRYPTION UTILITIES + REMEMBERED KEY ===
var masterKey = null;

async function deriveKey(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
    );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return {
        key: await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,                    // ← FIXED: must be extractable so we can save it
            ["encrypt", "decrypt"]
        ),
        salt
    };
}

async function encryptData(plainText) {
    if (!masterKey) throw new Error("No master key");
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterKey.key, enc.encode(plainText));

    const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    new TextEncoder().encode(plainText)
    );
    console.log('[encrypt] encryptedBuffer byteLength:', encryptedBuffer.byteLength);
    
    if (!encryptedBuffer || encryptedBuffer.byteLength === 0) {
        throw new Error('subtle.encrypt returned invalid/empty buffer');
    }
    
    var salt = masterKey.salt || new Uint8Array(16);
    const combined = new Uint8Array(28 + encrypted.byteLength);
    combined.set(masterKey.salt, 0);
    combined.set(iv, 16);
    combined.set(new Uint8Array(encrypted), 28);
    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) binary += String.fromCharCode(combined[i]);
    return btoa(binary);
}

async function decryptData(encryptedB64) {
    if (!masterKey) throw new Error("No master key");
    const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey.key, ciphertext);
    return new TextDecoder().decode(decrypted);
}

// === REMEMBERED KEY (persistent, zero prompts after first use) ===
async function loadRememberedMasterKey() {
    const stored = localStorage.getItem('novaDashboardMasterKey');
    if (!stored) return null;
    try {
        const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
        return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    } catch (e) {
        localStorage.removeItem('novaDashboardMasterKey');
        return null;
    }
}

async function saveRememberedMasterKey(key) {
    const raw = await crypto.subtle.exportKey("raw", key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
    localStorage.setItem('novaDashboardMasterKey', b64);
}

window.addEventListener('beforeunload', () => { masterKey = null; });
