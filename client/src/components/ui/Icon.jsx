import styles from "./Icon.module.css";

// Stroke icons on a 24×24 grid. The first eight are the mockup's symbol set.
const PATHS = {
    text: <path d="M5 6h14M5 12h14M5 18h9" />,
    img: (
        <>
            <rect x="3.5" y="5" width="17" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m4 17 5-4 4 3 3-2 4 3" />
        </>
    ),
    mic: (
        <>
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
        </>
    ),
    ok: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    out: <path d="M14 5h5v5M19 5l-8 8M11 6H6v12h12v-5" />,
    share: (
        <>
            <circle cx="6" cy="12" r="2.4" />
            <circle cx="18" cy="6" r="2.4" />
            <circle cx="18" cy="18" r="2.4" />
            <path d="m8.1 10.9 7.8-3.8M8.1 13.1l7.8 3.8" />
        </>
    ),
    quote: <path d="M9 7H5v6h4v-2c0 3-1 4-3 5M19 7h-4v6h4v-2c0 3-1 4-3 5" />,
    snd: <path d="M4 10v4h3l5 4V6l-5 4H4ZM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />,
    // Additions for the app shell, in the same style.
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    "chevron-down": <path d="m6 9 6 6 6-6" />,
    "chevron-left": <path d="m15 6-6 6 6 6" />,
    "chevron-right": <path d="m9 6 6 6-6 6" />,
    search: (
        <>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
        </>
    ),
    user: (
        <>
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" />
        </>
    ),
    info: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 11v5M12 8h.01" />
        </>
    ),
    alert: (
        <>
            <path d="M12 4 2.8 19.5h18.4L12 4Z" />
            <path d="M12 10v4.5M12 17h.01" />
        </>
    ),
    copy: (
        <>
            <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
            <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
        </>
    ),
    trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />,
    upload: <path d="M12 16V4.5M7 9.5l5-5 5 5M5 15v4.5h14V15" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
        </>
    ),
};

/** Every icon name Icon can draw. */
export const ICON_NAMES = Object.freeze(Object.keys(PATHS));

/**
 * Inline SVG icon (18 px, currentColor stroke).
 * @param {{name: string, label?: string, size?: number, className?: string}} props
 *   `name` is one of ICON_NAMES (mockup set: text, img, mic, ok, out, share, quote, snd).
 *   Decorative (aria-hidden) unless `label` is given. Unknown names render nothing.
 */
export default function Icon({ name, label, size = 18, className }) {
    const shape = PATHS[name];
    if (!shape) return null;
    const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": "true" };
    return (
        <svg
            className={[styles.icon, className].filter(Boolean).join(" ")}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            focusable="false"
            {...a11y}
        >
            {shape}
        </svg>
    );
}
