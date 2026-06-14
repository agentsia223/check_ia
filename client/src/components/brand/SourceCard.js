import React from "react";

/**
 * A cited evidence source backing a verdict.
 * reliability: "fiable" | "à confirmer" | "contestée"
 */
function SourceCard({ name, domain, snippet, date, url, rank, reliability = "fiable", style }) {
    const [hover, setHover] = React.useState(false);
    const initial = (name || domain || "?").trim().charAt(0).toUpperCase();
    const relTones = {
        fiable: { fg: "var(--green-700)", bg: "var(--green-50)" },
        "à confirmer": { fg: "var(--amber-700)", bg: "var(--amber-50)" },
        contestée: { fg: "var(--red-700)", bg: "var(--red-50)" },
    };
    const rel = relTones[reliability] || relTones.fiable;
    return (
        <a
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: "flex", gap: 14, padding: "16px", textDecoration: "none",
                background: "var(--surface-card)", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-xs)",
                transform: hover ? "translateY(-1px)" : "none",
                transition: "box-shadow var(--duration-base), transform var(--duration-base)",
                ...style,
            }}
        >
            <div style={{
                width: 44, height: 44, flexShrink: 0, borderRadius: "var(--radius-sm)",
                background: "var(--navy-600)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem",
                position: "relative",
            }}>
                {initial}
                {rank != null && (
                    <span style={{
                        position: "absolute", top: -7, left: -7, width: 20, height: 20,
                        borderRadius: "50%", background: "var(--green-500)", color: "#fff",
                        fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid var(--surface-card)",
                    }}>{rank}</span>
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "1.0625rem", color: "var(--text-strong)" }}>{name}</span>
                    {reliability && (
                        <span style={{
                            fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
                            padding: "1px 8px", borderRadius: "var(--radius-pill)",
                            color: rel.fg, background: rel.bg,
                        }}>{reliability}</span>
                    )}
                </div>
                {snippet && (
                    <p style={{ margin: "0 0 8px", fontFamily: "var(--font-body)", fontSize: "0.9375rem", lineHeight: 1.5, color: "var(--text-body)" }}>{snippet}</p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
                    {domain && <span style={{ color: "var(--navy-600)" }}>{domain}</span>}
                    {date && <><span>·</span><span>{date}</span></>}
                </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M7 17 17 7M8 7h9v9" />
            </svg>
        </a>
    );
}

export default SourceCard;
