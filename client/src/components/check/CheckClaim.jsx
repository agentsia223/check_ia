import { useState } from "react";
import styles from "./CheckClaim.module.css";

/**
 * The checked claim, quoted, with the submitted image above it when there is one.
 * An image that fails to load (expired or removed link) is hidden, not shown broken.
 * Private to the check page views.
 * @param {{check: import("../../lib/checks").Check}} props
 */
export default function CheckClaim({ check }) {
    const claim = (check.claim || "").trim();
    // Remember which URL failed, so a renewed image_url is tried again.
    const [failedUrl, setFailedUrl] = useState(null);
    const imageUrl = check.image_url && check.image_url !== failedUrl ? check.image_url : "";
    return (
        <div className={styles.wrap}>
            {imageUrl && (
                <img
                    className={styles.image}
                    src={imageUrl}
                    alt="Image envoyée pour la vérification"
                    loading="eager"
                    decoding="async"
                    onError={() => setFailedUrl(imageUrl)}
                />
            )}
            {claim ? (
                <blockquote className={styles.claim}>
                    <p>« {claim} »</p>
                </blockquote>
            ) : (
                !imageUrl && <p className={styles.empty}>Vérification sans texte</p>
            )}
        </div>
    );
}
