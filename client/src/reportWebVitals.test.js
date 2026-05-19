import reportWebVitals from "./reportWebVitals";
import * as webVitals from "web-vitals";

jest.mock("web-vitals", () => ({
    getCLS: jest.fn((callback) => callback({ name: "CLS" })),
    getFID: jest.fn((callback) => callback({ name: "FID" })),
    getFCP: jest.fn((callback) => callback({ name: "FCP" })),
    getLCP: jest.fn((callback) => callback({ name: "LCP" })),
    getTTFB: jest.fn((callback) => callback({ name: "TTFB" })),
}));

beforeEach(() => {
    jest.clearAllMocks();
});

test("reportWebVitals ignores missing or non-function callbacks", async () => {
    reportWebVitals();
    reportWebVitals("not-a-function");

    await Promise.resolve();

    expect(webVitals.getCLS).not.toHaveBeenCalled();
});
