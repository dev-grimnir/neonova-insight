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

// === SAFE ENCRYPTION UTILITIES FOR TAMPERMONKEY (no trailing commas, conservative syntax) ===
var masterKey = null;

async function deriveKey(passphrase, providedSalt) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
        "raw", 
        enc.encode(passphrase), 
        { name: "PBKDF2" }, 
        false, 
        ["deriveBits", "deriveKey"]
    );
    var salt = providedSalt || crypto.getRandomValues(new Uint8Array(16));
    
    return {
        key: await crypto.subtle.deriveKey(
            { 
                name: "PBKDF2", 
                salt: salt, 
                iterations: 100000, 
                hash: "SHA-256" 
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        ),
        salt: salt
    };
}

async function encryptData(plainText, passphrase) {
    if (!masterKey) {
        masterKey = await deriveKey(passphrase);
    }
    var enc = new TextEncoder();
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        masterKey.key,
        enc.encode(plainText)
    );
    
    var combined = new Uint8Array(28 + encrypted.byteLength);
    combined.set(masterKey.salt, 0);
    combined.set(iv, 16);
    combined.set(new Uint8Array(encrypted), 28);
    
    var binary = '';
    for (var i = 0; i < combined.byteLength; i++) {
        binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
}

async function decryptData(encryptedB64, passphrase) {
    var combined = Uint8Array.from(atob(encryptedB64), function(c) {
        return c.charCodeAt(0);
    });
    var salt = combined.slice(0, 16);
    var iv = combined.slice(16, 28);
    var ciphertext = combined.slice(28);
    
    if (!masterKey) {
        masterKey = await deriveKey(passphrase, salt);
    }
    
    var decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        masterKey.key,
        ciphertext
    );
    return new TextDecoder().decode(decrypted);
}

window.addEventListener('beforeunload', function() {
    masterKey = null;
});
