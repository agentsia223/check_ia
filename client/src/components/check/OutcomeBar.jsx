import styles from "./OutcomeBar.module.css";

/**
 * Outcome bar (reliability split). Segments are sized by flex weight, so widths are
 * proportional to the values. The bar is one labelled image for assistive tech; give
 * it a text equivalent nearby (a list or legend).
 * @param {{segments: {key: string, value: number, color: string, label?: string}[],
 *   ariaLabel: string, size?: "lg"|"sm"}} props `color` is a CSS value built from tokens,
 *   e.g. "var(--green-700)". "lg" (44 px) prints labels inside; "sm" (16 px, mockup's
 *   home band) does not.
 */
export default function OutcomeBar({ segments, ariaLabel, size = "lg" }) {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
    // A label that cannot fit in its segment would be clipped; the text equivalent has it.
    const showLabel = (segment) => size === "lg" && segment.value / total >= 0.08;
    return (
        <div role="img" aria-label={ariaLabel} className={[styles.bar, styles[size]].join(" ")}>
            {segments.map((segment) => (
                <span
                    key={segment.key}
                    data-segment={segment.key}
                    aria-hidden="true"
                    className={styles.segment}
                    style={{ flexGrow: segment.value, background: segment.color }}
                >
                    {showLabel(segment) ? segment.label : null}
                </span>
            ))}
        </div>
    );
}
