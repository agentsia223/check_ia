import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Terms from "./Terms";
import Privacy from "./Privacy";
import NotFound from "./NotFound";

const renderPage = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

test("terms render their heading, sections and the contact address", () => {
    renderPage(<Terms />);
    expect(screen.getByRole("heading", { level: 1, name: "Conditions d'utilisation" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
    expect(screen.getByRole("link", { name: "contact@checkia.org" })).toHaveAttribute(
        "href",
        "mailto:contact@checkia.org"
    );
    expect(document.title).toBe("Conditions d'utilisation | Check-IA");
});

test("privacy uses the same contact address as the terms", () => {
    renderPage(<Privacy />);
    expect(screen.getByRole("heading", { level: 1, name: "Politique de confidentialité" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(8);
    expect(screen.getByRole("link", { name: "contact@checkia.org" })).toHaveAttribute(
        "href",
        "mailto:contact@checkia.org"
    );
    expect(screen.queryByText(/factcheck\.com/)).not.toBeInTheDocument();
});

test("the 404 page links home", () => {
    renderPage(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nouvelle vérification" })).toHaveAttribute("href", "/");
    expect(document.title).toBe("Page introuvable | Check-IA");
});
