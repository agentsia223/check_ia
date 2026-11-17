import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "../auth/AuthContext";
import { createQueryClient } from "../lib/queryClient";
import { ApiError } from "../lib/api";
import { createTextCheck, deleteCheck, getCheck, getRelated, setListed } from "../lib/checks";
import { FAILURE_MESSAGES } from "../lib/createFailure";
import { checkKeys } from "../lib/queryKeys";
import CheckPage from "./CheckPage";

vi.mock("../lib/checks", () => ({
    getCheck: vi.fn(),
    getRelated: vi.fn(),
    setListed: vi.fn(),
    deleteCheck: vi.fn(),
    cancelCheck: vi.fn(),
    createTextCheck: vi.fn(),
    sendFeedback: vi.fn(),
}));

const NOW = Date.now();

const SOURCES = [
    { title: "Communiqué du ministère de l'Énergie", url: "https://energie.gouv.ml/c", domain: "energie.gouv.ml", date: "2026-11-12", snippet: "" },
    { title: "Tarif social : ce qui change vraiment", url: "https://benbere.org/t", domain: "benbere.org", date: "2026-11-13", snippet: "" },
    { title: "Point de presse EDM-SA", url: "https://edm-sa.ml/p", domain: "edm-sa.ml", date: "2026-11-13", snippet: "" },
    { title: "Journal de 20 h, extrait", url: "https://ortm.ml/j", domain: "ortm.ml", date: "2026-11-14", snippet: "" },
];

const makeCheck = (overrides = {}) => ({
    id: "8f3k2faux0",
    kind: "text",
    claim: "Le gouvernement a annoncé la gratuité de l'électricité à Bamako.",
    image_url: "",
    state: "done",
    verdict: "faux",
    explanation: "Aucun communiqué officiel ne mentionne cette annonce.",
    sources: SOURCES,
    confidence: null,
    created_at: "2026-11-16T10:00:00Z",
    completed_at: "2026-11-16T10:00:27Z",
    listed: false,
    is_owner: false,
    ...overrides,
});

const signedOut = { user: null, isLoggedIn: false, loading: false };
const signedIn = { user: { id: "u1", email: "a@b.ml" }, isLoggedIn: true, loading: false };

function renderPage({ id = "8f3k2faux0", auth = signedOut, client = createQueryClient() } = {}) {
    return render(
        <QueryClientProvider client={client}>
            <AuthContext.Provider value={auth}>
                <MemoryRouter initialEntries={[`/v/${id}`]}>
                    <Routes>
                        <Route path="/v/:id" element={<CheckPage />} />
                        <Route path="/mes-verifications" element={<h1>Historique</h1>} />
                        <Route path="/" element={<h1>Accueil</h1>} />
                    </Routes>
                </MemoryRouter>
            </AuthContext.Provider>
        </QueryClientProvider>
    );
}

// The loading view has its own (visually hidden) h1: wait for the result's.
const resultHeading = () => screen.findByRole("heading", { level: 1, name: /^(Verdict|Analyse)/ });

beforeEach(() => {
    vi.mocked(getCheck).mockReset();
    vi.mocked(getRelated).mockReset().mockResolvedValue([]);
    vi.mocked(setListed).mockReset();
    vi.mocked(deleteCheck).mockReset();
    document.head.querySelectorAll('meta[name="robots"]').forEach((node) => node.remove());
});

test("while loading it shows a loading status", () => {
    getCheck.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Chargement de la vérification…")).toBeInTheDocument();
});

test("a running check shows the claim, the four steps and the elapsed time", async () => {
    getCheck.mockResolvedValue(
        makeCheck({ state: "running", verdict: null, sources: [], completed_at: null, created_at: new Date(NOW).toISOString(), is_owner: true })
    );
    renderPage();
    expect(await screen.findByText(/Le gouvernement a annoncé/)).toBeInTheDocument();
    for (const step of ["Lecture de l'affirmation", "Recherche de sources", "Comparaison des sources", "Verdict"]) {
        expect(screen.getByText(step)).toBeInTheDocument();
    }
    expect(screen.getByText(/réponse en 30 secondes environ/)).toBeInTheDocument();
    expect(screen.queryByText(/moyenne/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    expect(screen.getByText(/Vous pouvez quitter cette page/)).toBeInTheDocument();
    expect(document.querySelector("[data-tone]")).toBeNull();
});

test("someone else's running check has no cancel button", async () => {
    getCheck.mockResolvedValue(
        makeCheck({ state: "running", verdict: null, completed_at: null, created_at: new Date(NOW).toISOString() })
    );
    renderPage();
    await screen.findByText("Comparaison des sources");
    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
});

test("a finished check shows the stamp, the scale without Trompeur, the explanation and the sources", async () => {
    getCheck.mockResolvedValue(makeCheck());
    renderPage();
    const heading = await resultHeading();
    expect(heading).toHaveTextContent("Verdict : FAUX");
    const scale = screen.getByRole("list", { name: "Échelle des verdicts" });
    expect(within(scale).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
        "Faux (ce verdict)",
        "Incertain",
        "Vrai",
    ]);
    expect(screen.getByRole("heading", { name: "Pourquoi" })).toBeInTheDocument();
    expect(screen.getByText("Aucun communiqué officiel ne mentionne cette annonce.")).toBeInTheDocument();
    expect(screen.getByText("Point de presse EDM-SA")).toBeInTheDocument();
    expect(screen.getByText("Vérification automatique par IA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Comment nous évaluons notre fiabilité/ })).toHaveAttribute("href", "/fiabilite");
    expect(document.body.textContent).not.toMatch(/trompeur/i);
    expect(document.body.textContent).not.toMatch(/\bfiables?\b/i);
});

test("a text check has no confidence: it shows the source count and date instead", async () => {
    getCheck.mockResolvedValue(makeCheck());
    renderPage();
    expect(await screen.findByText("4 sources, vérifié le 16 novembre 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Confiance/)).not.toBeInTheDocument();
});

test("an image check with a confidence value shows it, and its image above the claim", async () => {
    getCheck.mockResolvedValue(
        makeCheck({ kind: "image_ai", verdict: "ia_detectee", confidence: 87, sources: [], image_url: "/media/a.jpg" })
    );
    renderPage();
    expect(await screen.findByText("Confiance : 87 %")).toBeInTheDocument();
    const image = screen.getByRole("img", { name: "Image envoyée pour la vérification" });
    expect(image).toHaveAttribute("src", "/media/a.jpg");
    // The image comes before the claim in the document.
    const claim = screen.getByText(/Le gouvernement a annoncé/);
    expect(image.compareDocumentPosition(claim) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The Faux/Incertain/Vrai scale does not apply to AI detection.
    expect(screen.queryByRole("list", { name: "Échelle des verdicts" })).not.toBeInTheDocument();
});

test("an error check shows no stamp and offers to run it again", async () => {
    getCheck.mockResolvedValue(makeCheck({ state: "error", verdict: null, sources: [] }));
    renderPage();
    expect(await screen.findByRole("heading", { name: "La vérification n'a pas abouti" })).toBeInTheDocument();
    expect(document.querySelector("[data-tone]")).toBeNull();
    expect(screen.getByRole("button", { name: "Relancer la vérification" })).toBeInTheDocument();
});

test("a cancelled check says so", async () => {
    getCheck.mockResolvedValue(makeCheck({ state: "cancelled", verdict: null, sources: [] }));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Vérification annulée" })).toBeInTheDocument();
    expect(document.querySelector("[data-tone]")).toBeNull();
});

describe("with fake timers", () => {
    beforeAll(() => notifyManager.setScheduler((callback) => queueMicrotask(callback)));
    afterAll(() => notifyManager.setScheduler((callback) => setTimeout(callback, 0)));
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
    afterEach(() => vi.useRealTimers());
    const advance = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

    test("a check watched running for 3 minutes shows the timeout message", async () => {
        getCheck.mockResolvedValue(
            makeCheck({ state: "running", verdict: null, completed_at: null, created_at: new Date(Date.now()).toISOString() })
        );
        renderPage();
        await advance(0);
        await advance(180000);
        expect(screen.getByRole("heading", { name: "La vérification prend plus de temps que prévu" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    });

    test("a check that cannot be loaded (500 three times) shows an error view whose Réessayer reloads it", async () => {
        getCheck.mockRejectedValue(new ApiError(500, "server"));
        renderPage();
        await advance(0);
        await advance(2000);
        await advance(3000);
        expect(screen.getByRole("heading", { name: "La vérification n'a pas pu être chargée" })).toBeInTheDocument();
        expect(screen.queryByText(/La connexion au serveur est interrompue/)).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Nouvelle vérification" })).toHaveAttribute("href", "/");
        getCheck.mockReset().mockResolvedValue(makeCheck());
        await act(async () => {
            screen.getByRole("button", { name: "Réessayer" }).click();
        });
        await advance(0);
        expect(getCheck).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("heading", { level: 1, name: /^Verdict/ })).toBeInTheDocument();
    });
});

test("retrying when the free check is used up shows the composer's sign-up prompt", async () => {
    const user = userEvent.setup();
    getCheck.mockResolvedValue(makeCheck({ state: "error", verdict: null, sources: [] }));
    createTextCheck.mockRejectedValue(new ApiError(403, "anon_quota"));
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Relancer la vérification" }));
    expect(await screen.findByText(FAILURE_MESSAGES.anon_quota)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer un compte" })).toHaveAttribute("href", "/inscription");
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/connexion");
});

test("an image check that failed links back home instead of retrying", async () => {
    getCheck.mockResolvedValue(makeCheck({ kind: "image_content", state: "error", verdict: null, claim: "" }));
    renderPage();
    expect(await screen.findByRole("link", { name: "Nouvelle vérification" })).toHaveAttribute("href", "/");
});

test("an unknown id shows Vérification introuvable and a link home", async () => {
    getCheck.mockRejectedValue(new ApiError(404, "not_found"));
    renderPage({ id: "inconnu" });
    expect(await screen.findByRole("heading", { name: "Vérification introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nouvelle vérification" })).toHaveAttribute("href", "/");
});

describe("when the result arrives", () => {
    beforeAll(() => notifyManager.setScheduler((callback) => queueMicrotask(callback)));
    afterAll(() => notifyManager.setScheduler((callback) => setTimeout(callback, 0)));
    afterEach(() => vi.useRealTimers());

    test("focus moves to the verdict heading and a polite live region announces it", async () => {
        vi.useFakeTimers();
        const start = Date.now();
        getCheck
            .mockResolvedValueOnce(
                makeCheck({ state: "running", verdict: null, completed_at: null, created_at: new Date(start).toISOString() })
            )
            .mockResolvedValue(makeCheck({ created_at: new Date(start).toISOString() }));
        renderPage();
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(screen.getByText("Comparaison des sources")).toBeInTheDocument();
        await act(() => vi.advanceTimersByTimeAsync(2000));
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toHaveTextContent("Verdict : FAUX");
        expect(heading).toHaveFocus();
        const live = screen.getByText("Verdict : FAUX", { selector: "[aria-live='polite']" });
        expect(live).toBeInTheDocument();
    });
});

describe("owner controls", () => {
    test("are shown to the signed-in owner", async () => {
        getCheck.mockResolvedValue(makeCheck({ is_owner: true }));
        renderPage({ auth: signedIn });
        const toggle = await screen.findByRole("switch", { name: "Publier dans la bibliothèque" });
        expect(toggle).toHaveAttribute("aria-checked", "false");
        expect(screen.getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    });

    test("are hidden from an owner who is signed out (anonymous check)", async () => {
        getCheck.mockResolvedValue(makeCheck({ is_owner: true }));
        renderPage({ auth: signedOut });
        await resultHeading();
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    });

    test("are hidden from a signed-in visitor who does not own the check", async () => {
        getCheck.mockResolvedValue(makeCheck({ is_owner: false }));
        renderPage({ auth: signedIn });
        await resultHeading();
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    });

    test("the publish switch is hidden for a verdict that cannot be listed", async () => {
        getCheck.mockResolvedValue(makeCheck({ is_owner: true, kind: "image_content", verdict: "analyse", sources: [] }));
        renderPage({ auth: signedIn });
        await resultHeading();
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    });

    test("the switch publishes the check", async () => {
        const user = userEvent.setup();
        getCheck.mockResolvedValue(makeCheck({ is_owner: true }));
        setListed.mockResolvedValue(makeCheck({ is_owner: true, listed: true }));
        renderPage({ auth: signedIn });
        await user.click(await screen.findByRole("switch", { name: "Publier dans la bibliothèque" }));
        expect(setListed).toHaveBeenCalledWith("8f3k2faux0", true);
        expect(await screen.findByRole("switch", { name: "Publier dans la bibliothèque" })).toHaveAttribute(
            "aria-checked",
            "true"
        );
    });

    test("publishing marks the home, library and history lists stale, and not the check itself", async () => {
        const user = userEvent.setup();
        const client = createQueryClient();
        const page = { count: 0, page: 1, page_size: 20, results: [] };
        const listKeys = [
            checkKeys.recent(),
            checkKeys.list("library", { q: "", verdict: "", page: 1 }),
            checkKeys.list("mine", { q: "", verdict: "", page: 1 }),
        ];
        // The callers really use these keys (Home, Library and History build them the same way).
        expect(listKeys.map((key) => key[0])).toEqual(["checks", "checks", "checks"]);
        listKeys.forEach((key) => client.setQueryData(key, page));
        getCheck.mockResolvedValue(makeCheck({ is_owner: true }));
        setListed.mockResolvedValue(makeCheck({ is_owner: true, listed: true }));
        renderPage({ auth: signedIn, client });
        await user.click(await screen.findByRole("switch", { name: "Publier dans la bibliothèque" }));
        await screen.findByRole("switch", { checked: true });
        for (const key of listKeys) expect(client.getQueryState(key).isInvalidated).toBe(true);
        expect(client.getQueryState(checkKeys.detail("8f3k2faux0")).isInvalidated).toBe(false);
    });

    test("deleting also marks the lists stale", async () => {
        const user = userEvent.setup();
        const client = createQueryClient();
        client.setQueryData(checkKeys.recent(), { count: 0, page: 1, page_size: 20, results: [] });
        getCheck.mockResolvedValue(makeCheck({ is_owner: true }));
        deleteCheck.mockResolvedValue(null);
        renderPage({ auth: signedIn, client });
        await user.click(await screen.findByRole("button", { name: "Supprimer" }));
        await user.click(await screen.findByRole("button", { name: "Supprimer définitivement" }));
        expect(await screen.findByRole("heading", { name: "Historique" })).toBeInTheDocument();
        expect(client.getQueryState(checkKeys.recent()).isInvalidated).toBe(true);
    });

    test("a failed publish shows the error in French", async () => {
        const user = userEvent.setup();
        getCheck.mockResolvedValue(makeCheck({ is_owner: true }));
        setListed.mockRejectedValue(new ApiError(401, "auth_required"));
        renderPage({ auth: signedIn });
        await user.click(await screen.findByRole("switch", { name: "Publier dans la bibliothèque" }));
        expect(await screen.findByText("Connectez-vous pour continuer.")).toBeInTheDocument();
        expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    });

    test("Supprimer asks for confirmation, deletes and goes to the history", async () => {
        const user = userEvent.setup();
        getCheck.mockResolvedValue(makeCheck({ is_owner: true }));
        deleteCheck.mockResolvedValue(null);
        renderPage({ auth: signedIn });
        await user.click(await screen.findByRole("button", { name: "Supprimer" }));
        const dialog = await screen.findByRole("dialog", { name: "Supprimer cette vérification ?" });
        expect(deleteCheck).not.toHaveBeenCalled();
        await user.click(within(dialog).getByRole("button", { name: "Supprimer définitivement" }));
        expect(deleteCheck).toHaveBeenCalledWith("8f3k2faux0");
        expect(await screen.findByRole("heading", { name: "Historique" })).toBeInTheDocument();
    });
});

describe("related checks", () => {
    test("are listed when there are some", async () => {
        getCheck.mockResolvedValue(makeCheck());
        getRelated.mockResolvedValue([
            { id: "r2m7vrai00", kind: "text", claim: "Un tarif social entre en vigueur", state: "done", verdict: "vrai", source_count: 3, created_at: "2026-11-14T10:00:00Z", listed: true },
        ]);
        renderPage();
        expect(await screen.findByRole("heading", { name: "Vérifications proches" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Un tarif social/ })).toHaveAttribute("href", "/v/r2m7vrai00");
    });

    test("are hidden when there are none", async () => {
        getCheck.mockResolvedValue(makeCheck());
        renderPage();
        await resultHeading();
        await act(async () => {});
        expect(getRelated).toHaveBeenCalledWith("8f3k2faux0");
        expect(screen.queryByRole("heading", { name: "Vérifications proches" })).not.toBeInTheDocument();
    });
});

describe("robots meta", () => {
    const robots = () => document.head.querySelector('meta[name="robots"]');

    test("is noindex while the check is unlisted", async () => {
        getCheck.mockResolvedValue(makeCheck({ listed: false }));
        renderPage();
        await resultHeading();
        expect(robots()).toHaveAttribute("content", "noindex");
    });

    test("is absent once the check is listed", async () => {
        getCheck.mockResolvedValue(makeCheck({ listed: true }));
        renderPage();
        await resultHeading();
        expect(robots()).toBeNull();
    });

    test("is removed when leaving the page", async () => {
        getCheck.mockResolvedValue(makeCheck({ listed: false }));
        const { unmount } = renderPage();
        await resultHeading();
        unmount();
        expect(robots()).toBeNull();
    });
});

test("the page title names the verdict", async () => {
    getCheck.mockResolvedValue(makeCheck());
    renderPage();
    await resultHeading();
    expect(document.title).toMatch(/^Faux : Le gouvernement a annoncé/);
    expect(document.title).toMatch(/\| Check-IA$/);
});

test("the page title keeps IA in capitals", async () => {
    getCheck.mockResolvedValue(makeCheck({ kind: "image_ai", verdict: "ia_non_detectee", claim: "Photo du fleuve", sources: [] }));
    renderPage();
    await resultHeading();
    expect(document.title).toMatch(/^Pas d'IA détectée : Photo du fleuve/);
});
