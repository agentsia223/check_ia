import React from "react";

/**
 * CHECK-IA brand logo.
 *
 * variant: "full" (shield + wordmark) | "icon" (shield mark only)
 * white:   use the reversed (white) variant for navy surfaces
 */
function Logo({ variant = "full", white = false, height = 34, alt = "Check-IA", style, ...rest }) {
    const base = variant === "icon" ? "logo-icon" : "logo-full";
    const file = `${process.env.PUBLIC_URL || ""}/assets/${base}${white ? "-white" : ""}.svg`;
    return (
        <img
            src={file}
            alt={alt}
            height={height}
            style={{ height, width: "auto", display: "block", ...style }}
            {...rest}
        />
    );
}

export default Logo;
