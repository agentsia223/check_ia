// Multipart upload with progress (image checks only). Loaded on demand by
// createImageCheck, so it stays out of the first load; same auth rules as apiFetch.
import { MOCK_API } from "./config";
import { ApiError, authHeaders, parseBody, urlFor, withAuth } from "./api";

const UPLOAD_TIMEOUT_MS = 120000;

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
            reject(new ApiError(0, "timeout"));
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
