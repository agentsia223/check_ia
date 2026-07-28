import React from "react";
import { Box } from "@mui/material";

/**
 * Three-segment outcome bar. Segments are plain divs sized by flex weight, so the
 * widths are proportional to the percentages. The bar is exposed to assistive tech
 * as a single labelled image; the bullet list beside it is the text equivalent.
 */
function OutcomeBar({ segments, ariaLabel }) {
    return (
        <Box
            role="img"
            aria-label={ariaLabel}
            sx={{
                display: "flex",
                width: "100%",
                height: 44,
                my: 3,
                borderRadius: 1,
                overflow: "hidden",
            }}
        >
            {segments.map((segment) => (
                <Box
                    key={segment.key}
                    aria-hidden
                    sx={{
                        flexGrow: segment.value,
                        flexBasis: 0,
                        minWidth: 0,
                        bgcolor: segment.color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                    }}
                >
                    {segment.label}
                </Box>
            ))}
        </Box>
    );
}

export default OutcomeBar;
