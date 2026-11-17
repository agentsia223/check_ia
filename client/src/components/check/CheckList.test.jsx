import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { vi } from "vitest";
import CheckList from "./CheckList";
import { createQueryClient } from "../../lib/queryClient";
import { ApiError } from "../../lib/api";
import { listChecks } from "../../lib/checks";

vi.mock("../../lib/checks", () => ({ listChecks: vi.fn() }));

const item = (n, extra = {}) => ({
    id: `id${n}`,
    kind: "text",
    claim: `Affirmation ${n}`,
    state: "done",
    verdict: "faux",
    source_count: 2,
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    listed: true,
    ...extra,
});
const page = (results, extra = {}) => ({ count: results.length, page: 1, page_size: 20, results, ...extra });

function Where() {
    const loc = useLocation();
    return <output data-testid="where">{loc.pathname + loc.search}</output>;
}

const newClient = () => createQueryClient({ defaultOptions: { queries: { retry: false } } });

function renderList(props = {}, url = "/bibliotheque", client = newClient()) {
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[url]}>
                <CheckList scope="library" emptyTitle="Rien ici" emptyAction={{ label: "Vérifier", to: "/" }} {...props} />
                <Where />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    listChecks.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
});

test("renders rows in a real list and announces the count", async () => {
    listChecks.mockResolvedValue(page([item(1), item(2)]));
    renderList();
    const list = await screen.findByRole("list", { name: "Vérifications" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("2 vérifications")).toBeInTheDocument();
    expect(screen.getByText("2 vérifications").closest("[role=status]")).toHaveAttribute("aria-live", "polite");
    expect(listChecks).toHaveBeenCalledWith({ scope: "library", q: "", verdict: "", page: 1 });
});

test("shows loading skeleton rows first", async () => {
    listChecks.mockReturnValue(new Promise(() => {}));
    renderList();
    expect(await screen.findByTestId("check-skeleton")).toBeInTheDocument();
});

test("error shows a message and Réessayer refetches", async () => {
    listChecks.mockRejectedValueOnce(new ApiError(0, "network"));
    renderList();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    listChecks.mockResolvedValue(page([item(1)]));
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Affirmation 1")).toBeInTheDocument();
});

test("empty without filters shows the empty title and the action", async () => {
    listChecks.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("Rien ici")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vérifier" })).toHaveAttribute("href", "/");
});

test("empty with filters shows Aucun résultat and resets the filters", async () => {
    listChecks.mockResolvedValue(page([]));
    renderList({}, "/bibliotheque?q=zzz&verdict=vrai&page=1");
    expect(await screen.findByText("Aucun résultat")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Réinitialiser les filtres" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/bibliotheque");
    expect(screen.getByTestId("where").textContent).not.toContain("q=");
    expect(screen.getByLabelText("Rechercher")).toHaveValue("");
});

test("reads q, verdict and page from the URL and sends them to the API", async () => {
    listChecks.mockResolvedValue(page([item(1)], { count: 45, page: 2 }));
    renderList({}, "/bibliotheque?q=eau&verdict=incertain&page=2");
    await screen.findByText("Affirmation 1");
    expect(listChecks).toHaveBeenCalledWith({ scope: "library", q: "eau", verdict: "incertain", page: 2 });
    expect(screen.getByLabelText("Rechercher")).toHaveValue("eau");
    expect(screen.getByLabelText("Verdict")).toHaveValue("incertain");
});

test("search is debounced by 300 ms and resets to page 1", async () => {
    listChecks.mockResolvedValue(page([item(1)], { count: 45, page: 3 }));
    renderList({}, "/bibliotheque?page=3");
    await screen.findByText("Affirmation 1");
    vi.useFakeTimers();
    try {
        fireEvent.change(screen.getByLabelText("Rechercher"), { target: { value: "riz" } });
        act(() => vi.advanceTimersByTime(299));
        expect(screen.getByTestId("where")).toHaveTextContent("/bibliotheque?page=3");
        act(() => vi.advanceTimersByTime(1));
        expect(screen.getByTestId("where")).toHaveTextContent("/bibliotheque?q=riz");
        expect(screen.getByTestId("where").textContent).not.toContain("page=");
    } finally {
        vi.useRealTimers();
    }
});

test("while loading, the status line says Chargement…", () => {
    listChecks.mockReturnValue(new Promise(() => {}));
    renderList();
    expect(screen.getAllByRole("status").some((node) => node.textContent === "Chargement…")).toBe(true);
});

test("a page past the end goes to the last page instead of showing the empty state", async () => {
    listChecks.mockImplementation(({ page: n }) =>
        Promise.resolve(n === 3 ? page([item(1)], { count: 45, page: 3 }) : page([], { count: 45, page: n }))
    );
    renderList({}, "/bibliotheque?page=9");
    expect(await screen.findByText("Affirmation 1")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/bibliotheque?page=3");
    expect(screen.queryByText("Rien ici")).not.toBeInTheDocument();
    expect(listChecks).toHaveBeenCalledWith({ scope: "library", q: "", verdict: "", page: 9 });
});

test("changing the verdict filter updates the URL and resets to page 1", async () => {
    listChecks.mockResolvedValue(page([item(1)], { count: 45, page: 2 }));
    renderList({}, "/bibliotheque?page=2");
    await screen.findByText("Affirmation 1");
    const select = screen.getByLabelText("Verdict");
    expect([...select.options].map((o) => [o.value, o.textContent])).toEqual([
        ["", "Tous"],
        ["vrai", "Vrai"],
        ["faux", "Faux"],
        ["incertain", "Incertain"],
    ]);
    await userEvent.selectOptions(select, "faux");
    expect(screen.getByTestId("where")).toHaveTextContent("/bibliotheque?verdict=faux");
    expect(screen.getByTestId("where").textContent).not.toContain("page=");
    await waitFor(() =>
        expect(listChecks).toHaveBeenLastCalledWith({ scope: "library", q: "", verdict: "faux", page: 1 })
    );
});

test("pagination writes page to the URL and scrolls to the list", async () => {
    listChecks.mockResolvedValue(page([item(1)], { count: 45 }));
    renderList();
    await screen.findByText("Affirmation 1");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/bibliotheque?page=2");
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
});

test("mine scope requests scope=mine and shows kind and listed state", async () => {
    listChecks.mockResolvedValue(page([item(1, { listed: false })]));
    renderList({ scope: "mine" }, "/mes-verifications");
    expect(await screen.findByText(/Non publiée/)).toBeInTheDocument();
    expect(screen.getByText(/Texte/)).toBeInTheDocument();
    expect(listChecks).toHaveBeenCalledWith({ scope: "mine", q: "", verdict: "", page: 1 });
});

test("mine scope refetches on every mount and on window focus", async () => {
    listChecks.mockResolvedValue(page([item(1, { listed: false })]));
    const client = newClient();
    const first = renderList({ scope: "mine" }, "/mes-verifications", client);
    await screen.findByText("Affirmation 1");
    expect(listChecks).toHaveBeenCalledTimes(1);
    first.unmount();

    renderList({ scope: "mine" }, "/mes-verifications", client);
    await waitFor(() => expect(listChecks).toHaveBeenCalledTimes(2));

    act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
    });
    await waitFor(() => expect(listChecks).toHaveBeenCalledTimes(3));
    focusManager.setFocused(undefined);
});

test("library scope reuses fresh data on remount", async () => {
    listChecks.mockResolvedValue(page([item(1)]));
    const client = newClient();
    const first = renderList({}, "/bibliotheque", client);
    await screen.findByText("Affirmation 1");
    first.unmount();
    renderList({}, "/bibliotheque", client);
    await screen.findByText("Affirmation 1");
    expect(listChecks).toHaveBeenCalledTimes(1);
    // The list query lives under the shared ["checks", …] prefix that mutations invalidate.
    expect(client.getQueryCache().findAll({ queryKey: ["checks"] })).toHaveLength(1);
});
