// The mock API and lib/checks.js must agree with the Task 1 contract.
import {
    createTextCheck,
    createImageCheck,
    getCheck,
    listChecks,
    setListed,
    deleteCheck,
    cancelCheck,
    sendFeedback,
    getRelated,
    claimAnonChecks,
} from "./checks";
import { mockConfig, resetMockStore, mockFeedback, mockFetch } from "./mockApi";
import { ApiError } from "./api";

vi.mock("./config", () => ({
    API_BASE_URL: "http://localhost:8000/api/",
    MOCK_API: true,
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
}));

const CHECK_KEYS = [
    "claim",
    "completed_at",
    "confidence",
    "created_at",
    "explanation",
    "id",
    "image_url",
    "is_owner",
    "kind",
    "listed",
    "sources",
    "state",
    "verdict",
].sort();

const SUMMARY_KEYS = ["claim", "created_at", "id", "kind", "listed", "source_count", "state", "verdict"].sort();
const SOURCE_KEYS = ["date", "domain", "snippet", "title", "url"].sort();

const imageFile = (type = "image/jpeg", size = 2000) => {
    const file = new File(["x"], "photo.jpg", { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
};

beforeEach(() => {
    mockConfig.latencyMs = 0;
    mockConfig.anonFreeChecks = 100;
    resetMockStore();
});

afterEach(() => {
    vi.useRealTimers();
});

test("create returns a running Check with the contract's keys", async () => {
    const check = await createTextCheck("Électricité gratuite à Bamako");

    expect(Object.keys(check).sort()).toEqual(CHECK_KEYS);
    expect(check).toMatchObject({ kind: "text", state: "running", verdict: null, is_owner: true, listed: false });
    expect(check.id).toMatch(/^[a-z0-9]{10}$/);
});

test("get returns the same Check, done after the run time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T10:00:00Z"));
    const created = await createTextCheck("Le pont de Koulikoro est fermé");

    expect((await getCheck(created.id)).state).toBe("running");

    vi.setSystemTime(new Date("2026-11-16T10:00:09Z"));
    const done = await getCheck(created.id);

    expect(Object.keys(done).sort()).toEqual(CHECK_KEYS);
    expect(done.state).toBe("done");
    expect(["vrai", "faux", "incertain"]).toContain(done.verdict);
    expect(done.completed_at).not.toBeNull();
    done.sources.forEach((source) => expect(Object.keys(source).sort()).toEqual(SOURCE_KEYS));
});

test("list returns a page of summaries", async () => {
    const page = await listChecks({ scope: "library" });

    expect(Object.keys(page).sort()).toEqual(["count", "page", "page_size", "results"]);
    expect(page.page).toBe(1);
    expect(page.page_size).toBe(20);
    expect(page.results.length).toBe(page.count);
    page.results.forEach((row) => {
        expect(Object.keys(row).sort()).toEqual(SUMMARY_KEYS);
        expect(row.listed).toBe(true);
        expect(row.state).toBe("done");
    });
});

test("the library has one listed check per stamped verdict", async () => {
    const page = await listChecks();
    const verdicts = page.results.map((r) => r.verdict).sort();
    expect(verdicts).toEqual(["faux", "ia_detectee", "ia_non_detectee", "incertain", "vrai"]);
});

test("list filters by text, verdict and scope", async () => {
    expect((await listChecks({ q: "koulikoro" })).count).toBe(1);
    expect((await listChecks({ verdict: "faux" })).results[0].verdict).toBe("faux");
    const mine = await listChecks({ scope: "mine", page: 1 });
    expect(mine.results.map((r) => r.state)).toEqual(
        expect.arrayContaining(["running", "error", "cancelled", "done"])
    );
    expect((await listChecks({ page: 2 })).results).toEqual([]);
});

test("image create uploads and reports progress", async () => {
    const onProgress = vi.fn();
    const check = await createImageCheck({ file: imageFile(), kind: "image_ai", claimText: "Photo", onProgress });

    expect(Object.keys(check).sort()).toEqual(CHECK_KEYS);
    expect(check.kind).toBe("image_ai");
    expect(check.claim).toBe("Photo");
    expect(onProgress).toHaveBeenLastCalledWith(1);
});

test("create errors follow the contract", async () => {
    await expect(createTextCheck("   ")).rejects.toMatchObject({ status: 400, code: "invalid" });
    await expect(createTextCheck("a".repeat(1001))).rejects.toMatchObject({ status: 400, code: "invalid" });
    await expect(createImageCheck({ file: imageFile("image/gif"), kind: "image_ai" })).rejects.toMatchObject({ code: "invalid" });
    await expect(createImageCheck({ file: imageFile("image/png", 11 * 1024 * 1024), kind: "image_content" })).rejects.toMatchObject({ code: "invalid" });
    await expect(createImageCheck({ file: imageFile(), kind: "video" })).rejects.toMatchObject({ code: "invalid" });
    await expect(getCheck("inconnu000")).rejects.toBeInstanceOf(ApiError);
    await expect(getCheck("inconnu000")).rejects.toMatchObject({ status: 404, code: "not_found" });
});

test("the anonymous quota refuses a second check", async () => {
    mockConfig.anonFreeChecks = 1;
    await createTextCheck("Première vérification");
    await expect(createTextCheck("Deuxième")).rejects.toMatchObject({ status: 403, code: "anon_quota" });
});

test("owner actions: list, cancel, delete, feedback, related, claim", async () => {
    await expect(setListed("z3x5analys", true)).rejects.toMatchObject({ code: "not_listable" });
    await expect(setListed("r2m7vrai00", false)).rejects.toMatchObject({ code: "forbidden" });
    expect((await setListed("8f3k2faux0", false)).listed).toBe(false);

    expect((await cancelCheck("w7r1encour")).state).toBe("cancelled");
    await expect(cancelCheck("w7r1encour")).rejects.toMatchObject({ status: 409, code: "not_running" });

    await expect(deleteCheck("r2m7vrai00")).rejects.toMatchObject({ code: "forbidden" });
    await expect(deleteCheck("e4t2erreur")).resolves.toBeNull();
    await expect(getCheck("e4t2erreur")).rejects.toMatchObject({ code: "not_found" });

    await sendFeedback("8f3k2faux0", { helpful: false, message: "Source manquante" });
    expect(mockFeedback()).toEqual([{ id: "8f3k2faux0", helpful: false, message: "Source manquante" }]);

    const related = await getRelated("r2m7vrai00");
    expect(related.length).toBeLessThanOrEqual(3);
    related.forEach((row) => expect(Object.keys(row).sort()).toEqual(SUMMARY_KEYS));

    await createTextCheck("Une affirmation anonyme");
    expect(await claimAnonChecks()).toEqual({ claimed: 1 });
    expect(await claimAnonChecks()).toEqual({ claimed: 0 });
});

test("unknown routes are 404", async () => {
    await expect(mockFetch("bambara/transcribe/", { method: "POST" })).rejects.toMatchObject({ status: 404 });
    await expect(mockFetch("checks/8f3k2faux0/unknown/")).rejects.toMatchObject({ status: 404 });
});

test("latency is simulated with timers", async () => {
    vi.useFakeTimers();
    mockConfig.latencyMs = 100;
    const pending = getCheck("8f3k2faux0");
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toMatchObject({ id: "8f3k2faux0" });
});
