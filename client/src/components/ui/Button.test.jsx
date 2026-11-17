import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Button from "./Button";

describe("Button", () => {
    test("renders a button of type button with variant and size classes", () => {
        render(<Button>Vérifier</Button>);
        const button = screen.getByRole("button", { name: "Vérifier" });
        expect(button).toHaveAttribute("type", "button");
        expect(button.className).toMatch(/primary/);
        expect(button.className).toMatch(/md/);
    });

    test("passes props through and accepts a submit type", () => {
        const onClick = vi.fn();
        render(
            <Button type="submit" variant="ghost" size="sm" onClick={onClick} aria-describedby="x">
                Envoyer
            </Button>
        );
        const button = screen.getByRole("button", { name: "Envoyer" });
        expect(button).toHaveAttribute("type", "submit");
        expect(button).toHaveAttribute("aria-describedby", "x");
        expect(button.className).toMatch(/ghost/);
        expect(button.className).toMatch(/sm/);
        fireEvent.click(button);
        expect(onClick).toHaveBeenCalled();
    });

    test("renders a router link when given `to`", () => {
        render(
            <MemoryRouter>
                <Button to="/connexion" variant="secondary">
                    Connexion
                </Button>
            </MemoryRouter>
        );
        const link = screen.getByRole("link", { name: "Connexion" });
        expect(link).toHaveAttribute("href", "/connexion");
        expect(link.className).toMatch(/secondary/);
    });

    test("loading disables the button and marks it busy, keeping its label", () => {
        const onClick = vi.fn();
        render(
            <Button loading onClick={onClick}>
                Vérifier
            </Button>
        );
        const button = screen.getByRole("button", { name: /vérifier/i });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("aria-busy", "true");
        fireEvent.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });
});
