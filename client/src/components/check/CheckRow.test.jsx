import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CheckRow from "./CheckRow";

const base = {
    id: "8f3k2faux0",
    kind: "text",
    claim: "Électricité gratuite à Bamako dès janvier",
    state: "done",
    verdict: "faux",
    source_count: 4,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    listed: true,
};

const renderRow = (check, props = {}) =>
    render(
        <MemoryRouter>
            <CheckRow check={check} {...props} />
        </MemoryRouter>
    );

test("links to the check page with stamp, claim, source count and age", () => {
    renderRow(base);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/v/8f3k2faux0");
    expect(screen.getByText("FAUX")).toBeInTheDocument();
    expect(screen.getByText(base.claim)).toBeInTheDocument();
    expect(screen.getByText("4 sources, il y a 12 min")).toBeInTheDocument();
});

test.each([
    ["running", "En cours"],
    ["cancelled", "Annulée"],
    ["error", "Erreur"],
])("a %s check shows %s instead of a stamp", (state, label) => {
    renderRow({ ...base, state, verdict: null, source_count: 0 });
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("FAUX")).not.toBeInTheDocument();
    expect(screen.getByText("il y a 12 min")).toBeInTheDocument();
});

test("an analysis without a verdict shows a neutral label", () => {
    renderRow({ ...base, kind: "image_content", verdict: "analyse", source_count: 1 });
    expect(screen.getByText("Analyse")).toBeInTheDocument();
    expect(screen.getByText(/^1 source,/)).toBeInTheDocument();
});

test("an image without text gets a readable title", () => {
    renderRow({ ...base, kind: "image_ai", claim: "", verdict: "ia_detectee" });
    expect(screen.getByText("Image sans texte")).toBeInTheDocument();
    expect(screen.getByText("GÉNÉRÉE PAR IA")).toBeInTheDocument();
});

test("history details: kind and listed state", () => {
    const { rerender } = renderRow(base, { showKind: true, showListed: true });
    expect(screen.getByText(/Texte/)).toBeInTheDocument();
    expect(screen.getByText(/Publiée/)).toBeInTheDocument();

    rerender(
        <MemoryRouter>
            <CheckRow check={{ ...base, listed: false }} showListed />
        </MemoryRouter>
    );
    expect(screen.getByText(/Non publiée/)).toBeInTheDocument();
});

test("a finished image check without sources shows no source count", () => {
    renderRow({ ...base, kind: "image_ai", verdict: "ia_non_detectee", source_count: 0 });
    expect(screen.getByText("PAS D'IA DÉTECTÉE")).toBeInTheDocument();
    expect(screen.getByText("il y a 12 min")).toBeInTheDocument();
    expect(screen.queryByText(/0 source/)).not.toBeInTheDocument();
});
