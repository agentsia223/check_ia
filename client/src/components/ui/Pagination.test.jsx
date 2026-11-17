import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "./Pagination";

describe("Pagination", () => {
    test("renders nothing for a single page", () => {
        const { container } = render(<Pagination page={1} pageCount={1} onChange={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    test("navigates with previous, next and page buttons", () => {
        const onChange = vi.fn();
        render(<Pagination page={5} pageCount={10} onChange={onChange} />);

        expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
        fireEvent.click(screen.getByRole("button", { name: /précédente/i }));
        expect(onChange).toHaveBeenLastCalledWith(4);
        fireEvent.click(screen.getByRole("button", { name: /suivante/i }));
        expect(onChange).toHaveBeenLastCalledWith(6);
        fireEvent.click(screen.getByRole("button", { name: "Page 10" }));
        expect(onChange).toHaveBeenLastCalledWith(10);
        fireEvent.click(screen.getByRole("button", { name: "Page 1" }));
        expect(onChange).toHaveBeenLastCalledWith(1);
        expect(screen.getAllByText("…")).toHaveLength(2);
    });

    test("disables previous on the first page and next on the last", () => {
        const { rerender } = render(<Pagination page={1} pageCount={3} onChange={() => {}} />);
        expect(screen.getByRole("button", { name: /précédente/i })).toBeDisabled();
        rerender(<Pagination page={3} pageCount={3} onChange={() => {}} />);
        expect(screen.getByRole("button", { name: /suivante/i })).toBeDisabled();
    });
});
