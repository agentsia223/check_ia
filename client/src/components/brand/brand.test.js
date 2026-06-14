import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Logo from "./Logo";
import VerdictBadge from "./VerdictBadge";
import ConfidenceMeter from "./ConfidenceMeter";
import SourceCard from "./SourceCard";
import * as Brand from "./index";
import theme from "../../theme";

describe("brand theme", () => {
    test("exposes the Check-IA brand palette, shape and type", () => {
        expect(theme.palette.primary.main).toBe("#28348a");
        expect(theme.palette.secondary.main).toBe("#39a935");
        expect(theme.palette.error.main).toBe("#d92d20");
        expect(theme.palette.warning.main).toBe("#e8870a");
        expect(theme.palette.background.default).toBe("#f7f8fb");
        expect(theme.shape.borderRadius).toBe(12);
        expect(theme.shadows).toHaveLength(25);
        expect(theme.typography.button.textTransform).toBe("none");
        expect(theme.typography.fontFamily).toMatch(/Barlow/);
        expect(theme.typography.h1.fontFamily).toMatch(/Barlow Semi Condensed/);
    });
});

describe("brand barrel", () => {
    test("re-exports every primitive", () => {
        expect(Brand.Logo).toBe(Logo);
        expect(Brand.VerdictBadge).toBe(VerdictBadge);
        expect(Brand.ConfidenceMeter).toBe(ConfidenceMeter);
        expect(Brand.SourceCard).toBe(SourceCard);
    });
});

describe("Logo", () => {
    test("renders the full logo by default", () => {
        render(<Logo />);
        expect(screen.getByAltText("Check-IA").getAttribute("src")).toMatch(/logo-full\.svg$/);
    });

    test("renders the reversed icon variant on navy surfaces", () => {
        render(<Logo variant="icon" white height={120} alt="Check-IA logo" />);
        const img = screen.getByAltText("Check-IA logo");
        expect(img.getAttribute("src")).toMatch(/logo-icon-white\.svg$/);
    });
});

describe("VerdictBadge", () => {
    test.each([
        ["true", "Vrai"],
        ["false", "Faux"],
        ["misleading", "Trompeur"],
        ["unverified", "Non vérifié"],
    ])("renders the %s verdict with its label and glyph", (verdict, label) => {
        const { unmount } = render(<VerdictBadge verdict={verdict} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
    });

    test("supports solid variant, large size and a custom label", () => {
        render(<VerdictBadge verdict="true" variant="solid" size="lg" label="Confirmé" />);
        expect(screen.getByText("Confirmé")).toBeInTheDocument();
    });

    test("falls back to 'Non vérifié' for an unknown verdict or size", () => {
        render(<VerdictBadge verdict="bogus" size="bogus" />);
        expect(screen.getByText("Non vérifié")).toBeInTheDocument();
    });
});

describe("ConfidenceMeter", () => {
    test("clamps high values to 100%", () => {
        render(<ConfidenceMeter value={150} verdict="true" />);
        expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("clamps negatives, hides the value and renders a custom label", () => {
        render(<ConfidenceMeter value={-5} verdict="false" label="Confiance" showValue={false} />);
        expect(screen.getByText("Confiance")).toBeInTheDocument();
        expect(screen.queryByText("0%")).not.toBeInTheDocument();
    });

    test("falls back to the default fill for an unknown verdict", () => {
        render(<ConfidenceMeter value={40} verdict="bogus" />);
        expect(screen.getByText("40%")).toBeInTheDocument();
    });
});

describe("SourceCard", () => {
    test("renders a ranked, contested source and toggles its hover state", () => {
        const { container } = render(
            <SourceCard
                name="AFP Factuel"
                domain="factuel.afp.com"
                url="https://factuel.afp.com"
                date="12 juin 2026"
                snippet="Aucune mesure officielle publiée."
                rank={1}
                reliability="contestée"
            />
        );
        expect(screen.getByText("AFP Factuel")).toBeInTheDocument();
        expect(screen.getByText("contestée")).toBeInTheDocument();

        const link = container.querySelector("a");
        expect(link.getAttribute("href")).toBe("https://factuel.afp.com");
        fireEvent.mouseEnter(link);
        fireEvent.mouseLeave(link);
    });

    test("handles 'à confirmer', the initial fallback and an unknown reliability", () => {
        const { container, rerender } = render(
            <SourceCard name="Benbere" domain="benbere.org" reliability="à confirmer" />
        );
        expect(screen.getByText("Benbere")).toBeInTheDocument();

        // No name/url -> initial falls back to the domain, href falls back to "#",
        // unknown reliability falls back to the "fiable" tone.
        rerender(<SourceCard domain="example.org" reliability="inconnue" />);
        expect(container.querySelector("a").getAttribute("href")).toBe("#");
    });
});
