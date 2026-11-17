import { render, screen } from "@testing-library/react";
import Field from "./Field";

describe("Field", () => {
    test("ties the label, hint and error to the input", () => {
        render(<Field label="Adresse e-mail" type="email" autoComplete="email" hint="Nous ne la partageons pas." error="Adresse invalide." />);
        const input = screen.getByLabelText("Adresse e-mail");
        expect(input).toHaveAttribute("type", "email");
        expect(input).toHaveAttribute("autocomplete", "email");
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription("Nous ne la partageons pas. Adresse invalide.");
    });

    test("uses a given id and supports a textarea and trailing content", () => {
        render(
            <Field
                id="claim"
                label="Affirmation"
                multiline
                rows={4}
                trailing={<button type="button">Afficher</button>}
            />
        );
        const textarea = screen.getByLabelText("Affirmation");
        expect(textarea.tagName).toBe("TEXTAREA");
        expect(textarea).toHaveAttribute("id", "claim");
        expect(textarea).not.toHaveAttribute("aria-invalid");
        expect(textarea).not.toHaveAttribute("aria-describedby");
        expect(screen.getByRole("button", { name: "Afficher" })).toBeInTheDocument();
    });
});
