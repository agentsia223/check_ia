import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import Home from "./Home";
import { AuthContext } from "../auth/AuthContext";
import { createQueryClient } from "../lib/queryClient";
import { listChecks } from "../lib/checks";
import { ApiError, apiFetch } from "../lib/api";
import { fiabilite, pctFr } from "../data/fiabilite";

vi.mock("../lib/checks", () => ({
    createTextCheck: vi.fn(),
    createImageCheck: vi.fn(),
    listChecks: vi.fn(),
}));

vi.mock("../lib/api", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, apiFetch: vi.fn(() => Promise.resolve(null)) };
});

const authValue = (overrides = {}) => ({
    user: null,
    isLoggedIn: false,
    loading: false,
    getAccessToken: () => null,
    ...overrides,
});

const summary = (i) => ({
    id: `chk${i}`,
    kind: "text",
    claim: `Affirmation numéro ${i}`,
    state: "done",
    verdict: "faux",
    source_count: 3,
    created_at: new Date().toISOString(),
    listed: true,
});

const page = (results) => ({ count: results.length, page: 1, page_size: 20, results });

const renderHome = (auth = authValue()) =>
    render(
        <QueryClientProvider client={createQueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <AuthContext.Provider value={auth}>
                <MemoryRouter>
                    <Home />
                </MemoryRouter>
            </AuthContext.Provider>
        </QueryClientProvider>
    );

afterEach(() => {
    vi.clearAllMocks();
});

test("sets the title and shows the headline, the lede and the composer", async () => {
    listChecks.mockResolvedValue(page([]));
    renderHome();
    expect(document.title).toBe("Vérifier une information | Check-IA");
    expect(screen.getByRole("heading", { level: 1, name: "Vérifiez avant de publier." })).toBeInTheDocument();
    expect(screen.getByText(/check-ia cherche les sources/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Affirmation à vérifier" })).toBeInTheDocument();
    await screen.findByText(/les vérifications publiées apparaîtront ici/i);
});

test("the facts line states the free check and the median wait from fiabilite.js", async () => {
    listChecks.mockResolvedValue(page([]));
    renderHome();
    const facts = screen.getByRole("list", { name: /en bref/i });
    expect(within(facts).getByText("Une vérification gratuite sans compte")).toBeInTheDocument();
    expect(
        within(facts).getByText(`Réponse en ${fiabilite.medianSeconds} secondes environ`)
    ).toBeInTheDocument();
    await screen.findByText(/les vérifications publiées apparaîtront ici/i);
});

test("signed in, the facts line drops the free-check fact", async () => {
    listChecks.mockResolvedValue(page([]));
    renderHome(authValue({ isLoggedIn: true, user: { id: "u1" } }));
    const facts = screen.getByRole("list", { name: /en bref/i });
    expect(within(facts).queryByText("Une vérification gratuite sans compte")).not.toBeInTheDocument();
    expect(within(facts).getByText(/secondes environ/)).toBeInTheDocument();
    await screen.findByText(/les vérifications publiées apparaîtront ici/i);
});

test("recent checks: the first 4 listed checks, each linking to its page", async () => {
    listChecks.mockResolvedValue(page([1, 2, 3, 4, 5, 6].map(summary)));
    renderHome();
    expect(listChecks).toHaveBeenCalledWith({ scope: "library" });

    const section = screen.getByRole("region", { name: "Vérifications récentes" });
    const list = await within(section).findByRole("list");
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute("href", "/v/chk1");
    expect(links[3]).toHaveAttribute("href", "/v/chk4");
    expect(within(section).queryByText("Affirmation numéro 5")).not.toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "Toute la bibliothèque" })).toHaveAttribute(
        "href",
        "/bibliotheque"
    );
});

test("recent checks: empty state explains that published checks will appear here", async () => {
    listChecks.mockResolvedValue(page([]));
    renderHome();
    const section = screen.getByRole("region", { name: "Vérifications récentes" });
    expect(await within(section).findByText(/les vérifications publiées apparaîtront ici/i)).toBeInTheDocument();
    expect(within(section).queryByRole("list")).not.toBeInTheDocument();
});

test("recent checks: loading state", () => {
    listChecks.mockReturnValue(new Promise(() => {}));
    renderHome();
    const section = screen.getByRole("region", { name: "Vérifications récentes" });
    expect(within(section).getByRole("status")).toHaveTextContent(/chargement des vérifications récentes/i);
});

test("recent checks: error state says what happened and retries", async () => {
    const user = userEvent.setup();
    listChecks.mockRejectedValueOnce(new ApiError(0, "network")).mockResolvedValueOnce(page([summary(9)]));
    renderHome();
    const section = screen.getByRole("region", { name: "Vérifications récentes" });
    expect(await within(section).findByText(/n'ont pas pu être chargées/i)).toBeInTheDocument();
    await user.click(within(section).getByRole("button", { name: "Réessayer" }));
    expect(await within(section).findByText("Affirmation numéro 9")).toBeInTheDocument();
});

test("reliability band: the figures equal the values in fiabilite.js, with a link to /fiabilite", async () => {
    listChecks.mockResolvedValue(page([]));
    renderHome();
    const band = screen.getByRole("region", { name: /quand check-ia n'est pas sûr, il ne tranche pas/i });

    expect(within(band).getByText(pctFr(fiabilite.correct))).toBeInTheDocument();
    expect(within(band).getByText(pctFr(fiabilite.prudence))).toBeInTheDocument();
    expect(within(band).getByText(pctFr(fiabilite.wrong))).toBeInTheDocument();
    expect(
        within(band).getByText(new RegExp(`Évalué en ${fiabilite.date} sur ${fiabilite.nPrimary} affirmations`))
    ).toBeInTheDocument();
    expect(within(band).getByRole("img", { name: /répartition des issues/i })).toBeInTheDocument();
    expect(within(band).getByRole("link", { name: "Lire la méthode" })).toHaveAttribute("href", "/fiabilite");
    await screen.findByText(/les vérifications publiées apparaîtront ici/i);
});

test("sections come in the order headline, lede, composer, facts, recent, reliability", async () => {
    listChecks.mockResolvedValue(page([]));
    renderHome();
    const order = [
        screen.getByRole("heading", { level: 1 }),
        screen.getByText(/check-ia cherche les sources/i),
        screen.getByRole("form", { name: /vérifier une information/i }),
        screen.getByRole("list", { name: /en bref/i }),
        screen.getByRole("region", { name: "Vérifications récentes" }),
        screen.getByRole("region", { name: /quand check-ia n'est pas sûr/i }),
    ];
    for (let i = 1; i < order.length; i += 1) {
        // eslint-disable-next-line no-bitwise
        expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    await screen.findByText(/les vérifications publiées apparaîtront ici/i);
});

test("wakes the verdict model when a signed-in user opens the page, and only then", async () => {
    listChecks.mockResolvedValue(page([]));
    apiFetch.mockClear();
    const { unmount } = renderHome();
    expect(apiFetch).not.toHaveBeenCalledWith("verdict/warm/", expect.anything());
    unmount();

    renderHome(authValue({ isLoggedIn: true, user: { id: "u1", email: "a@b.c" } }));
    expect(apiFetch).toHaveBeenCalledWith("verdict/warm/", { method: "POST" });
});
