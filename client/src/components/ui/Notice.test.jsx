import { render, screen } from "@testing-library/react";
import Notice from "./Notice";

describe("Notice", () => {
    test("errors are alerts, others are status messages", () => {
        const { rerender } = render(<Notice tone="error">La connexion a échoué.</Notice>);
        expect(screen.getByRole("alert")).toHaveTextContent("La connexion a échoué.");
        rerender(<Notice tone="warning" title="Attention">Texte</Notice>);
        expect(screen.getByRole("status")).toHaveTextContent("AttentionTexte");
        rerender(<Notice>Info</Notice>);
        expect(screen.getByRole("status").className).toMatch(/info/);
    });
});
