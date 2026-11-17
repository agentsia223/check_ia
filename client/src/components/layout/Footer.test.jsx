import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Footer from "./Footer";

test("links are router links with real hrefs", () => {
    render(
        <MemoryRouter initialEntries={["/"]}>
            <Footer />
            <Routes>
                <Route path="/" element={<p>Accueil</p>} />
                <Route path="/conditions" element={<p>Page des conditions</p>} />
            </Routes>
        </MemoryRouter>
    );

    const expected = {
        Bibliothèque: "/bibliotheque",
        Fiabilité: "/fiabilite",
        "Conditions d'utilisation": "/conditions",
        "Politique de confidentialité": "/confidentialite",
    };
    Object.entries(expected).forEach(([name, href]) => {
        expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    });

    fireEvent.click(screen.getByRole("link", { name: "Conditions d'utilisation" }));
    expect(screen.getByText("Page des conditions")).toBeInTheDocument();
});

test("has a short description and no social icons", () => {
    render(
        <MemoryRouter>
            <Footer />
        </MemoryRouter>
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/vérifie/i);
    expect(screen.queryByRole("link", { name: /facebook|twitter|linkedin|instagram/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "contact@checkia.org" })).toHaveAttribute(
        "href",
        "mailto:contact@checkia.org"
    );
});
