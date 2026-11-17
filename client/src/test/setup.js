import "@testing-library/jest-dom/vitest";

// jsdom gaps used by the app shell.
if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    });
}

window.scrollTo = () => {};

afterEach(() => {
    window.localStorage.clear();
});
