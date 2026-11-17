import { PRELOAD_RELOAD_KEY, installPreloadRecovery } from "./preloadRecovery";

function fakeWindow() {
    const target = new EventTarget();
    target.sessionStorage = window.sessionStorage;
    target.location = { reload: vi.fn() };
    return target;
}

const preloadError = () => new Event("vite:preloadError", { cancelable: true });

afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
});

test("a missing chunk reloads the page once and swallows the error", () => {
    const win = fakeWindow();
    installPreloadRecovery(win);

    const event = preloadError();
    win.dispatchEvent(event);

    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(window.sessionStorage.getItem(PRELOAD_RELOAD_KEY)).not.toBeNull();
});

test("a second failure right after the reload does not loop: the error surfaces", () => {
    const win = fakeWindow();
    installPreloadRecovery(win);
    win.dispatchEvent(preloadError());

    // The reloaded page hits the same error: no second reload.
    const again = fakeWindow();
    installPreloadRecovery(again);
    const event = preloadError();
    again.dispatchEvent(event);

    expect(again.location.reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
});

test("a later deploy in the same tab can recover again", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T10:00:00Z"));
    const win = fakeWindow();
    installPreloadRecovery(win);
    win.dispatchEvent(preloadError());

    vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
    win.dispatchEvent(preloadError());

    expect(win.location.reload).toHaveBeenCalledTimes(2);
});

test("without session storage it never reloads (no loop guard available)", () => {
    const win = fakeWindow();
    win.sessionStorage = {
        getItem: () => {
            throw new Error("blocked");
        },
        setItem: () => {
            throw new Error("blocked");
        },
    };
    installPreloadRecovery(win);
    const event = preloadError();
    win.dispatchEvent(event);

    expect(win.location.reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
});
