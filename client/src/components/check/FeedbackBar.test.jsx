import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../../lib/api";
import { sendFeedback } from "../../lib/checks";
import FeedbackBar from "./FeedbackBar";

vi.mock("../../lib/checks", () => ({ sendFeedback: vi.fn() }));

beforeEach(() => {
    sendFeedback.mockReset().mockResolvedValue({ ok: true });
});

test("asks whether the verdict seems right", () => {
    render(<FeedbackBar checkId="abc" />);
    expect(screen.getByText("Ce verdict vous semble-t-il juste ?")).toBeInTheDocument();
});

test("for an analysis without verdict the question is about the analysis", () => {
    render(<FeedbackBar checkId="abc" hasVerdict={false} />);
    expect(screen.getByText("Cette analyse vous semble-t-elle juste ?")).toBeInTheDocument();
});

test.each([
    ["Oui", true],
    ["Non", false],
])("%s sends helpful=%s and thanks the reader", async (label, helpful) => {
    const user = userEvent.setup();
    render(<FeedbackBar checkId="abc" />);
    await user.click(screen.getByRole("button", { name: label }));
    expect(sendFeedback).toHaveBeenCalledWith("abc", { helpful });
    expect(await screen.findByText("Merci pour votre avis.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Oui" })).not.toBeInTheDocument();
});

test("Signaler une erreur opens a short optional form and sends it", async () => {
    const user = userEvent.setup();
    render(<FeedbackBar checkId="abc" />);
    const toggle = screen.getByRole("button", { name: "Signaler une erreur" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.type(screen.getByLabelText(/Qu'est-ce qui ne va pas/), "La date est fausse.");
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));
    expect(sendFeedback).toHaveBeenCalledWith("abc", { helpful: false, message: "La date est fausse." });
    expect(await screen.findByText("Merci, votre signalement a été envoyé.")).toBeInTheDocument();
});

test("a failed send shows a French error and keeps the controls", async () => {
    const user = userEvent.setup();
    sendFeedback.mockRejectedValue(new ApiError(429, "rate_limited"));
    render(<FeedbackBar checkId="abc" />);
    await user.click(screen.getByRole("button", { name: "Oui" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Trop de demandes");
    expect(screen.getByRole("button", { name: "Oui" })).toBeInTheDocument();
});
