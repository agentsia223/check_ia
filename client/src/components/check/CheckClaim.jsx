import styles from "./CheckClaim.module.css";

/**
 * The checked claim, quoted, with the submitted image above it when there is one.
 * Private to the check page views.
 * @param {{check: import("../../lib/checks").Check}} props
 */
export default function CheckClaim({ check }) {
    const claim = (check.claim || "").trim();
    return (
        <div className={styles.wrap}>
            {check.image_url && (
                <img
                    className={styles.image}
                    src={check.image_url}
                    alt="Image envoyée pour la vérification"
                    loading="eager"
                    decoding="async"
                />
            )}
            {claim ? (
                <blockquote className={styles.claim}>
                    <p>« {claim} »</p>
                </blockquote>
            ) : (
                !check.image_url && <p className={styles.empty}>Vérification sans texte</p>
            )}
        </div>
    );
}
