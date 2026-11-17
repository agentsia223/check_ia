import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { createQueryClient } from "../lib/queryClient";
import { ApiError } from "../lib/api";
import { cancelCheck, createTextCheck, getCheck } from "../lib/checks";
import { MAX_LOAD_FAILURES, POLL_MAX_MS, TIMEOUT_SECONDS, pollDelay, useCheck } from "./useCheck";

vi.mock("../lib/checks", () => ({
    getCheck: vi.fn(),
    cancelCheck: vi.fn(),
    createTextCheck: vi.fn(),
}));

const T0 = new Date("2026-11-16T10:00:00Z").getTime();

const running = (overrides = {}) => ({
    id: "abc",
    kind: "text",
    claim: "Les cours reprennent lundi.",
    image_url: "",
    state: "running",
    verdict: null,
    explanation: "",
    sources: [],
    confidence: null,
    created_at: new Date(T0).toISOString(),
    completed_at: null,
    listed: false,
    is_owner: true,
    ...overrides,
});

const done = (overrides = {}) =>
    running({ state: "done", verdict: "faux", completed_at: new Date(T0 + 27000).toISOString(), ...overrides });

let location;
function LocationProbe() {
    location = useLocation();
    return null;
}

function setup(id = "abc") {
    const client = createQueryClient();
    const wrapper = ({ children }) => (
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[`/v/${id}`]}>
                {children}
                <LocationProbe />
            </MemoryRouter>
        </QueryClientProvider>
    );
    const view = renderHook(() => useCheck(id), { wrapper });
    return { ...view, client };
}

const advance = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

// React Query batches notifications on setTimeout(0); fake timers push a 0 ms timer
// created during a tick to +1 ms, so notify on a microtask instead.
beforeAll(() => notifyManager.setScheduler((callback) => queueMicrotask(callback)));
afterAll(() => notifyManager.setScheduler((callback) => setTimeout(callback, 0)));

let visibility = "visible";

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
    getCheck.mockReset();
    cancelCheck.mockReset();
    createTextCheck.mockReset();
});

afterEach(() => {
    vi.useRealTimers();
    delete document.visibilityState;
});

test("pollDelay starts at 2 s and grows by 1.5x to a 10 s ceiling", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(pollDelay)).toEqual([2000, 3000, 4500, 6750, 10000, 10000, 10000]);
    expect(POLL_MAX_MS).toBe(10000);
    expect(TIMEOUT_SECONDS).toBe(180);
});

test("polls a running check with backoff 2 s, 3 s, 4.5 s, 6.75 s, then every 10 s", async () => {
    getCheck.mockResolvedValue(running());
    const { result } = setup();
    await advance(0);
    expect(getCheck).toHaveBeenCalledTimes(1);
    expect(getCheck).toHaveBeenCalledWith("abc");
    expect(result.current.status).toBe("running");

    const expectCallsAfter = async (ms, calls) => {
        await advance(ms - 1);
        expect(getCheck).toHaveBeenCalledTimes(calls - 1);
        await advance(1);
        expect(getCheck).toHaveBeenCalledTimes(calls);
    };
    await expectCallsAfter(2000, 2);
    await expectCallsAfter(3000, 3);
    await expectCallsAfter(4500, 4);
    await expectCallsAfter(6750, 5);
    await expectCallsAfter(10000, 6);
    await expectCallsAfter(10000, 7);
});

test("reports elapsed seconds from created_at while running", async () => {
    getCheck.mockResolvedValue(running());
    const { result } = setup();
    await advance(0);
    expect(result.current.elapsedSeconds).toBe(0);
    await advance(5000);
    expect(result.current.elapsedSeconds).toBe(5);
});

test("stops polling once the check is done", async () => {
    getCheck.mockResolvedValueOnce(running()).mockResolvedValue(done());
    const { result } = setup();
    await advance(0);
    await advance(2000);
    expect(result.current.status).toBe("done");
    expect(result.current.check.verdict).toBe("faux");
    expect(result.current.elapsedSeconds).toBe(27);
    await advance(60000);
    expect(getCheck).toHaveBeenCalledTimes(2);
});

test.each([
    ["error", "error"],
    ["cancelled", "cancelled"],
])("a %s check is terminal: status %s, no polling", async (state, status) => {
    getCheck.mockResolvedValue(running({ state }));
    const { result } = setup();
    await advance(0);
    expect(result.current.status).toBe(status);
    await advance(30000);
    expect(getCheck).toHaveBeenCalledTimes(1);
});

test("times out after 180 s of running and stops polling", async () => {
    getCheck.mockResolvedValue(running());
    const { result } = setup();
    await advance(0);
    await advance(179000);
    expect(result.current.status).toBe("running");
    await advance(1000);
    expect(result.current.status).toBe("timeout");
    const calls = getCheck.mock.calls.length;
    await advance(60000);
    expect(getCheck).toHaveBeenCalledTimes(calls);
});

test.each([
    ["10 min ago (device clock ahead)", -600000],
    ["10 min in the future (device clock behind)", 600000],
])(
    "with created_at %s, elapsed time starts at first sight and the timeout counts watched time only",
    async (_label, offset) => {
        getCheck.mockResolvedValue(running({ created_at: new Date(T0 + offset).toISOString() }));
        const { result } = setup();
        await advance(0);
        expect(result.current.status).toBe("running");
        expect(result.current.elapsedSeconds).toBe(0);
        await advance(5000);
        expect(result.current.elapsedSeconds).toBe(5);
        await advance(174000);
        expect(result.current.status).toBe("running");
        await advance(1000);
        expect(result.current.status).toBe("timeout");
    }
);

test("a plausible created_at (under 300 s ago) is the start of the elapsed time", async () => {
    getCheck.mockResolvedValue(running({ created_at: new Date(T0 - 40000).toISOString() }));
    const { result } = setup();
    await advance(0);
    expect(result.current.elapsedSeconds).toBe(40);
    // The timeout still counts from when this page first saw it.
    await advance(170000);
    expect(result.current.status).toBe("running");
    await advance(10000);
    expect(result.current.status).toBe("timeout");
});

test("a failed poll sets networkTrouble, keeps polling, and clears on recovery", async () => {
    getCheck
        .mockResolvedValueOnce(running())
        .mockRejectedValueOnce(new ApiError(0, "network"))
        .mockResolvedValue(running());
    const { result } = setup();
    await advance(0);
    expect(result.current.networkTrouble).toBe(false);
    await advance(2000);
    expect(getCheck).toHaveBeenCalledTimes(2);
    expect(result.current.networkTrouble).toBe(true);
    expect(result.current.status).toBe("running");
    expect(result.current.check.claim).toBe("Les cours reprennent lundi.");
    await advance(3000);
    expect(getCheck).toHaveBeenCalledTimes(3);
    expect(result.current.networkTrouble).toBe(false);
});

test("a failed first load stays loading (no poll notice) and keeps trying", async () => {
    getCheck.mockRejectedValueOnce(new ApiError(0, "network")).mockResolvedValue(running());
    const { result } = setup();
    await advance(0);
    expect(result.current.status).toBe("loading");
    expect(result.current.networkTrouble).toBe(false);
    await advance(2000);
    expect(result.current.status).toBe("running");
    expect(result.current.networkTrouble).toBe(false);
});

test("a 500 on every first load gives unreachable after 3 tries and stops; reload() tries again", async () => {
    getCheck.mockRejectedValue(new ApiError(500, "server"));
    const { result } = setup();
    await advance(0);
    expect(result.current.status).toBe("loading");
    await advance(2000);
    expect(result.current.status).toBe("loading");
    await advance(3000);
    expect(getCheck).toHaveBeenCalledTimes(MAX_LOAD_FAILURES);
    expect(result.current.status).toBe("unreachable");
    expect(result.current.check).toBeNull();
    await advance(60000);
    expect(getCheck).toHaveBeenCalledTimes(3);

    getCheck.mockReset().mockResolvedValue(running());
    await act(() => result.current.reload());
    await advance(0);
    expect(result.current.status).toBe("running");
});

test("3 network failures in a row before any data give unreachable", async () => {
    getCheck.mockRejectedValue(new ApiError(0, "network"));
    const { result } = setup();
    await advance(0);
    await advance(2000);
    await advance(3000);
    expect(result.current.status).toBe("unreachable");
    await advance(60000);
    expect(getCheck).toHaveBeenCalledTimes(3);
});

test("a 4xx other than 404 stops at once with unreachable", async () => {
    getCheck.mockRejectedValue(new ApiError(403, "forbidden"));
    const { result } = setup();
    await advance(0);
    expect(result.current.status).toBe("unreachable");
    await advance(30000);
    expect(getCheck).toHaveBeenCalledTimes(1);
});

test("404 gives notfound and stops polling", async () => {
    getCheck.mockRejectedValue(new ApiError(404, "not_found"));
    const { result } = setup();
    await advance(0);
    expect(result.current.status).toBe("notfound");
    expect(result.current.check).toBeNull();
    expect(result.current.networkTrouble).toBe(false);
    await advance(30000);
    expect(getCheck).toHaveBeenCalledTimes(1);
});

test("polling pauses while the tab is hidden and refetches when it is shown again", async () => {
    getCheck.mockResolvedValue(running());
    setup();
    await advance(0);
    visibility = "hidden";
    act(() => {
        document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    });
    await advance(30000);
    expect(getCheck).toHaveBeenCalledTimes(1);
    visibility = "visible";
    act(() => {
        document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
    });
    await advance(0);
    expect(getCheck).toHaveBeenCalledTimes(2);
});

test("cancel() calls cancelCheck and ends cancelled without further polling", async () => {
    getCheck.mockResolvedValue(running());
    cancelCheck.mockResolvedValue(running({ state: "cancelled" }));
    const { result } = setup();
    await advance(0);
    await act(() => result.current.cancel());
    await advance(0);
    expect(cancelCheck).toHaveBeenCalledWith("abc");
    expect(result.current.status).toBe("cancelled");
    await advance(30000);
    expect(getCheck).toHaveBeenCalledTimes(1);
});

test("cancel() on a check that already finished (409) refetches it", async () => {
    getCheck.mockResolvedValueOnce(running()).mockResolvedValue(done());
    cancelCheck.mockRejectedValue(new ApiError(409, "not_running"));
    const { result } = setup();
    await advance(0);
    await act(() => result.current.cancel());
    await advance(0);
    expect(result.current.status).toBe("done");
});

test("cancel() rethrows other errors and keeps the check running", async () => {
    getCheck.mockResolvedValue(running());
    cancelCheck.mockRejectedValue(new ApiError(0, "network"));
    const { result } = setup();
    await advance(0);
    let thrown;
    await act(async () => {
        await result.current.cancel().catch((error) => {
            thrown = error;
        });
    });
    await advance(0);
    expect(thrown).toBeInstanceOf(ApiError);
    expect(result.current.status).toBe("running");
});

test("retry() after a timeout cancels the old check, then creates a new one with the same claim", async () => {
    getCheck.mockResolvedValue(running());
    cancelCheck.mockResolvedValue(running({ state: "cancelled" }));
    createTextCheck.mockResolvedValue(running({ id: "neuf123" }));
    const { result } = setup();
    await advance(0);
    await advance(TIMEOUT_SECONDS * 1000);
    expect(result.current.status).toBe("timeout");
    await act(() => result.current.retry());
    expect(cancelCheck).toHaveBeenCalledWith("abc");
    expect(cancelCheck.mock.invocationCallOrder[0]).toBeLessThan(createTextCheck.mock.invocationCallOrder[0]);
    expect(createTextCheck).toHaveBeenCalledWith("Les cours reprennent lundi.");
    expect(location.pathname).toBe("/v/neuf123");
});

test("retry() ignores a not_running conflict from the cancel", async () => {
    getCheck.mockResolvedValue(running());
    cancelCheck.mockRejectedValue(new ApiError(409, "not_running"));
    createTextCheck.mockResolvedValue(running({ id: "neuf123" }));
    const { result } = setup();
    await advance(0);
    await advance(TIMEOUT_SECONDS * 1000);
    await act(() => result.current.retry());
    expect(location.pathname).toBe("/v/neuf123");
});

test("retry() does not cancel a check the visitor does not own, nor a finished one", async () => {
    getCheck.mockResolvedValue(running({ is_owner: false }));
    createTextCheck.mockResolvedValue(running({ id: "neuf123" }));
    const { result } = setup();
    await advance(0);
    await advance(TIMEOUT_SECONDS * 1000);
    await act(() => result.current.retry());
    expect(cancelCheck).not.toHaveBeenCalled();
    expect(location.pathname).toBe("/v/neuf123");
});

test("retry() passes a refused creation (anon_quota) to the caller", async () => {
    getCheck.mockResolvedValue(running({ state: "error" }));
    createTextCheck.mockRejectedValue(new ApiError(403, "anon_quota"));
    const { result } = setup();
    await advance(0);
    let thrown;
    await act(async () => {
        await result.current.retry().catch((error) => {
            thrown = error;
        });
    });
    expect(cancelCheck).not.toHaveBeenCalled();
    expect(thrown.code).toBe("anon_quota");
    expect(location.pathname).toBe("/v/abc");
});

test("retry() on an image check goes back home without creating a check", async () => {
    getCheck.mockResolvedValue(running({ kind: "image_content", claim: "", state: "error" }));
    const { result } = setup();
    await advance(0);
    await act(() => result.current.retry());
    expect(createTextCheck).not.toHaveBeenCalled();
    expect(location.pathname).toBe("/");
});
