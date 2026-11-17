// Calls for the /api/checks/ resource (see the Task 1 contract).
import { ApiError, apiFetch } from "./api";

const enc = encodeURIComponent;

/**
 * @typedef {{title: string, url: string, domain: string, date: string, snippet: string}} Source
 * @typedef {{id: string, kind: "text"|"image_content"|"image_ai", claim: string, image_url: string,
 *   state: "running"|"done"|"error"|"cancelled", verdict: string|null, explanation: string,
 *   sources: Source[], confidence: number|null, created_at: string, completed_at: string|null,
 *   listed: boolean, is_owner: boolean}} Check
 * @typedef {{id: string, kind: string, claim: string, state: string, verdict: string|null,
 *   source_count: number, created_at: string, listed: boolean}} CheckSummary
 * @typedef {{count: number, page: number, page_size: number, results: CheckSummary[]}} CheckPage
 */

/** @param {string} text @returns {Promise<Check>} */
export function createTextCheck(text) {
    return apiFetch("checks/", { method: "POST", json: { kind: "text", text } });
}

/**
 * @param {{file: File, kind: "image_content"|"image_ai", claimText?: string,
 *   onProgress?: (fraction: number) => void}} params
 * @returns {Promise<Check>}
 */
export function createImageCheck({ file, kind, claimText = "", onProgress }) {
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("image", file);
    formData.append("claim_text", claimText);
    // The upload code loads on demand; failing to download it is a network failure.
    return import("./upload").then(
        ({ apiUpload }) => apiUpload("checks/", formData, onProgress),
        () => {
            throw new ApiError(0, "network");
        }
    );
}

/** @param {string} id @returns {Promise<Check>} */
export function getCheck(id) {
    return apiFetch(`checks/${enc(id)}/`);
}

/**
 * @param {{scope?: "library"|"mine", q?: string, verdict?: string, page?: number}} [params]
 * @returns {Promise<CheckPage>}
 */
export function listChecks({ scope = "library", q = "", verdict = "", page = 1 } = {}) {
    const params = new URLSearchParams({ scope });
    if (q) params.set("q", q);
    if (verdict) params.set("verdict", verdict);
    if (page && page !== 1) params.set("page", String(page));
    return apiFetch(`checks/?${params.toString()}`);
}

/** @param {string} id @param {boolean} listed @returns {Promise<Check>} */
export function setListed(id, listed) {
    return apiFetch(`checks/${enc(id)}/`, { method: "PATCH", json: { listed } });
}

/** @param {string} id @returns {Promise<null>} */
export function deleteCheck(id) {
    return apiFetch(`checks/${enc(id)}/`, { method: "DELETE" });
}

/** @param {string} id @returns {Promise<Check>} */
export function cancelCheck(id) {
    return apiFetch(`checks/${enc(id)}/cancel/`, { method: "POST" });
}

/**
 * @param {string} id
 * @param {{helpful: boolean|null, message?: string}} feedback
 * @returns {Promise<any>}
 */
export function sendFeedback(id, { helpful, message = "" }) {
    return apiFetch(`checks/${enc(id)}/feedback/`, {
        method: "POST",
        json: { helpful, message },
    });
}

/** @param {string} id @returns {Promise<CheckSummary[]>} up to 3 related listed checks. */
export function getRelated(id) {
    return apiFetch(`checks/${enc(id)}/related/`);
}

/** Attach this browser's anonymous checks to the signed-in user. @returns {Promise<{claimed: number}>} */
export function claimAnonChecks() {
    return apiFetch("checks/claim/", { method: "POST", anonToken: true });
}
