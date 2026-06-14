import React from "react";

/**
 * Confidence meter showing how strongly a verdict is supported.
 * verdict drives the fill color (true=green, false=red, misleading=amber, unverified=slate).
 */
function ConfidenceMeter({ value = 0, verdict = "true", label = "Niveau de confiance", showValue = true, style }) {
    const pct = Math.max(0, Math.min(100, value));
    const colors = {
        true: "var(--green-500)",
        false: "var(--red-600)",
        misleading: "var(--amber-500)",
        unverified: "var(--slate-400)",
    };
    const fill = colors[verdict] || colors.true;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-strong)" }}>{label}</span>
                {showValue && (
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.25rem", color: fill }}>{pct}%</span>
                )}
            </div>
            <div style={{ height: 10, borderRadius: "var(--radius-pill)", background: "var(--slate-200)", overflow: "hidden" }}>
                <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: "var(--radius-pill)",
                    background: fill, transition: "width var(--duration-slow) var(--ease-out)",
                }} />
            </div>
        </div>
    );
}

export default ConfidenceMeter;
