import { act, render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createQueryClient } from "../../lib/queryClient";
import { getRelated } from "../../lib/checks";
import ResultView from "./ResultView";

vi.mock("../../lib/checks", () => ({
    getRelated: vi.fn(() => Promise.resolve([])),
    setListed: vi.fn(),
    deleteCheck: vi.fn(),
    sendFeedback: vi.fn(),
}));

const base = {
    id: "r2m7vrai00",
    kind: "text",
    claim: "Report de la rentrée scolaire à Mopti.",
    image_url: "",
    state: "done",
    verdict: "vrai",
    explanation: "Premier paragraphe.\n\nSecond paragraphe.",
    sources: [{ title: "Source A", url: "https://a.ml/x", domain: "a.ml", date: "2026-11-12", snippet: "" }],
    confidence: null,
    created_at: "2026-11-16T10:00:00Z",
    completed_at: "2026-11-16T10:00:27Z",
    listed: true,
    is_owner: false,
};

const renderView = (check = base, props = {}) =>
    render(
        <QueryClientProvider client={createQueryClient()}>
            <MemoryRouter>
                <ResultView check={check} elapsedSeconds={27} isLoggedIn={false} {...props} />
            </MemoryRouter>
        </QueryClientProvider>
    );

test("marks the verdict on the Faux / Incertain / Vrai scale", () => {
    renderView();
    const scale = screen.getByRole("list", { name: "Échelle des verdicts" });
    const current = within(scale).getAllByRole("listitem").find((li) => li.getAttribute("aria-current") === "true");
    expect(current).toHaveTextContent("Vrai");
});

test("splits the explanation into paragraphs", () => {
    renderView();
    expect(screen.getByText("Premier paragraphe.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraphe.")).toBeInTheDocument();
});

test("uses the singular for one source and shows check details", () => {
    renderView();
    expect(screen.getByText("1 source, vérifié le 16 novembre 2026")).toBeInTheDocument();
    const details = screen.getByRole("group", { name: "Détails de la vérification" });
    expect(details).toHaveTextContent("Vérifié le16 nov. 2026");
    expect(details).toHaveTextContent("TypeTexte");
    expect(details).toHaveTextContent("Durée27 s");
});

test("confidence appears only when the check has a value", () => {
    const { unmount } = renderView({ ...base, confidence: null });
    expect(screen.queryByText(/Confiance/)).not.toBeInTheDocument();
    unmount();
    renderView({ ...base, kind: "image_content", confidence: 64 });
    expect(screen.getByText("Confiance : 64 %")).toBeInTheDocument();
});

test("an analysis has no stamp and no scale", () => {
    renderView({ ...base, kind: "image_content", verdict: "analyse", sources: [], image_url: "/m.jpg", claim: "" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Analyse de l'image");
    expect(document.querySelector("[data-tone]")).toBeNull();
    expect(screen.queryByRole("list", { name: "Échelle des verdicts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Sources/ })).not.toBeInTheDocument();
});

test("the breadcrumb links to the library for a listed check", () => {
    renderView();
    const crumb = screen.getByRole("navigation", { name: "Fil d'Ariane" });
    expect(within(crumb).getByRole("link", { name: "Bibliothèque" })).toHaveAttribute("href", "/bibliotheque");
});

test("shows up to three related checks as links, under their own heading", async () => {
    const related = (n) => ({
        id: `rel${n}`,
        kind: "text",
        claim: `Affirmation proche ${n}`,
        state: "done",
        verdict: "faux",
        source_count: 2,
        created_at: "2026-11-15T10:00:00Z",
        listed: true,
    });
    getRelated.mockResolvedValueOnce([related(1), related(2), related(3), related(4)]);
    renderView();
    expect(getRelated).toHaveBeenCalledWith("r2m7vrai00");
    const section = await screen.findByRole("region", { name: "Vérifications proches" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/v/rel1");
    expect(links[0]).toHaveTextContent("Affirmation proche 1");
    expect(within(section).queryByText("Affirmation proche 4")).not.toBeInTheDocument();
});

test("no related section when there are none", async () => {
    getRelated.mockResolvedValueOnce([]);
    renderView();
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(getRelated).toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Vérifications proches" })).not.toBeInTheDocument();
});
