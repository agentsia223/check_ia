import { render, screen } from "@testing-library/react";
import OutcomeBar from "./OutcomeBar";

const segments = [
    { key: "correct", value: 72.8, color: "var(--green-700)", label: "72,8 %" },
    { key: "prudence", value: 24.3, color: "var(--navy-500)", label: "24,3 %" },
    { key: "wrong", value: 3, color: "var(--red-700)", label: "3,0 %" },
];

test("is one labelled image with segments sized by their values", () => {
    const { container } = render(<OutcomeBar segments={segments} ariaLabel="Répartition des issues" />);

    const bar = screen.getByRole("img", { name: "Répartition des issues" });
    const parts = container.querySelectorAll("[data-segment]");
    expect(bar).toBeInTheDocument();
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveAttribute("aria-hidden", "true");
    expect(parts[0].style.flexGrow).toBe("72.8");
    expect(parts[2].style.background).toBe("var(--red-700)");
    expect(screen.getByText("72,8 %")).toBeInTheDocument();
    // Too narrow to hold its label: left to the text equivalent.
    expect(screen.queryByText("3,0 %")).not.toBeInTheDocument();
});

test("the small size hides the inner labels", () => {
    render(<OutcomeBar segments={segments} ariaLabel="Répartition" size="sm" />);
    expect(screen.queryByText("72,8 %")).not.toBeInTheDocument();
    expect(screen.getByRole("img").className).toMatch(/sm/);
});
