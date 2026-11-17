import { render, screen } from "@testing-library/react";
import Icon, { ICON_NAMES } from "./Icon";

describe("Icon", () => {
    test("is decorative by default", () => {
        const { container } = render(<Icon name="text" />);
        const svg = container.querySelector("svg");
        expect(svg).toHaveAttribute("aria-hidden", "true");
        expect(svg.querySelector("path")).not.toBeNull();
    });

    test("can carry a label", () => {
        render(<Icon name="out" label="Lien externe" />);
        expect(screen.getByRole("img", { name: "Lien externe" })).toBeInTheDocument();
    });

    test("every listed name draws something; unknown names draw nothing", () => {
        ICON_NAMES.forEach((name) => {
            const { container, unmount } = render(<Icon name={name} />);
            expect(container.querySelector("svg").childElementCount).toBeGreaterThan(0);
            unmount();
        });
        const { container } = render(<Icon name="inconnu" />);
        expect(container).toBeEmptyDOMElement();
    });
});
