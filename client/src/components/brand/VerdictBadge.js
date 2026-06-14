import React from "react";

/**
 * Fact-check outcome badge: Vrai / Faux / Trompeur / Non vérifié.
 * Always pairs a color WITH a glyph (never color alone — accessibility).
 */
const VERDICTS = {
    true: { label: "Vrai", fg: "var(--verdict-true-fg)", bg: "var(--verdict-true-bg)", border: "var(--verdict-true-border)", solid: "var(--verdict-true-solid)" },
    false: { label: "Faux", fg: "var(--verdict-false-fg)", bg: "var(--verdict-false-bg)", border: "var(--verdict-false-border)", solid: "var(--verdict-false-solid)" },
    misleading: { label: "Trompeur", fg: "var(--verdict-misleading-fg)", bg: "var(--verdict-misleading-bg)", border: "var(--verdict-misleading-border)", solid: "var(--verdict-misleading-solid)" },
    unverified: { label: "Non vérifié", fg: "var(--verdict-unverified-fg)", bg: "var(--verdict-unverified-bg)", border: "var(--verdict-unverified-border)", solid: "var(--verdict-unverified-solid)" },
};

const SIZES = {
    sm: { h: 26, pad: "0 10px", font: "0.8125rem", icon: 13 },
    md: { h: 34, pad: "0 14px", font: "0.9375rem", icon: 16 },
    lg: { h: 46, pad: "0 20px", font: "1.25rem", icon: 22 },
};

function Glyph({ verdict, size }) {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" };
    if (verdict === "true") return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
    if (verdict === "false") return <svg {...common}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    if (verdict === "misleading") return <svg {...common}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>;
}

function VerdictBadge({ verdict = "unverified", variant = "soft", size = "md", label, style }) {
    const v = VERDICTS[verdict] || VERDICTS.unverified;
    const s = SIZES[size] || SIZES.md;
    const solid = variant === "solid";
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: size === "lg" ? 9 : 6,
            height: s.h, padding: s.pad, borderRadius: "var(--radius-pill)",
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: s.font,
            letterSpacing: "0.01em", whiteSpace: "nowrap",
            color: solid ? "#fff" : v.fg,
            background: solid ? v.solid : v.bg,
            border: `1.5px solid ${solid ? v.solid : v.border}`,
            ...style,
        }}>
            <Glyph verdict={verdict} size={s.icon} />
            {label || v.label}
        </span>
    );
}

export default VerdictBadge;
