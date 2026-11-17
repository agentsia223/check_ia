import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import App, { REDIRECTS } from "./App";
import { getSupabase } from "./lib/supabase";

// Feature pages are owned by other tasks; stand-ins keep these routing tests independent.
const { stub } = vi.hoisted(() => ({
    stub: (name) => () => ({ default: () => <h1>{name}</h1> }),
}));
vi.mock("./pages/Home.jsx", () => ({
    default: function HomeStub() {
        const { search } = useLocation();
        return (
            <>
                <h1>Page Home</h1>
                <p data-testid="home-search">{search}</p>
            </>
        );
    },
}));
vi.mock("./pages/CheckPage.jsx", () => ({
    default: function CheckPageStub() {
        const { pathname } = useLocation();
        return <h1>Page CheckPage {pathname}</h1>;
    },
}));
vi.mock("./pages/Library.jsx", stub("Page Library"));
vi.mock("./pages/History.jsx", stub("Page History"));
vi.mock("./pages/Login.jsx", stub("Page Login"));
vi.mock("./pages/Register.jsx", stub("Page Register"));
vi.mock("./pages/ForgotPassword.jsx", stub("Page ForgotPassword"));
vi.mock("./pages/ResetPassword.jsx", stub("Page ResetPassword"));
vi.mock("./pages/Terms.jsx", () => ({
    default: () => {
        throw new Error("boom");
    },
}));
vi.mock("./lib/supabase", () => ({
    getSupabase: vi.fn(() => Promise.resolve(null)),
    mayHaveSession: () => true,
    SESSION_KEY_PATTERN: /^sb-.+-auth-token/,
}));

const renderAt = (path) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <App />
        </MemoryRouter>
    );

const signedInClient = () => ({
    auth: {
        getSession: () =>
            Promise.resolve({ data: { session: { access_token: "t", user: { id: "u", email: "a@b.c" } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
});

test.each([
    ["/", "Page Home"],
    ["/v/k3f9x2m7qa", "Page CheckPage /v/k3f9x2m7qa"],
    ["/bibliotheque", "Page Library"],
    ["/connexion", "Page Login"],
    ["/inscription", "Page Register"],
    ["/mot-de-passe-oublie", "Page ForgotPassword"],
    ["/reinitialiser", "Page ResetPassword"],
    ["/fiabilite", "Fiabilité de Check-IA"],
    ["/reliability", "Check-IA Reliability"],
    ["/confidentialite", "Politique de confidentialité"],
])("%s renders its page inside the frame", async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenu");
});

test.each(Object.entries(REDIRECTS).filter(([from]) => from !== "/terms"))(
    "old path %s redirects to %s",
    async (from, to) => {
        const [toPath, toSearch = ""] = to.split("?");
        const expected = {
            "/": "Page Home",
            "/bibliotheque": "Page Library",
            "/connexion": "Page Login",
            "/inscription": "Page Register",
            "/confidentialite": "Politique de confidentialité",
        }[toPath];
        renderAt(from);
        expect(await screen.findByRole("heading", { level: 1, name: expected })).toBeInTheDocument();
        if (toPath === "/") expect(screen.getByTestId("home-search")).toHaveTextContent(toSearch ? `?${toSearch}` : "");
    }
);

test("every old path from the previous site has a redirect", () => {
    expect(Object.keys(REDIRECTS).sort()).toEqual(
        ["/detect-ai-image", "/library", "/login", "/privacy", "/register", "/submit", "/terms", "/verify-image"].sort()
    );
    expect(REDIRECTS["/terms"]).toBe("/conditions");
    // The image pages open the composer on its Image tab.
    expect(REDIRECTS["/verify-image"]).toBe("/?mode=image");
    expect(REDIRECTS["/detect-ai-image"]).toBe("/?mode=image");
});

test("unknown paths show the 404 page", async () => {
    renderAt("/nimporte-quoi");
    expect(await screen.findByRole("heading", { level: 1, name: "Page introuvable" })).toBeInTheDocument();
});

test("history requires sign-in", async () => {
    renderAt("/mes-verifications");
    expect(await screen.findByRole("heading", { level: 1, name: "Page Login" })).toBeInTheDocument();
});

test("history renders for a signed-in user", async () => {
    getSupabase.mockResolvedValueOnce(signedInClient());
    renderAt("/mes-verifications");
    expect(await screen.findByRole("heading", { level: 1, name: "Page History" })).toBeInTheDocument();
});

test("a page that crashes shows a French error, not a blank screen", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const silence = (event) => event.preventDefault();
    window.addEventListener("error", silence);
    renderAt("/conditions");
    expect(await screen.findByRole("alert")).toHaveTextContent("Cette page n'a pas pu s'afficher");
    expect(screen.getByRole("button", { name: "Recharger la page" })).toBeInTheDocument();
    window.removeEventListener("error", silence);
    console.error.mockRestore();
});

function BackButton() {
    const navigate = useNavigate();
    return (
        <button type="button" onClick={() => navigate(-1)}>
            Retour test
        </button>
    );
}

test("a link navigation scrolls to the top and focuses the main content", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderAt("/bibliotheque");
    await screen.findByRole("heading", { level: 1, name: "Page Library" });
    expect(screen.getByRole("main")).not.toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("link", { name: "Fiabilité" })[0]);

    expect(await screen.findByRole("heading", { level: 1, name: "Fiabilité de Check-IA" })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(screen.getByRole("main")).toHaveFocus();
    scrollTo.mockRestore();
});

test("back/forward (POP) moves focus but leaves scrolling to the browser", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(
        <MemoryRouter initialEntries={["/bibliotheque"]}>
            <App />
            <BackButton />
        </MemoryRouter>
    );
    await screen.findByRole("heading", { level: 1, name: "Page Library" });
    fireEvent.click(screen.getAllByRole("link", { name: "Fiabilité" })[0]);
    await screen.findByRole("heading", { level: 1, name: "Fiabilité de Check-IA" });
    screen.getByRole("button", { name: "Retour test" }).focus();
    scrollTo.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Retour test" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Page Library" })).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByRole("main")).toHaveFocus();
    scrollTo.mockRestore();
});
