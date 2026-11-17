import { createRef, forwardRef, Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { lazyWithPreload } from "./lazyWithPreload";

const Target = forwardRef(function Target({ label }, ref) {
    return <input ref={ref} aria-label={label} />;
});

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

test("suspends until the module loads when not preloaded", async () => {
    const [Component] = lazyWithPreload(() => Promise.resolve({ default: Target }));
    render(
        <Suspense fallback={<p>Chargement…</p>}>
            <Component label="Champ" />
        </Suspense>
    );
    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    expect(await screen.findByLabelText("Champ")).toBeInTheDocument();
});

test("renders at once, with its ref, once preloaded; loads only once", async () => {
    const load = vi.fn(() => Promise.resolve({ default: Target }));
    const [Component, preload] = lazyWithPreload(load);
    await preload();
    await preload();
    const ref = createRef();
    render(
        <Suspense fallback={<p>Chargement…</p>}>
            <Component ref={ref} label="Champ" />
        </Suspense>
    );
    expect(screen.queryByText("Chargement…")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Champ")).toBe(ref.current);
    expect(load).toHaveBeenCalledTimes(1);
});

test("a mounted instance is not remounted when the module arrives", async () => {
    const { promise, resolve } = deferred();
    const [Component] = lazyWithPreload(() => promise);
    const { rerender } = render(
        <Suspense fallback={<p>Chargement…</p>}>
            <Component label="Champ" />
        </Suspense>
    );
    resolve({ default: Target });
    const input = await screen.findByLabelText("Champ");
    rerender(
        <Suspense fallback={<p>Chargement…</p>}>
            <Component label="Champ" />
        </Suspense>
    );
    expect(screen.getByLabelText("Champ")).toBe(input);
});

test("a failed preload can be retried", async () => {
    const load = vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce({ default: Target });
    const [, preload] = lazyWithPreload(load);
    await expect(preload()).rejects.toThrow("offline");
    await expect(preload()).resolves.toEqual({ default: Target });
    expect(load).toHaveBeenCalledTimes(2);
});
