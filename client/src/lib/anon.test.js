import { getAnonToken, ANON_STORAGE_KEY } from "./anon";

test("creates a 32-hex-char token and persists it", () => {
    const token = getAnonToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(window.localStorage.getItem(ANON_STORAGE_KEY)).toBe(token);
    expect(ANON_STORAGE_KEY).toBe("checkia.anon");
});

test("returns the same token on later calls", () => {
    expect(getAnonToken()).toBe(getAnonToken());
});

test("replaces a malformed stored value", () => {
    window.localStorage.setItem(ANON_STORAGE_KEY, "abc");
    const token = getAnonToken();
    expect(token).toMatch(/^[0-9a-f]{32}$/);
});

test("still returns a stable token when storage is unavailable", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
    });
    const first = getAnonToken();
    const second = getAnonToken();
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toBe(first);
    spy.mockRestore();
});
