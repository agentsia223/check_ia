import { fireEvent, render, screen } from "@testing-library/react";
import CheckClaim from "./CheckClaim";

const imageCheck = { kind: "image_ai", claim: "", image_url: "https://storage.test/a.jpeg" };

describe("CheckClaim", () => {
    it("shows the submitted image", () => {
        render(<CheckClaim check={imageCheck} />);
        expect(screen.getByRole("img", { name: "Image envoyée pour la vérification" })).toHaveAttribute(
            "src",
            imageCheck.image_url,
        );
        expect(screen.queryByText("Vérification sans texte")).not.toBeInTheDocument();
    });

    it("shows the placeholder when there is neither image nor claim", () => {
        render(<CheckClaim check={{ ...imageCheck, image_url: "" }} />);
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByText("Vérification sans texte")).toBeInTheDocument();
    });

    it("hides an image that fails to load and falls back to the placeholder", () => {
        render(<CheckClaim check={imageCheck} />);
        fireEvent.error(screen.getByRole("img"));
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByText("Vérification sans texte")).toBeInTheDocument();
    });

    it("keeps the claim when the image fails, and retries a new image URL", () => {
        const check = { ...imageCheck, kind: "image_content", claim: "Photo de la crue" };
        const { rerender } = render(<CheckClaim check={check} />);
        fireEvent.error(screen.getByRole("img"));
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByText("« Photo de la crue »")).toBeInTheDocument();
        expect(screen.queryByText("Vérification sans texte")).not.toBeInTheDocument();

        rerender(<CheckClaim check={{ ...check, image_url: "https://storage.test/b.jpeg" }} />);
        expect(screen.getByRole("img")).toHaveAttribute("src", "https://storage.test/b.jpeg");
    });
});
