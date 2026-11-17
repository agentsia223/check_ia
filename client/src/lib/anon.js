// Anonymous browser token: lets a signed-out visitor own their free check.

export const ANON_STORAGE_KEY = "checkia.anon";

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;
let memoryToken = null;

function randomHex() {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Has this browser already created an anonymous token? Never creates one.
 * @returns {boolean}
 */
export function hasAnonToken() {
    if (memoryToken) return true;
    try {
        const stored = window.localStorage.getItem(ANON_STORAGE_KEY);
        return Boolean(stored && TOKEN_PATTERN.test(stored));
    } catch {
        return false;
    }
}

/**
 * Return this browser's anonymous token, creating it on first use.
 * @returns {string} 32 lowercase hex characters, persisted in localStorage under "checkia.anon".
 */
export function getAnonToken() {
    try {
        const stored = window.localStorage.getItem(ANON_STORAGE_KEY);
        if (stored && TOKEN_PATTERN.test(stored)) return stored;
        const token = randomHex();
        window.localStorage.setItem(ANON_STORAGE_KEY, token);
        return token;
    } catch {
        // Storage blocked (private mode, policy): keep one token for this page.
        if (!memoryToken) memoryToken = randomHex();
        return memoryToken;
    }
}
