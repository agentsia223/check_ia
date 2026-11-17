import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Library from "./Library";
import { createQueryClient } from "../lib/queryClient";
import { listChecks } from "../lib/checks";

vi.mock("../lib/checks", () => ({ listChecks: vi.fn() }));

const renderPage = () =>
    render(
        <QueryClientProvider client={createQueryClient()}>
            <MemoryRouter>
                <Library />
            </MemoryRouter>
        </QueryClientProvider>
    );

test("explains that checks are automatic and chosen for publication", async () => {
    listChecks.mockResolvedValue({ count: 0, page: 1, page_size: 20, results: [] });
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Bibliothèque" })).toBeInTheDocument();
    expect(screen.getByText(/automatiques/)).toBeInTheDocument();
    expect(screen.getByText(/Aucune n'est relue/)).toBeInTheDocument();
    expect(screen.getByText(/choisi de publier/)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Nouvelle vérification" })).toHaveAttribute("href", "/");
    expect(listChecks).toHaveBeenCalledWith({ scope: "library", q: "", verdict: "", page: 1 });
    expect(document.title).toBe("Bibliothèque | Check-IA");
});
