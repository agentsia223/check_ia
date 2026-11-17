import { forwardRef, lazy, useState } from "react";

/**
 * React.lazy plus a `preload()` to start the download early (on hover, focus…).
 * Once the module has loaded, new mounts render the component at once, without
 * suspending, so a preloaded component appears exactly as an eagerly imported one.
 * Each mount keeps the component type it started with, so a mounted instance is never
 * remounted when the module arrives. Refs are forwarded.
 * @template P
 * @param {() => Promise<{default: React.ComponentType<P>}>} load
 * @returns {[React.ComponentType<P>, () => Promise<unknown>]}
 */
export function lazyWithPreload(load) {
    let loaded = null;
    let pending = null;
    const preload = () => {
        if (!pending) {
            pending = load().then(
                (module) => {
                    loaded = module.default;
                    return module;
                },
                (error) => {
                    pending = null; // a failed download (offline, stale chunk) may be retried
                    throw error;
                }
            );
        }
        return pending;
    };
    const Lazy = lazy(preload);
    const Preloadable = forwardRef(function Preloadable(props, ref) {
        const [Component] = useState(() => loaded ?? Lazy);
        return <Component ref={ref} {...props} />;
    });
    return [Preloadable, preload];
}
