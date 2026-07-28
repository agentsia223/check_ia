import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";
import { AuthContext } from "../utils/AuthContext";
import { fiabilite } from "../data/fiabilite";

jest.mock("../utils/AuthContext", () => {
    const React = require("react");
    return { AuthContext: React.createContext() };
});

const renderHome = (isLoggedIn = false) =>
    render(
        <AuthContext.Provider value={{ isLoggedIn }}>
            <MemoryRouter>
                <Home />
            </MemoryRouter>
        </AuthContext.Provider>
    );

test("states what was evaluated instead of an unsourced accuracy claim", () => {
    const { container } = renderHome();

    // The old "99.2% de précision" claim contradicted the published evaluation.
    expect(container.textContent).not.toMatch(/99[.,]2/);
    expect(container.textContent).not.toMatch(/de précision/i);

    expect(
        screen.getAllByText(
            new RegExp(`Évalué sur ${fiabilite.n} vérifications réelles`)
        ).length
    ).toBeGreaterThan(0);
});

test("a logged-out visitor can reach the reliability page from the hero and the Fiable card", () => {
    renderHome(false);

    const links = screen.getAllByRole("link", { name: /fiabilit|méthodologie|évalué sur/i });
    const toFiabilite = links.filter(
        (link) => link.getAttribute("href") === "/fiabilite"
    );

    // Hero line + the "Fiable" card both point at /fiabilite.
    expect(toFiabilite.length).toBeGreaterThanOrEqual(2);
    expect(
        within(toFiabilite.find((l) => /fiable/i.test(l.textContent)) ?? toFiabilite[0])
            .queryByText(/99[.,]2/)
    ).toBeNull();
});
