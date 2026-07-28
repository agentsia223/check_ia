import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Fiabilite from "./Fiabilite";
import Reliability from "./Reliability";
import { fiabilite } from "../data/fiabilite";

const renderPage = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("Fiabilité (FR)", () => {
    test("renders the headings, the outcome split and the methodology link", () => {
        renderPage(<Fiabilite />);

        expect(
            screen.getByRole("heading", { level: 1, name: /fiabilité de check-ia/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 2, name: /comment lire ces chiffres/i })
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: /^résultats$/i })).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 2, name: /méthodologie en bref/i })
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: /^limites$/i })).toBeInTheDocument();

        // French formatting: comma decimals, space before the percent sign.
        // Each percentage appears twice: once as a bar segment label, once in the bullets.
        const bullets = screen.getAllByRole("listitem").map((li) => li.textContent);
        expect(bullets).toEqual([
            "72,8 % — verdict correct",
            "24,3 % — prudence : Check-IA a préféré ne pas trancher",
            "3,0 % — verdict erroné",
        ]);
        expect(screen.getByText(/96,1 %/)).toBeInTheDocument();
        expect(screen.getByText(/1,7 %/)).toBeInTheDocument();

        // The bar has a text equivalent for assistive tech.
        expect(
            screen.getByRole("img", { name: /répartition des issues/i })
        ).toBeInTheDocument();

        expect(
            screen.getByRole("link", { name: /télécharger la note méthodologique \(pdf\)/i })
        ).toHaveAttribute("href", "/methodologie-checkia-v1.pdf");
        expect(screen.getByRole("link", { name: /english version/i })).toHaveAttribute(
            "href",
            "/reliability"
        );
    });
});

describe("Reliability (EN)", () => {
    test("renders the headings, the outcome split and the methodology link", () => {
        renderPage(<Reliability />);

        expect(
            screen.getByRole("heading", { level: 1, name: /check-ia reliability/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 2, name: /how to read these numbers/i })
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2, name: /^results$/i })).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 2, name: /methodology in brief/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 2, name: /^limitations$/i })
        ).toBeInTheDocument();

        // English formatting: decimal points, no space before the percent sign.
        const bullets = screen.getAllByRole("listitem").map((li) => li.textContent);
        expect(bullets).toEqual([
            "72.8% — correct verdict",
            "24.3% — caution: Check-IA chose not to rule",
            "3.0% — wrong verdict",
        ]);
        expect(screen.getByText(/96\.1%/)).toBeInTheDocument();
        expect(screen.getByText(/1\.7%/)).toBeInTheDocument();

        expect(screen.getByRole("img", { name: /outcome split/i })).toBeInTheDocument();

        expect(
            screen.getByRole("link", { name: /download the methodology note \(pdf\)/i })
        ).toHaveAttribute("href", "/methodology-checkia-v1-en.pdf");
        expect(screen.getByRole("link", { name: /version française/i })).toHaveAttribute(
            "href",
            "/fiabilite"
        );
    });
});

test("both pages read their numbers from the shared data constant", () => {
    const { unmount } = renderPage(<Fiabilite />);
    expect(screen.getByText(new RegExp(`Sur ${fiabilite.nPrimary} affirmations`))).toBeInTheDocument();
    unmount();

    renderPage(<Reliability />);
    expect(screen.getByText(new RegExp(`Across ${fiabilite.nPrimary} claims`))).toBeInTheDocument();
});
