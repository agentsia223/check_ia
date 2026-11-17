import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApiError, apiFetch } from "../../lib/api";
import ShareRail, { citationText } from "./ShareRail";

vi.mock("../../lib/api", async (importOriginal) => ({
    ...(await importOriginal()),
    apiFetch: vi.fn(),
}));

const check = {
    id: "8f3k2faux0",
    kind: "text",
    claim: "Électricité gratuite à Bamako dès janvier",
    state: "done",
    verdict: "faux",
    explanation: "Aucun communiqué officiel ne mentionne cette annonce.",
    created_at: "2026-11-16T10:00:00Z",
    completed_at: "2026-11-16T10:00:27Z",
};

const url = `${window.location.origin}/v/8f3k2faux0`;

const renderRail = (props = {}) =>
    render(
        <MemoryRouter>
            <ShareRail check={check} isLoggedIn={false} {...props} />
        </MemoryRouter>
    );

afterEach(() => {
    delete navigator.share;
    apiFetch.mockReset();
});

test("the citation has the claim, the verdict, the date and the link", () => {
    expect(citationText(check, url)).toBe(
        `« Électricité gratuite à Bamako dès janvier » — Verdict Check-IA : FAUX, vérifié le 16 novembre 2026. ${url}`
    );
});

test("shows the link and copies it", async () => {
    const user = userEvent.setup();
    renderRail();
    expect(screen.getByRole("textbox", { name: "Lien de la vérification" })).toHaveValue(url);
    await user.click(screen.getByRole("button", { name: "Copier le lien" }));
    expect(await navigator.clipboard.readText()).toBe(url);
    expect(screen.getByText("Lien copié.")).toBeInTheDocument();
});

test("Citer dans un article copies the formatted citation", async () => {
    const user = userEvent.setup();
    renderRail();
    await user.click(screen.getByRole("button", { name: "Citer dans un article" }));
    expect(await navigator.clipboard.readText()).toBe(citationText(check, url));
    expect(screen.getByText("Citation copiée.")).toBeInTheDocument();
});

test("a failed copy explains what to do", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));
    renderRail();
    await user.click(screen.getByRole("button", { name: "Copier le lien" }));
    expect(await screen.findByText(/Copie impossible/)).toBeInTheDocument();
});

test("Partager is offered only where navigator.share exists", async () => {
    const user = userEvent.setup();
    const { unmount } = renderRail();
    expect(screen.queryByRole("button", { name: "Partager" })).not.toBeInTheDocument();
    unmount();
    navigator.share = vi.fn(() => Promise.resolve());
    renderRail();
    await user.click(screen.getByRole("button", { name: "Partager" }));
    expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ url }));
});

test("signed out, Lire en bambara links to sign-in", () => {
    renderRail({ isLoggedIn: false });
    expect(screen.getByRole("link", { name: /Lire en bambara/ })).toHaveAttribute("href", "/connexion");
    expect(apiFetch).not.toHaveBeenCalled();
});

test("signed in, Lire en bambara translates the explanation and shows the text", async () => {
    const user = userEvent.setup();
    apiFetch.mockResolvedValue({ translated_text: "Kunnafoni in tɛ tiɲɛ ye." });
    renderRail({ isLoggedIn: true });
    await user.click(screen.getByRole("button", { name: "Lire en bambara" }));
    expect(apiFetch).toHaveBeenCalledWith(
        "bambara/translate/",
        expect.objectContaining({
            method: "POST",
            json: { text: check.explanation, source_lang: "fr", target_lang: "bm" },
        })
    );
    const text = await screen.findByText("Kunnafoni in tɛ tiɲɛ ye.");
    expect(text).toHaveAttribute("lang", "bm");
});

test("a failed translation shows a French error", async () => {
    const user = userEvent.setup();
    apiFetch.mockRejectedValue(new ApiError(0, "network"));
    renderRail({ isLoggedIn: true });
    await user.click(screen.getByRole("button", { name: "Lire en bambara" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connexion impossible");
});

test("without a verdict there is no citation button", () => {
    renderRail({ check: { ...check, verdict: "analyse" } });
    expect(screen.queryByRole("button", { name: "Citer dans un article" })).not.toBeInTheDocument();
});
