/**
 * In-memory /api/checks/ for local preview without a backend (VITE_MOCK_API=1).
 * Loaded only through a dynamic import guarded by MOCK_API, so production builds drop it.
 *
 * NO AUTH: the mock ignores sessions and tokens except the anonymous quota.
 * `scope=mine` answers signed out, the "owned" fixtures are always yours, and
 * owner-only actions never return 401. Do not rely on it for auth behaviour;
 * test that against lib/api.js with a mocked lib/supabase.js instead.
 */
import { ApiError } from "./api";
import { LISTABLE_VERDICTS } from "./verdict";

export const mockConfig = {
    /** Simulated network latency for every call. */
    latencyMs: 250,
    /** A running check completes this long after creation. */
    runMs: 8000,
    /** Free checks per anonymous browser, as on the server. */
    anonFreeChecks: 1,
};

const PAGE_SIZE = 20;
const MINUTE = 60 * 1000;

const SOURCES = [
    {
        title: "Communiqué du ministère de l'Énergie",
        url: "https://energie.gouv.ml/communique",
        domain: "energie.gouv.ml",
        date: "2026-11-12",
        snippet: "Le ministère précise les conditions du tarif social.",
    },
    {
        title: "Tarif social : ce qui change vraiment",
        url: "https://benbere.org/tarif-social",
        domain: "benbere.org",
        date: "2026-11-13",
        snippet: "",
    },
    {
        title: "Point de presse EDM-SA",
        url: "https://edm-sa.ml/presse",
        domain: "edm-sa.ml",
        date: "2026-11-13",
        snippet: "",
    },
    {
        title: "Journal de 20 h, extrait",
        url: "https://ortm.ml/journal",
        domain: "ortm.ml",
        date: "2026-11-14",
        snippet: "",
    },
];

const EXPLANATIONS = {
    vrai: "Plusieurs sources officielles concordantes confirment cette information.",
    faux: "Aucun communiqué officiel ne mentionne cette annonce. Le message qui circule déforme le titre d'un article sur un tarif social réservé à certains abonnés.",
    incertain: "Les sources disponibles ne permettent pas de trancher. Check-IA préfère ne pas rendre de verdict.",
    ia_detectee: "L'image présente plusieurs indices d'une génération par intelligence artificielle.",
    ia_non_detectee: "Aucun indice de génération par intelligence artificielle n'a été relevé. Cela ne dit pas si l'image est utilisée dans son vrai contexte.",
    analyse: "L'image montre une rue inondée. Aucune affirmation précise n'a été fournie pour la vérifier.",
};

let store = [];
let sequence = 0;
let feedback = [];

const newId = () => {
    sequence += 1;
    return `mock${String(sequence).padStart(6, "0")}`;
};

const iso = (ms) => new Date(ms).toISOString();

function makeCheck(overrides) {
    const createdAt = overrides.createdMs ?? Date.now();
    const state = overrides.state ?? "done";
    return {
        id: overrides.id ?? newId(),
        kind: overrides.kind ?? "text",
        claim: overrides.claim ?? "",
        image_url: overrides.image_url ?? "",
        state,
        verdict: overrides.verdict ?? null,
        explanation: overrides.explanation ?? "",
        sources: overrides.sources ?? [],
        confidence: overrides.confidence ?? null,
        created_at: iso(createdAt),
        completed_at: state === "running" ? null : iso(createdAt + 27 * 1000),
        listed: overrides.listed ?? false,
        // Internal fields, never serialised.
        _owned: overrides.owned ?? false,
        _anon: overrides.anon ?? "",
        _finalVerdict: overrides.finalVerdict ?? null,
    };
}

/** Reset the store to the fixtures (also used by tests). */
export function resetMockStore(now = Date.now()) {
    sequence = 0;
    feedback = [];
    store = [
        makeCheck({
            id: "8f3k2faux0",
            claim: "Le gouvernement a annoncé la gratuité de l'électricité pour tous les ménages de Bamako à partir de janvier.",
            verdict: "faux",
            explanation: EXPLANATIONS.faux,
            sources: SOURCES,
            listed: true,
            owned: true,
            createdMs: now - 12 * MINUTE,
        }),
        makeCheck({
            id: "r2m7vrai00",
            claim: "Report de la rentrée scolaire à Mopti.",
            verdict: "vrai",
            explanation: EXPLANATIONS.vrai,
            sources: SOURCES.slice(0, 3),
            listed: true,
            createdMs: now - 2 * 60 * MINUTE,
        }),
        makeCheck({
            id: "k9p4incert",
            claim: "Fermeture du pont de Koulikoro.",
            verdict: "incertain",
            explanation: EXPLANATIONS.incertain,
            sources: SOURCES.slice(3),
            listed: true,
            createdMs: now - 30 * 60 * MINUTE,
        }),
        makeCheck({
            id: "a1i5iadete",
            kind: "image_ai",
            claim: "Photo d'inondation attribuée à Ségou.",
            image_url: "/brand/logo-icon.svg",
            verdict: "ia_detectee",
            explanation: EXPLANATIONS.ia_detectee,
            confidence: 87,
            listed: true,
            createdMs: now - 34 * 60 * MINUTE,
        }),
        makeCheck({
            id: "n6q8iaauth",
            kind: "image_ai",
            claim: "",
            image_url: "/brand/logo-icon.svg",
            verdict: "ia_non_detectee",
            explanation: EXPLANATIONS.ia_non_detectee,
            confidence: 74,
            listed: true,
            createdMs: now - 3 * 24 * 60 * MINUTE,
        }),
        makeCheck({
            id: "z3x5analys",
            kind: "image_content",
            claim: "",
            image_url: "/brand/logo-icon.svg",
            verdict: "analyse",
            explanation: EXPLANATIONS.analyse,
            owned: true,
            createdMs: now - 4 * 24 * 60 * MINUTE,
        }),
        makeCheck({
            id: "w7r1encour",
            claim: "Les cours reprennent lundi dans toutes les écoles de Kayes.",
            state: "running",
            finalVerdict: "incertain",
            owned: true,
            createdMs: now,
        }),
        makeCheck({
            id: "e4t2erreur",
            claim: "Une coupure d'eau générale est prévue à Sikasso.",
            state: "error",
            explanation: "La vérification n'a pas pu aboutir. Réessayez dans un instant.",
            owned: true,
            createdMs: now - 5 * 24 * 60 * MINUTE,
        }),
        makeCheck({
            id: "c8y6annule",
            claim: "Le marché de Médine sera fermé pendant une semaine.",
            state: "cancelled",
            owned: true,
            createdMs: now - 6 * 24 * 60 * MINUTE,
        }),
    ];
}

resetMockStore();

function settle(check) {
    if (check.state === "running" && Date.now() - Date.parse(check.created_at) >= mockConfig.runMs) {
        check.state = "done";
        check.verdict = check._finalVerdict ?? "incertain";
        check.explanation = EXPLANATIONS[check.verdict] ?? "";
        check.sources = check.kind === "text" ? SOURCES.slice(0, 3) : [];
        check.confidence = check.kind === "text" ? null : 80;
        check.completed_at = iso(Date.now());
    }
    return check;
}

function serialize(check) {
    const { _owned, _anon, _finalVerdict, ...rest } = settle(check);
    return { ...rest, is_owner: _owned };
}

function summarize(check) {
    settle(check);
    return {
        id: check.id,
        kind: check.kind,
        claim: check.claim.slice(0, 200),
        state: check.state,
        verdict: check.verdict,
        source_count: check.sources.length,
        created_at: check.created_at,
        listed: check.listed,
    };
}

const fail = (status, code, error) => {
    throw new ApiError(status, code, error, { error, code });
};

const find = (id) => store.find((c) => c.id === id) ?? fail(404, "not_found", "Vérification introuvable.");

const pickVerdict = (text) => ["faux", "vrai", "incertain"][text.length % 3];

function anonQuotaUsed(token) {
    return store.filter((c) => c._anon === token && ["running", "done"].includes(c.state)).length;
}

function createCheck({ kind, text, claimText, file, anonToken }) {
    if (anonQuotaUsed(anonToken) >= mockConfig.anonFreeChecks) {
        fail(403, "anon_quota", "Vous avez utilisé votre vérification gratuite. Créez un compte pour continuer.");
    }
    if (kind === "text") {
        const claim = (text ?? "").trim();
        if (!claim) fail(400, "invalid", "Saisissez une affirmation à vérifier.");
        if (claim.length > 1000) fail(400, "invalid", "Le texte dépasse 1 000 caractères.");
        const check = makeCheck({ claim, state: "running", owned: true, anon: anonToken, finalVerdict: pickVerdict(claim) });
        store.unshift(check);
        return check;
    }
    if (kind !== "image_content" && kind !== "image_ai") fail(400, "invalid", "Type de vérification inconnu.");
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        fail(400, "invalid", "Format d'image non pris en charge. Utilisez JPEG, PNG ou WebP.");
    }
    if (file.size > 10 * 1024 * 1024) fail(400, "invalid", "L'image dépasse 10 Mo.");
    const check = makeCheck({
        kind,
        claim: (claimText ?? "").trim(),
        image_url: "/brand/logo-icon.svg",
        state: "running",
        owned: true,
        anon: anonToken,
        finalVerdict: kind === "image_ai" ? "ia_non_detectee" : "incertain",
    });
    store.unshift(check);
    return check;
}

function list(params) {
    const scope = params.get("scope") || "library";
    const q = (params.get("q") || "").toLowerCase();
    const verdict = params.get("verdict") || "";
    const page = Math.max(1, Number(params.get("page")) || 1);
    store.forEach(settle);
    let rows = scope === "mine" ? store.filter((c) => c._owned) : store.filter((c) => c.listed && c.state === "done");
    if (q) rows = rows.filter((c) => c.claim.toLowerCase().includes(q));
    if (verdict) rows = rows.filter((c) => c.verdict === verdict);
    return {
        count: rows.length,
        page,
        page_size: PAGE_SIZE,
        results: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(summarize),
    };
}

function route(method, path, json, formData, anonToken) {
    const url = new URL(path.replace(/^\/+/, ""), "http://mock/");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "checks") fail(404, "not_found", "Ressource introuvable.");
    const [, id, action] = parts;

    if (!id) {
        if (method === "GET") return list(url.searchParams);
        if (method === "POST") {
            const body = formData
                ? { kind: formData.get("kind"), file: formData.get("image"), claimText: formData.get("claim_text") }
                : { kind: json?.kind, text: json?.text };
            return serialize(createCheck({ ...body, anonToken }));
        }
    }
    if (id === "claim" && method === "POST") {
        const mine = store.filter((c) => c._anon && c._anon === anonToken);
        mine.forEach((c) => {
            c._anon = "";
        });
        return { claimed: mine.length };
    }
    const check = find(id);
    if (!action) {
        if (method === "GET") return serialize(check);
        if (method === "PATCH") {
            if (!check._owned) fail(403, "forbidden", "Seul l'auteur peut modifier cette vérification.");
            settle(check);
            if (check.state !== "done" || !LISTABLE_VERDICTS.includes(check.verdict)) {
                fail(400, "not_listable", "Seule une vérification terminée avec un verdict peut être publiée.");
            }
            check.listed = Boolean(json?.listed);
            return serialize(check);
        }
        if (method === "DELETE") {
            if (!check._owned) fail(403, "forbidden", "Seul l'auteur peut supprimer cette vérification.");
            store = store.filter((c) => c !== check);
            return null;
        }
    }
    if (action === "cancel" && method === "POST") {
        settle(check);
        if (check.state !== "running") fail(409, "not_running", "Cette vérification est déjà terminée.");
        check.state = "cancelled";
        check.completed_at = iso(Date.now());
        return serialize(check);
    }
    if (action === "feedback" && method === "POST") {
        feedback.push({ id, helpful: json?.helpful ?? null, message: json?.message ?? "" });
        return { ok: true };
    }
    if (action === "related" && method === "GET") {
        return store
            .filter((c) => c !== check && c.listed && settle(c).state === "done")
            .slice(0, 3)
            .map(summarize);
    }
    return fail(404, "not_found", "Ressource introuvable.");
}

const wait = (ms) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

async function anonTokenValue() {
    const { getAnonToken } = await import("./anon");
    return getAnonToken();
}

/** Mock of apiFetch. Same arguments, same results and ApiError rules. */
export async function mockFetch(path, { method = "GET", json, formData } = {}) {
    await wait(mockConfig.latencyMs);
    return route(method.toUpperCase(), path, json, formData, await anonTokenValue());
}

/** Mock of apiUpload, with simulated progress. */
export async function mockUpload(path, formData, onProgress) {
    for (const fraction of [0.25, 0.5, 0.75]) {
        await wait(mockConfig.latencyMs / 3);
        onProgress?.(fraction);
    }
    const result = route("POST", path, undefined, formData, await anonTokenValue());
    onProgress?.(1);
    return result;
}

/** Feedback received by the mock (for tests). */
export const mockFeedback = () => [...feedback];
