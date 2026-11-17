import styles from "./Logo.module.css";

/**
 * Check-IA logo (shield + wordmark). The SVG file has a square canvas with the
 * artwork in a horizontal band, so a wrapper crops it to that band.
 * @param {{white?: boolean, alt?: string, className?: string}} props
 *   `white` uses the reversed artwork for navy surfaces. `alt=""` makes it decorative.
 */
export default function Logo({ white = false, alt = "Check-IA", className }) {
    const src = `/assets/logo-full${white ? "-white" : ""}.svg`;
    return (
        <span className={[styles.crop, className].filter(Boolean).join(" ")}>
            <img className={styles.image} src={src} alt={alt} width="128" height="128" decoding="async" />
        </span>
    );
}
