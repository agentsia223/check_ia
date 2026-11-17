import { apiFetch, apiUpload, ApiError, errorMessageFr } from "./api";
import { getSession, refreshSessionDetailed, signOutLocal } from "./supabase";
import { getAnonToken } from "./anon";
import { API_BASE_URL } from "./config";

vi.mock("./supabase", () => ({
    getSession: vi.fn(),
    refreshSessionDetailed: vi.fn(),
    signOutLocal: vi.fn(),
}));

const jsonResponse = (status, body) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

let fetchMock;

beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    getSession.mockResolvedValue(null);
    refreshSessionDetailed.mockResolvedValue({ session: null, failure: "auth" });
    signOutLocal.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
});

const headersOf = (call) => new Headers(call[1].headers);

describe("apiFetch headers", () => {
    test("signed out: sends the anonymous token, no Authorization", async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, { ok: 1 }));

        await expect(apiFetch("checks/")).resolves.toEqual({ ok: 1 });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API_BASE_URL}checks/`);
        expect(init.method).toBe("GET");
        const headers = headersOf(fetchMock.mock.calls[0]);
        expect(headers.get("X-Anon-Token")).toBe(getAnonToken());
        expect(headers.get("Authorization")).toBeNull();
    });

    test("signed in: sends the bearer token, no anonymous token", async () => {
        getSession.mockResolvedValue({ access_token: "tok-1" });
        fetchMock.mockResolvedValue(jsonResponse(200, {}));

        await apiFetch("/checks/abc/");

        expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}checks/abc/`);
        const headers = headersOf(fetchMock.mock.calls[0]);
        expect(headers.get("Authorization")).toBe("Bearer tok-1");
        expect(headers.get("X-Anon-Token")).toBeNull();
    });

    test("anonToken option sends both when signed in (claim)", async () => {
        getSession.mockResolvedValue({ access_token: "tok-1" });
        fetchMock.mockResolvedValue(jsonResponse(200, { claimed: 1 }));

        await apiFetch("checks/claim/", { method: "POST", anonToken: true });

        const headers = headersOf(fetchMock.mock.calls[0]);
        expect(headers.get("Authorization")).toBe("Bearer tok-1");
        expect(headers.get("X-Anon-Token")).toBe(getAnonToken());
    });

    test("json bodies are serialised with a JSON content type", async () => {
        fetchMock.mockResolvedValue(jsonResponse(201, { id: "x" }));

        await apiFetch("checks/", { method: "POST", json: { kind: "text", text: "a" } });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe(JSON.stringify({ kind: "text", text: "a" }));
        expect(headersOf(fetchMock.mock.calls[0]).get("Content-Type")).toBe("application/json");
    });

    test("form data is sent as-is without a content type", async () => {
        fetchMock.mockResolvedValue(jsonResponse(201, {}));
        const fd = new FormData();
        fd.append("a", "b");

        await apiFetch("x/", { method: "POST", formData: fd });

        const [, init] = fetchMock.mock.calls[0];
        expect(init.body).toBe(fd);
        expect(headersOf(fetchMock.mock.calls[0]).get("Content-Type")).toBeNull();
    });
});

describe("apiFetch responses", () => {
    test("204 resolves to null", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        await expect(apiFetch("checks/a/", { method: "DELETE" })).resolves.toBeNull();
    });

    test("an error body becomes an ApiError with status, code and message", async () => {
        fetchMock.mockResolvedValue(
            jsonResponse(403, { error: "Vous avez utilisé votre vérification gratuite.", code: "anon_quota" })
        );

        const error = await apiFetch("checks/", { method: "POST" }).catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(403);
        expect(error.code).toBe("anon_quota");
        expect(error.message).toBe("Vous avez utilisé votre vérification gratuite.");
    });

    test("a non-JSON error falls back to a code derived from the status", async () => {
        fetchMock.mockResolvedValue(new Response("<html>boom</html>", { status: 502 }));

        const error = await apiFetch("checks/").catch((e) => e);

        expect(error.status).toBe(502);
        expect(error.code).toBe("server");
        expect(error.message).not.toMatch(/html/);
    });

    test("a non-JSON success body resolves to null", async () => {
        fetchMock.mockResolvedValue(new Response("", { status: 200 }));
        await expect(apiFetch("x/")).resolves.toBeNull();
    });
});

describe("apiFetch 401 handling", () => {
    test("with a session: refreshes once and retries with the new token", async () => {
        getSession.mockResolvedValue({ access_token: "old" });
        refreshSessionDetailed.mockResolvedValue({ session: { access_token: "new" }, failure: null });
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401, { error: "x", code: "auth_required" }))
            .mockResolvedValueOnce(jsonResponse(200, { done: true }));

        await expect(apiFetch("checks/?scope=mine")).resolves.toEqual({ done: true });

        expect(refreshSessionDetailed).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(headersOf(fetchMock.mock.calls[1]).get("Authorization")).toBe("Bearer new");
        expect(signOutLocal).not.toHaveBeenCalled();
    });

    test("still 401 after the refresh: signs out and throws auth_required", async () => {
        getSession.mockResolvedValue({ access_token: "old" });
        refreshSessionDetailed.mockResolvedValue({ session: { access_token: "new" }, failure: null });
        fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(401, {})));

        const error = await apiFetch("checks/?scope=mine").catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(401);
        expect(error.code).toBe("auth_required");
        expect(refreshSessionDetailed).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(signOutLocal).toHaveBeenCalledTimes(1);
    });

    test("refresh failure: signs out without retrying", async () => {
        getSession.mockResolvedValue({ access_token: "old" });
        refreshSessionDetailed.mockResolvedValue({ session: null, failure: "auth" });
        fetchMock.mockResolvedValue(jsonResponse(401, {}));

        const error = await apiFetch("checks/?scope=mine").catch((e) => e);

        expect(error.code).toBe("auth_required");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(signOutLocal).toHaveBeenCalledTimes(1);
    });

    test("a refresh that fails on the network keeps the session and throws network", async () => {
        getSession.mockResolvedValue({ access_token: "old" });
        refreshSessionDetailed.mockResolvedValue({ session: null, failure: "network" });
        fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(401, {})));

        const error = await apiFetch("checks/?scope=mine").catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.code).toBe("network");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(signOutLocal).not.toHaveBeenCalled();
    });

    test("a refresh that throws is treated as a network failure", async () => {
        getSession.mockResolvedValue({ access_token: "old" });
        refreshSessionDetailed.mockRejectedValue(new TypeError("Failed to fetch"));
        fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(401, {})));

        const error = await apiFetch("checks/?scope=mine").catch((e) => e);

        expect(error.code).toBe("network");
        expect(signOutLocal).not.toHaveBeenCalled();
    });

    test("concurrent 401s share one refresh", async () => {
        getSession.mockResolvedValue({ access_token: "old" });
        let finishRefresh;
        refreshSessionDetailed.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishRefresh = () => resolve({ session: { access_token: "new" }, failure: null });
                })
        );
        fetchMock.mockImplementation((url, init) =>
            Promise.resolve(
                new Headers(init.headers).get("Authorization") === "Bearer new"
                    ? jsonResponse(200, { url })
                    : jsonResponse(401, {})
            )
        );

        const first = apiFetch("checks/a/");
        const second = apiFetch("checks/b/");
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        await vi.waitFor(() => expect(finishRefresh).toBeTypeOf("function"));
        await new Promise((resolve) => setTimeout(resolve, 20));
        finishRefresh();

        await expect(first).resolves.toEqual({ url: `${API_BASE_URL}checks/a/` });
        await expect(second).resolves.toEqual({ url: `${API_BASE_URL}checks/b/` });
        expect(refreshSessionDetailed).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    test("without a session: no refresh, the 401 is passed through", async () => {
        fetchMock.mockResolvedValue(jsonResponse(401, { error: "Connectez-vous.", code: "auth_required" }));

        const error = await apiFetch("checks/?scope=mine").catch((e) => e);

        expect(error.status).toBe(401);
        expect(refreshSessionDetailed).not.toHaveBeenCalled();
        expect(signOutLocal).not.toHaveBeenCalled();
    });
});

describe("apiFetch network failures", () => {
    test("a rejected fetch throws ApiError(0, network)", async () => {
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

        const error = await apiFetch("checks/").catch((e) => e);

        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.code).toBe("network");
    });

    test("a timeout throws ApiError(0, network)", async () => {
        vi.useFakeTimers();
        fetchMock.mockImplementation(
            (url, { signal }) =>
                new Promise((resolve, reject) => {
                    signal.addEventListener("abort", () =>
                        reject(new DOMException("aborted", "AbortError"))
                    );
                })
        );

        const pending = apiFetch("checks/", { timeoutMs: 50 }).catch((e) => e);
        await vi.advanceTimersByTimeAsync(60);
        const error = await pending;

        expect(error).toBeInstanceOf(ApiError);
        expect(error.code).toBe("network");
    });

    test("a caller abort is rethrown as an AbortError, not a network error", async () => {
        const controller = new AbortController();
        fetchMock.mockImplementation(
            (url, { signal }) =>
                new Promise((resolve, reject) => {
                    signal.addEventListener("abort", () =>
                        reject(new DOMException("aborted", "AbortError"))
                    );
                })
        );

        const pending = apiFetch("checks/", { signal: controller.signal }).catch((e) => e);
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
        controller.abort();
        const error = await pending;

        expect(error).not.toBeInstanceOf(ApiError);
        expect(error.name).toBe("AbortError");
    });

    test("an already-aborted signal aborts immediately", async () => {
        const controller = new AbortController();
        controller.abort();
        fetchMock.mockImplementation((url, { signal }) =>
            signal.aborted
                ? Promise.reject(new DOMException("aborted", "AbortError"))
                : Promise.resolve(jsonResponse(200, {}))
        );

        const error = await apiFetch("checks/", { signal: controller.signal }).catch((e) => e);
        expect(error.name).toBe("AbortError");
    });
});

describe("apiUpload", () => {
    class FakeXHR {
        static instances = [];
        static script = [];

        constructor() {
            this.headers = {};
            this.upload = {};
            this.status = 0;
            this.responseText = "";
            FakeXHR.instances.push(this);
        }

        open(method, url) {
            this.method = method;
            this.url = url;
        }

        setRequestHeader(name, value) {
            this.headers[name] = value;
        }

        send(body) {
            this.body = body;
            const step = FakeXHR.script.shift();
            queueMicrotask(() => {
                if (step === "hang") return;
                if (step === "network") {
                    this.onerror?.();
                    return;
                }
                if (step === "timeout") {
                    this.ontimeout?.();
                    return;
                }
                this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
                this.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
                this.status = step.status;
                this.responseText = step.body === undefined ? "" : JSON.stringify(step.body);
                this.onload?.();
            });
        }

        abort() {
            this.aborted = true;
            this.onabort?.();
        }
    }

    const originalXHR = globalThis.XMLHttpRequest;

    beforeEach(() => {
        FakeXHR.instances = [];
        FakeXHR.script = [];
        globalThis.XMLHttpRequest = FakeXHR;
    });

    afterEach(() => {
        globalThis.XMLHttpRequest = originalXHR;
    });

    test("posts the form data with auth headers and reports progress", async () => {
        FakeXHR.script = [{ status: 201, body: { id: "img1" } }];
        const onProgress = vi.fn();
        const fd = new FormData();

        await expect(apiUpload("checks/", fd, onProgress)).resolves.toEqual({ id: "img1" });

        const xhr = FakeXHR.instances[0];
        expect(xhr.method).toBe("POST");
        expect(xhr.url).toBe(`${API_BASE_URL}checks/`);
        expect(xhr.body).toBe(fd);
        expect(xhr.headers["X-Anon-Token"]).toBe(getAnonToken());
        expect(onProgress).toHaveBeenCalledWith(0.5);
        expect(onProgress).toHaveBeenLastCalledWith(1);
    });

    test("refreshes once on 401 with a session", async () => {
        getSession.mockResolvedValue({ access_token: "old" });
        refreshSessionDetailed.mockResolvedValue({ session: { access_token: "new" }, failure: null });
        FakeXHR.script = [{ status: 401, body: {} }, { status: 201, body: { id: "ok" } }];

        await expect(apiUpload("checks/", new FormData())).resolves.toEqual({ id: "ok" });
        expect(FakeXHR.instances[1].headers.Authorization).toBe("Bearer new");
    });

    test("server errors become ApiError", async () => {
        FakeXHR.script = [{ status: 400, body: { error: "Image trop lourde.", code: "invalid" } }];

        const error = await apiUpload("checks/", new FormData()).catch((e) => e);
        expect(error.status).toBe(400);
        expect(error.code).toBe("invalid");
    });

    test("an abort signal cancels the upload with an AbortError", async () => {
        FakeXHR.script = ["hang"];
        const controller = new AbortController();

        const pending = apiUpload("checks/", new FormData(), undefined, { signal: controller.signal }).catch((e) => e);
        await vi.waitFor(() => expect(FakeXHR.instances).toHaveLength(1));
        controller.abort();
        const error = await pending;

        expect(FakeXHR.instances[0].aborted).toBe(true);
        expect(error).not.toBeInstanceOf(ApiError);
        expect(error.name).toBe("AbortError");
    });

    test("an already-aborted signal never opens a request", async () => {
        const controller = new AbortController();
        controller.abort();

        const error = await apiUpload("checks/", new FormData(), undefined, { signal: controller.signal }).catch((e) => e);

        expect(error.name).toBe("AbortError");
        expect(FakeXHR.instances).toHaveLength(0);
    });

    test.each([["network"], ["timeout"]])("%s failures become ApiError(0, network)", async (step) => {
        FakeXHR.script = [step];

        const error = await apiUpload("checks/", new FormData()).catch((e) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.code).toBe("network");
    });
});

describe("errorMessageFr", () => {
    test.each([
        [new ApiError(0, "network"), /connexion/i],
        [new ApiError(401, "auth_required"), /connectez-vous/i],
        [new ApiError(404, "not_found"), /introuvable/i],
        [new ApiError(429, "ip_cap"), /trop de/i],
        [new ApiError(500, "server"), /problème/i],
        [new Error("TypeError: undefined is not a function"), /problème/i],
    ])("%o gives a French message", (error, pattern) => {
        expect(errorMessageFr(error)).toMatch(pattern);
    });

    test("uses the server's French message for a 4xx with one", () => {
        const error = new ApiError(400, "invalid", "Le texte est vide.", { error: "Le texte est vide." });
        expect(errorMessageFr(error)).toBe("Le texte est vide.");
    });
});
