import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import History from "./History";
import { createQueryClient } from "../lib/queryClient";
import { listChecks } from "../lib/checks";

vi.mock("../lib/checks", () => ({ listChecks: vi.fn() }));

const renderPage = () =>
    render(
        <QueryClientProvider client={createQueryClient()}>
            <MemoryRouter>
                <History />
            </MemoryRouter>
        </QueryClientProvider>
    );

test("requests scope=mine and shows each row's listed state", async () => {
    listChecks.mockResolvedValue({
        count: 2,
        page: 1,
        page_size: 20,
        results: [
            { id: "a", kind: "text", claim: "Une", state: "done", verdict: "vrai", source_count: 1, created_at: new Date().toISOString(), listed: true },
            { id: "b", kind: "image_ai", claim: "", state: "done", verdict: "ia_detectee", source_count: 0, created_at: new Date().toISOString(), listed: false },
        ],
    });
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Mes vérifications" })).toBeInTheDocument();
    expect(await screen.findByText(/· Publiée/)).toBeInTheDocument();
    expect(screen.getByText(/· Non publiée/)).toBeInTheDocument();
    expect(listChecks).toHaveBeenCalledWith({ scope: "mine", q: "", verdict: "", page: 1 });
    expect(document.title).toBe("Mes vérifications | Check-IA");
});

test("empty history links to the home page", async () => {
    listChecks.mockResolvedValue({ count: 0, page: 1, page_size: 20, results: [] });
    renderPage();
    expect(await screen.findByText("Vous n'avez encore rien vérifié")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nouvelle vérification" })).toHaveAttribute("href", "/");
});
