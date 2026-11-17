// The one HTTP client for the Django API: auth headers, one refresh on 401, timeouts.
import { API_BASE_URL, MOCK_API } from "./config";
import { getAnonToken } from "./anon";
import { getSession, refreshSessionDetailed, signOutLocal } from "./supabase";

/** Error thrown for every failed API call. `status` 0 means the server was not reached. */
export class ApiError extends Error {
    /**
     * @param {number} status HTTP status, 0 for network failures and timeouts.
     * @param {string} code machine code from the server ("anon_quota", "not_found"…) or derived.
     * @param {string} [message] server message (French for /api/checks/), never shown raw for 5xx.
     * @param {any} [body] parsed response body, if any.
     */
    constructor(status, code, message = "", body = null) {
        super(message || code);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.body = body;
    }
}

const UPLOAD_TIMEOUT_MS = 120000;

const urlFor = (path) => `${API_BASE_URL}${String(path).replace(/^\/+/, "")}`;

const codeForStatus = (status) => {
    if (status === 400) return "invalid";
    if (status === 401) return "auth_required";
    if (status === 403) return "forbidden";
    if (status === 404) return "not_found";
    if (status === 409) return "conflict";
    if (status === 429) return "rate_limited";
    if (status >= 500) return "server";
    return "http_error";
};

const parseBody = (text) => {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const toApiError = (status, body) =>
    new ApiError(
        status,
        (body && typeof body.code === "string" && body.code) || codeForStatus(status),
        body && typeof body.error === "string" ? body.error : "",
        body
    );

function authHeaders(token, withAnon) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!token || withAnon) headers["X-Anon-Token"] = getAnonToken();
    return headers;
}

let refreshInFlight = null;

/** One refresh at a time: concurrent 401s share the same promise. */
function refreshOnce() {
    if (!refreshInFlight) {
        refreshInFlight = refreshSessionDetailed()
            .catch(() => ({ session: null, failure: "network" }))
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
}

/**
 * Run `send(token)` with the current session, refreshing once on a 401.
 * `send` resolves `{status, body}`. A refresh that fails for network reasons keeps
 * the session and throws ApiError(0, "network"); only a refused refresh (or a retry
 * that is still 401) signs out.
 */
async function withAuth(send) {
    const session = await getSession().catch(() => null);
    let result = await send(session?.access_token ?? null);
    if (result.status === 401 && session) {
        const { session: refreshed, failure } = await refreshOnce();
        if (failure === "network") throw new ApiError(0, "network");
        if (refreshed?.access_token) {
            result = await send(refreshed.access_token);
        }
        if (result.status === 401) {
            await signOutLocal();
            throw new ApiError(401, "auth_required", "", result.body);
        }
    }
    if (result.status < 200 || result.status >= 300) {
        throw toApiError(result.status, result.body);
    }
    return result.body;
}

async function realFetch(path, { method = "GET", json, formData, signal, timeoutMs = 20000, anonToken = false }) {
    return withAuth(async (token) => {
        if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
        const headers = authHeaders(token, anonToken);
        let body;
        if (json !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(json);
        } else if (formData) {
            body = formData;
        }

        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
        const onCallerAbort = () => controller.abort();
        if (signal) {
            if (signal.aborted) controller.abort();
            else signal.addEventListener("abort", onCallerAbort, { once: true });
        }

        try {
            const response = await fetch(urlFor(path), {
                method,
                headers,
                body,
                signal: controller.signal,
            });
            const text = response.status === 204 ? "" : await response.text();
            return { status: response.status, body: parseBody(text) };
        } catch (error) {
            if (signal?.aborted && !timedOut) throw error;
            throw new ApiError(0, "network");
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener("abort", onCallerAbort);
        }
    });
}

/**
 * Call the API.
 * @param {string} path relative to API_BASE_URL, e.g. "checks/abc/".
 * @param {{method?: string, json?: any, formData?: FormData, signal?: AbortSignal,
 *   timeoutMs?: number, anonToken?: boolean}} [options] `anonToken` also sends
 *   X-Anon-Token when signed in (used by the claim call).
 * @returns {Promise<any>} parsed JSON body, or null for empty responses.
 * @throws {ApiError} on HTTP errors (401 auth_required after one refresh), network failure
 *   or timeout (status 0, code "network"). A caller abort rethrows the AbortError.
 */
export async function apiFetch(path, options = {}) {
    if (MOCK_API) {
        const { mockFetch } = await import("./mockApi.js");
        return mockFetch(path, options);
    }
    return realFetch(path, options);
}

const abortError = (signal) => signal?.reason ?? new DOMException("Aborted", "AbortError");

function xhrSend(path, formData, token, onProgress, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(abortError(signal));
            return;
        }
        const xhr = new XMLHttpRequest();
        const onCallerAbort = () => xhr.abort();
        const done = () => signal?.removeEventListener("abort", onCallerAbort);
        xhr.open("POST", urlFor(path));
        xhr.timeout = UPLOAD_TIMEOUT_MS;
        Object.entries(authHeaders(token, false)).forEach(([name, value]) =>
            xhr.setRequestHeader(name, value)
        );
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && event.total > 0) {
                onProgress?.(event.loaded / event.total);
            }
        };
        xhr.onload = () => {
            done();
            if (xhr.status >= 200 && xhr.status < 300) onProgress?.(1);
            resolve({ status: xhr.status, body: parseBody(xhr.responseText) });
        };
        xhr.onerror = () => {
            done();
            reject(new ApiError(0, "network"));
        };
        xhr.ontimeout = () => {
            done();
            reject(new ApiError(0, "network"));
        };
        xhr.onabort = () => {
            done();
            reject(abortError(signal));
        };
        signal?.addEventListener("abort", onCallerAbort, { once: true });
        xhr.send(formData);
    });
}

/**
 * POST multipart data with upload progress.
 * @param {string} path
 * @param {FormData} formData
 * @param {(fraction: number) => void} [onProgress] called with 0..1.
 * @param {{signal?: AbortSignal}} [options] aborting rejects with the AbortError (not an ApiError).
 * @returns {Promise<any>} parsed JSON body.
 * @throws {ApiError} same rules as apiFetch.
 */
export async function apiUpload(path, formData, onProgress, { signal } = {}) {
    if (MOCK_API) {
        const { mockUpload } = await import("./mockApi.js");
        return mockUpload(path, formData, onProgress);
    }
    return withAuth((token) => xhrSend(path, formData, token, onProgress, signal));
}

const SERVER_MESSAGE_STATUSES = new Set([400, 403, 409, 429]);

/**
 * A French message to show for any error thrown by the API layer.
 * Uses the server's (French) message for expected 4xx errors; never shows raw exception text.
 * @param {unknown} error
 * @returns {string}
 */
export function errorMessageFr(error) {
    if (error instanceof ApiError) {
        if (error.status === 0) {
            return "Connexion impossible. Vérifiez votre connexion internet, puis réessayez.";
        }
        if (error.status === 401) return "Connectez-vous pour continuer.";
        if (error.status === 404) return "Cette vérification est introuvable.";
        if (SERVER_MESSAGE_STATUSES.has(error.status) && typeof error.body?.error === "string") {
            return error.body.error;
        }
        if (error.status === 429) return "Trop de demandes pour le moment. Réessayez plus tard.";
    }
    return "Un problème est survenu. Réessayez dans un instant.";
}
