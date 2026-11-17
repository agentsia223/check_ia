import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TextMode, { TEXT_MAX_CHARS, formatCount } from "./TextMode";

function Controlled({ initial = "", ...props }) {
    const [value, setValue] = useState(initial);
    return <TextMode value={value} onChange={setValue} {...props} />;
}

test("the limit is 1 000 characters", () => {
    expect(TEXT_MAX_CHARS).toBe(1000);
});

test("formats counts with a French thousands separator", () => {
    expect(formatCount(7)).toBe("7");
    expect(formatCount(1000)).toBe("1\u00a0000");
    expect(formatCount(12345)).toBe("12\u00a0345");
});

test("has a programmatic label, the placeholder and the 1 000 limit", () => {
    render(<Controlled />);
    const box = screen.getByRole("textbox", { name: "Affirmation à vérifier" });
    expect(box).toHaveAttribute("placeholder", "Collez une affirmation ou un message reçu");
    expect(box).toHaveAttribute("maxLength", "1000");
});

// Testing Library normalises the no-break spaces of the counter to plain spaces.
test("the live counter follows what is typed and is tied to the field", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const box = screen.getByRole("textbox", { name: "Affirmation à vérifier" });
    expect(screen.getByText("0 / 1 000")).toBeInTheDocument();

    await user.type(box, "Bonjour");
    const counter = screen.getByText("7 / 1 000");
    expect(box.getAttribute("aria-describedby")).toContain(counter.id);
});

test("over the limit (e.g. dictated text) the counter and an error say so", () => {
    render(<Controlled />);
    const box = screen.getByRole("textbox", { name: "Affirmation à vérifier" });
    fireEvent.change(box, { target: { value: "a".repeat(1001) } });

    expect(screen.getByText("1 001 / 1 000")).toBeInTheDocument();
    expect(screen.getByText(/dépasse 1 000 caractères/)).toBeInTheDocument();
    expect(box).toHaveAttribute("aria-invalid", "true");
});

test("accepts a visible label and a hint", () => {
    render(<Controlled label="Affirmation à vérifier (en français)" visibleLabel hint="Traduit du bambara." />);
    const box = screen.getByRole("textbox", { name: "Affirmation à vérifier (en français)" });
    const hint = screen.getByText("Traduit du bambara.");
    expect(box.getAttribute("aria-describedby")).toContain(hint.id);
});
