import { render, screen } from "@testing-library/react";
import Stamp from "./Stamp";

describe("Stamp", () => {
    test.each([
        ["vrai", "VRAI"],
        ["faux", "FAUX"],
        ["incertain", "INCERTAIN"],
        ["ia_detectee", "GÉNÉRÉE PAR IA"],
        ["ia_non_detectee", "PAS D'IA DÉTECTÉE"],
    ])("%s renders its label as text", (verdict, label) => {
        render(<Stamp verdict={verdict} />);
        expect(screen.getByText(label)).toBeInTheDocument();
    });

    test("renders nothing without a stamped verdict", () => {
        const { container } = render(<Stamp verdict="analyse" />);
        expect(container).toBeEmptyDOMElement();
        const { container: empty } = render(<Stamp verdict={null} size="sm" />);
        expect(empty).toBeEmptyDOMElement();
    });

    test("small and large stamps carry their size and tone", () => {
        render(<Stamp verdict="faux" size="sm" />);
        const stamp = screen.getByText("FAUX").closest("[data-tone]");
        expect(stamp).toHaveAttribute("data-tone", "red");
        expect(stamp.className).toMatch(/sm/);
    });

    test("the large stamp can animate once and forwards extra props", () => {
        render(<Stamp verdict="vrai" animate id="verdict" tabIndex={-1} />);
        const stamp = screen.getByText("VRAI").closest("[data-tone]");
        expect(stamp).toHaveAttribute("id", "verdict");
        expect(stamp.className).toMatch(/animate/);
    });
});
