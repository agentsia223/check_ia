import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Origin of the API (from REACT_APP_API_URL), or "" when it is not a full URL. */
function apiOrigin(apiUrl) {
    try {
        return new URL(apiUrl).origin;
    } catch {
        return "";
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), ["VITE_", "REACT_APP_"]);
    const mockApi = env.VITE_MOCK_API === "1";

    // Without VITE_MOCK_API the mock import sits in dead code, but the bundler would
    // still emit it as a chunk. Mark it external so build/ never contains it.
    const dropMockApi = {
        name: "check-ia:drop-mock-api",
        apply: "build",
        enforce: "pre",
        resolveId(source) {
            if (!mockApi && /(^|\/)mockApi\.js$/.test(source)) return { id: source, external: true };
            return null;
        },
    };

    // Preload the two font files the home page paints first (body text and headline), so
    // they do not wait for the stylesheet to be parsed.
    const preloadFonts = {
        name: "check-ia:preload-fonts",
        apply: "build",
        transformIndexHtml: {
            order: "post",
            handler(_html, context) {
                const wanted = [/^assets\/barlow-latin-400-normal-[\w-]+\.woff2$/, /^assets\/barlow-semi-condensed-latin-700-normal-[\w-]+\.woff2$/];
                return Object.keys(context.bundle ?? {})
                    .filter((file) => wanted.some((pattern) => pattern.test(file)))
                    .map((file) => ({
                        tag: "link",
                        attrs: { rel: "preload", as: "font", type: "font/woff2", href: `/${file}`, crossorigin: "" },
                        injectTo: "head",
                    }));
            },
        },
    };

    // The three entry routes are separate chunks, which the browser would only discover
    // after downloading and running the main bundle. This inline script starts the right
    // one (with its own imports and styles) while the main bundle is still downloading,
    // which takes one network round trip off the first paint of the page content.
    const ENTRY_ROUTES = { home: "/pages/Home.jsx", check: "/pages/CheckPage.jsx", library: "/pages/Library.jsx" };
    const preloadRouteChunk = {
        name: "check-ia:preload-route-chunk",
        apply: "build",
        transformIndexHtml: {
            order: "post",
            handler(_html, context) {
                const bundle = context.bundle ?? {};
                const chunks = Object.values(bundle).filter((file) => file.type === "chunk");
                const entryImports = new Set(chunks.filter((chunk) => chunk.isEntry).flatMap((chunk) => [chunk.fileName, ...chunk.imports]));
                const files = {};
                for (const [route, suffix] of Object.entries(ENTRY_ROUTES)) {
                    const chunk = chunks.find((candidate) => (candidate.facadeModuleId ?? "").endsWith(suffix));
                    if (!chunk) continue;
                    const scripts = [chunk.fileName, ...chunk.imports].filter((file) => !entryImports.has(file));
                    const styles = [...(chunk.viteMetadata?.importedCss ?? [])];
                    files[route] = [...scripts, ...styles].map((file) => `/${file}`);
                }
                if (Object.keys(files).length === 0) return [];
                const script =
                    `(function(){var f=${JSON.stringify(files)},p=location.pathname,` +
                    `k=p==="/"?"home":p.indexOf("/v/")===0?"check":p==="/bibliotheque"?"library":"";` +
                    `(f[k]||[]).forEach(function(h){var l=document.createElement("link");` +
                    `if(/\\.css$/.test(h)){l.rel="preload";l.as="style"}else{l.rel="modulepreload";l.crossOrigin=""}` +
                    `l.href=h;document.head.appendChild(l)})})();`;
                return [{ tag: "script", children: script, injectTo: "head-prepend" }];
            },
        },
    };

    const origin = apiOrigin(env.REACT_APP_API_URL || "http://localhost:8000/api/");

    // Service worker: precache the app shell and the hashed assets so repeat visits open
    // without the network; API calls are never cached (network only). A new deploy is
    // picked up on the next load (autoUpdate: skipWaiting + clientsClaim).
    const pwa = VitePWA({
        registerType: "autoUpdate",
        injectRegister: "script-defer",
        manifest: false, // public/manifest.json is the manifest
        workbox: {
            globPatterns: ["**/*.{js,css,html,woff2,svg,png,ico}", "manifest.json"],
            // Left out: PDFs, the auth library (loaded on demand), font subsets French text
            // does not use, logo variants only the mock API uses, and install-only icons.
            globIgnores: [
                "**/node_modules/**",
                "**/*.pdf",
                "serve.json",
                "assets/supabase-*.js",
                "assets/*-vietnamese-*",
                "assets/*-latin-ext-*",
                "brand/logo-icon*.svg",
                "apple-touch-icon.png",
                "logo*.png",
            ],
            navigateFallback: "/index.html",
            navigateFallbackDenylist: [/^\/api\//, /^\/admin\//, /^\/media\//, /\.[a-z0-9]+$/i],
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                // Same-origin /api/ (if ever proxied) and the API origin: network only.
                { urlPattern: ({ url }) => url.pathname.startsWith("/api/"), handler: "NetworkOnly" },
                ...(origin
                    ? [{ urlPattern: new RegExp(`^${escapeRegExp(origin)}/`), handler: "NetworkOnly" }]
                    : []),
            ],
        },
    });

    return {
        plugins: [react(), dropMockApi, preloadFonts, preloadRouteChunk, pwa],
        envPrefix: ["VITE_", "REACT_APP_"],
        define: {
            // Always define the flag so production builds constant-fold
            // `MOCK_API` to false and drop the mock API from the bundle.
            "import.meta.env.VITE_MOCK_API": JSON.stringify(env.VITE_MOCK_API ?? ""),
        },
        server: {
            // The backend's default CORS origin is http://localhost:3000.
            port: 3000,
        },
        build: {
            outDir: "build",
            emptyOutDir: true,
            sourcemap: false,
            rolldownOptions: {
                output: {
                    // Name the lazily loaded auth library's chunk so the service worker can
                    // leave it out of the precache (signed-out visitors never need it).
                    chunkFileNames: (chunk) =>
                        chunk.moduleIds?.some((id) => /node_modules[\\/]@supabase[\\/]/.test(id))
                            ? "assets/supabase-[hash].js"
                            : "assets/[name]-[hash].js",
                },
            },
        },
        test: {
            environment: "jsdom",
            globals: true,
            setupFiles: ["./src/test/setup.js"],
            css: { modules: { classNameStrategy: "non-scoped" } },
            coverage: {
                provider: "v8",
                include: ["src/**/*.{js,jsx}"],
                exclude: ["src/**/*.test.{js,jsx}", "src/test/**"],
                reporter: ["text", "lcov"],
                thresholds: { lines: 80, statements: 80 },
            },
        },
    };
});
