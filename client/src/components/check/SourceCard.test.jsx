import { render, screen } from "@testing-library/react";
import SourceCard from "./SourceCard";

const source = {
    title: "Communiqué du ministère de l'Énergie",
    url: "https://energie.gouv.ml/communique",
    domain: "energie.gouv.ml",
    date: "2026-11-12",
    snippet: "",
};

test("is an external link with number, title, domain and date", () => {
    render(<SourceCard source={source} index={1} />);
    const link = screen.getByRole("link", { name: /communiqué du ministère/i });
    expect(link).toHaveAttribute("href", source.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAccessibleName(expect.stringMatching(/nouvel onglet/i));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("energie.gouv.ml, 12 nov. 2026")).toBeInTheDocument();
});

test("has no reliability or stance chip", () => {
    render(<SourceCard source={{ ...source, stance: "contredit", reliability: "fiable" }} index={2} />);
    expect(screen.queryByText(/fiable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/contredit/i)).not.toBeInTheDocument();
});

test("falls back to the URL's domain and keeps an unparseable date as written", () => {
    render(<SourceCard source={{ title: "", url: "https://www.benbere.org/x", domain: "", date: "novembre 2026" }} index={3} />);
    expect(screen.getByText("benbere.org")).toBeInTheDocument();
    expect(screen.getByText("novembre 2026")).toBeInTheDocument();
});

test("never links to a non-http URL", () => {
    // eslint-disable-next-line no-script-url
    render(<SourceCard source={{ title: "Piège", url: "javascript:alert(1)", domain: "", date: "" }} index={4} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Piège")).toBeInTheDocument();
});
