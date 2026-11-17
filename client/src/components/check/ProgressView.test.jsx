import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgressView, { stepStates } from "./ProgressView";

const check = {
    id: "w7r1encour",
    kind: "text",
    claim: "Les cours reprennent lundi dans toutes les écoles de Kayes.",
    image_url: "",
    state: "running",
    created_at: new Date().toISOString(),
};

const renderView = (props = {}) =>
    render(<ProgressView check={check} elapsedSeconds={0} medianSeconds={30} {...props} />);

const stepClass = (name) => screen.getByText(name).closest("li").className;

test.each([
    [0, ["current", "pending", "pending", "pending"]],
    [1, ["current", "pending", "pending", "pending"]],
    [2, ["done", "current", "pending", "pending"]],
    [11, ["done", "current", "pending", "pending"]],
    [12, ["done", "done", "current", "pending"]],
    [170, ["done", "done", "current", "pending"]],
])("at %i s the steps are %j", (seconds, states) => {
    expect(stepStates(seconds, false)).toEqual(states);
});

test("Verdict completes only when the check is done", () => {
    expect(stepStates(170, true)).toEqual(["done", "done", "done", "done"]);
});

test("renders the steps with their state", () => {
    renderView({ elapsedSeconds: 18 });
    expect(stepClass("Lecture de l'affirmation")).toContain("done");
    expect(stepClass("Recherche de sources")).toContain("done");
    expect(stepClass("Comparaison des sources")).toContain("current");
    expect(screen.getByText("Comparaison des sources").closest("li")).toHaveAttribute("aria-current", "step");
    expect(stepClass("Verdict")).not.toContain("done");
});

test("shows the claim and the elapsed time against the median", () => {
    renderView({ elapsedSeconds: 18 });
    expect(screen.getByText("« Les cours reprennent lundi dans toutes les écoles de Kayes. »")).toBeInTheDocument();
    expect(screen.getByText("18 secondes écoulées, réponse en 30 secondes environ")).toBeInTheDocument();
});

test("uses the singular for one second", () => {
    renderView({ elapsedSeconds: 1 });
    expect(screen.getByText("1 seconde écoulée, réponse en 30 secondes environ")).toBeInTheDocument();
});

test("Annuler is shown only when the viewer can cancel, and calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn(() => Promise.resolve());
    const { rerender } = renderView({ canCancel: false, onCancel });
    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
    rerender(<ProgressView check={check} elapsedSeconds={5} medianSeconds={30} canCancel onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalled();
});

test("a failed cancel shows a French error", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("../../lib/api");
    const onCancel = vi.fn(() => Promise.reject(new ApiError(0, "network")));
    renderView({ canCancel: true, onCancel });
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connexion impossible");
});

test("network trouble shows one quiet notice", () => {
    renderView({ networkTrouble: true });
    expect(screen.getByText(/Nouvel essai automatique/)).toBeInTheDocument();
});

test("the note about leaving the page mentions history only when signed in", () => {
    const { rerender } = renderView({ isLoggedIn: true });
    expect(screen.getByText(/apparaîtra dans Mes vérifications/)).toBeInTheDocument();
    rerender(<ProgressView check={check} elapsedSeconds={0} medianSeconds={30} isLoggedIn={false} />);
    expect(screen.queryByText(/Mes vérifications/)).not.toBeInTheDocument();
    expect(screen.getByText(/gardez-le pour retrouver le résultat/)).toBeInTheDocument();
});

test("an image check shows its thumbnail", () => {
    render(
        <ProgressView
            check={{ ...check, kind: "image_ai", claim: "", image_url: "/media/x.jpg" }}
            elapsedSeconds={0}
            medianSeconds={30}
        />
    );
    expect(screen.getByRole("img", { name: "Image envoyée pour la vérification" })).toHaveAttribute("src", "/media/x.jpg");
});

test.each([
    ["image_content", "Analyse du contenu"],
    ["image_ai", "Recherche d'indices de génération par IA"],
])("a %s check names its own steps, not the source search", (kind, step) => {
    renderView({ check: { ...check, kind, claim: "" }, elapsedSeconds: 3 });
    expect(stepClass(step)).toContain("current");
    expect(screen.queryByText("Recherche de sources")).not.toBeInTheDocument();
    expect(screen.getByText(`Étape en cours : ${step}`)).toBeInTheDocument();
});
