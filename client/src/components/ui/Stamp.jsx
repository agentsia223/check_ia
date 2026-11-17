import { forwardRef, useId } from "react";
import { verdictInfo } from "../../lib/verdict";
import styles from "./Stamp.module.css";

/**
 * Verdict stamp. The word is real text; colour is never the only signal.
 * @param {{verdict: string|null, size?: "lg"|"sm", animate?: boolean, className?: string}} props
 *   `animate` plays a one-off "stamped" entrance (skipped with reduced motion).
 *   Extra props (id, tabIndex, aria-*) go on the root <span>; the ref too.
 * @returns {JSX.Element|null} null when verdictInfo(verdict) is null.
 */
/** When the label wraps, keep a final one- or two-letter word ("IA") on the previous word's line. */
const keepShortWordWithPrevious = (label) => label.replace(/ (\S{1,2})$/, "\u00a0$1");

const Stamp = forwardRef(function Stamp({ verdict, size = "lg", animate = false, className, ...rest }, ref) {
    const filterId = `ink${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const info = verdictInfo(verdict);
    if (!info) return null;

    const classes = [styles.stamp, styles[size], styles[info.tone], animate ? styles.animate : "", className]
        .filter(Boolean)
        .join(" ");

    return (
        <span ref={ref} className={classes} data-tone={info.tone} {...rest}>
            {size === "lg" && (
                <svg className={styles.defs} aria-hidden="true" focusable="false" width="0" height="0">
                    <filter id={filterId} x="-5%" y="-10%" width="110%" height="120%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
                        <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
                    </filter>
                </svg>
            )}
            <span className={styles.word} style={size === "lg" ? { filter: `url(#${filterId})` } : undefined}>
                {keepShortWordWithPrevious(info.label)}
            </span>
        </span>
    );
});

export default Stamp;
