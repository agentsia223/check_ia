// After a deploy, a tab left open still points at the old lazy chunks, which are gone.
// Vite fires "vite:preloadError" when one fails to load: reload once to get the new build.

export const PRELOAD_RELOAD_KEY = "checkia.preloadReloadAt";

// A failure this soon after our own reload means reloading does not help: stop there.
const LOOP_WINDOW_MS = 10000;

/**
 * Reload the page once when a lazy chunk fails to load. If the reloaded page fails again
 * within a few seconds (or sessionStorage is unavailable), the error is left to the app.
 * @param {Window} [win]
 */
export function installPreloadRecovery(win = window) {
    win.addEventListener("vite:preloadError", (event) => {
        try {
            const now = Date.now();
            // No stamp yet reads as 0, i.e. long ago.
            if (now - Number(win.sessionStorage.getItem(PRELOAD_RELOAD_KEY)) < LOOP_WINDOW_MS) return;
            win.sessionStorage.setItem(PRELOAD_RELOAD_KEY, now);
        } catch {
            return;
        }
        event.preventDefault();
        win.location.reload();
    });
}
