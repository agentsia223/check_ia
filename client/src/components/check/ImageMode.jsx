import { forwardRef, useEffect, useId, useState } from "react";
import Icon from "../ui/Icon";
import { ACCEPTED_IMAGE_TYPES } from "../../lib/image";
import { formatCount, TEXT_MAX_CHARS } from "./TextMode";
import styles from "./ImageMode.module.css";

export const IMAGE_KINDS = Object.freeze([
    {
        value: "image_content",
        label: "Vérifier le contenu",
        hint: "Ce que montre l'image et le texte qui l'accompagne.",
    },
    {
        value: "image_ai",
        label: "Détecter une image générée par IA",
        hint: "Indique si l'image semble produite par une IA.",
    },
]);

const formatSize = (bytes) =>
    bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`
        : `${formatCount(Math.max(1, Math.round(bytes / 1024)))} Ko`;

/** Object URL for a File, revoked when the file changes or the component unmounts. */
function usePreviewUrl(file) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!file || typeof URL.createObjectURL !== "function") {
            setUrl(null);
            return undefined;
        }
        const next = URL.createObjectURL(file);
        setUrl(next);
        return () => URL.revokeObjectURL?.(next);
    }, [file]);
    return url;
}

/**
 * Image mode of the composer. Controlled: the composer holds the file, so paste and drop
 * anywhere on the card can fill it. Paste and drop are handled by the composer.
 * @param {{file: File|null, error: string, kind: "image_content"|"image_ai",
 *   onKindChange: (kind: string) => void, claimText: string, onClaimChange: (v: string) => void,
 *   onSelectFile: (file: File) => void, onRemove: () => void,
 *   progress: null | {stage: "prepare"|"upload", fraction: number}, busy?: boolean}} props
 *   the ref goes to the file <input>.
 */
const ImageMode = forwardRef(function ImageMode(
    { file, error, kind, onKindChange, claimText, onClaimChange, onSelectFile, onRemove, progress, busy = false },
    ref
) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const inputId = `image${uid}`;
    const errorId = `${inputId}-error`;
    const claimId = `${inputId}-claim`;
    const kindName = `${inputId}-kind`;
    const previewUrl = usePreviewUrl(file);

    const onPick = (event) => {
        const picked = event.target.files?.[0];
        // Reset so picking the same file again still fires a change.
        event.target.value = "";
        if (picked) onSelectFile(picked);
    };

    const percent = progress ? Math.round(progress.fraction * 100) : 0;

    return (
        <div className={styles.mode}>
            <input
                ref={ref}
                id={inputId}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className={["sr-only", styles.fileInput].join(" ")}
                aria-label="Choisir l'image à vérifier"
                onChange={onPick}
                disabled={busy}
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? true : undefined}
            />

            {file && !error ? (
                <div className={styles.preview}>
                    {previewUrl && (
                        <img src={previewUrl} alt="Aperçu de l'image choisie" className={styles.thumb} />
                    )}
                    <div className={styles.fileMeta}>
                        <p className={styles.fileName}>{file.name}</p>
                        <p className={styles.fileSize}>{formatSize(file.size)}</p>
                        <div className={styles.fileActions}>
                            <label htmlFor={inputId} className={[styles.linkButton, styles.change].join(" ")}>
                                Changer d'image
                            </label>
                            <button type="button" className={styles.linkButton} onClick={onRemove} disabled={busy}>
                                Retirer l'image
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.drop}>
                    <Icon name="upload" size={24} className={styles.dropIcon} />
                    <p className={styles.dropText}>Déposez une image ici, collez-la, ou</p>
                    <label htmlFor={inputId} className={styles.pick}>
                        Choisir l'image à vérifier
                    </label>
                    <p className={styles.dropHint}>JPEG, PNG ou WebP, 10 Mo au plus.</p>
                </div>
            )}

            {error && (
                <p id={errorId} className={styles.error} role="alert">
                    {error}
                </p>
            )}

            <div className={styles.kinds}>
                <p id={`${kindName}-legend`} className={styles.legend}>
                    Que voulez-vous vérifier ?
                </p>
                <div role="radiogroup" aria-labelledby={`${kindName}-legend`} className={styles.kindList}>
                    {IMAGE_KINDS.map((option) => (
                        <label key={option.value} className={styles.kind}>
                            <input
                                type="radio"
                                name={kindName}
                                value={option.value}
                                checked={kind === option.value}
                                onChange={() => onKindChange(option.value)}
                                disabled={busy}
                                aria-labelledby={`${kindName}-${option.value}-label`}
                                aria-describedby={`${kindName}-${option.value}`}
                                className={styles.radio}
                            />
                            <span className={styles.kindText}>
                                <span id={`${kindName}-${option.value}-label`} className={styles.kindLabel}>
                                    {option.label}
                                </span>
                                <span id={`${kindName}-${option.value}`} className={styles.kindHint}>
                                    {option.hint}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {kind === "image_content" && (
                <div className={styles.claim}>
                    <label htmlFor={claimId} className={styles.claimLabel}>
                        Texte reçu avec l'image (facultatif)
                    </label>
                    <input
                        id={claimId}
                        type="text"
                        autoComplete="off"
                        className={styles.claimInput}
                        value={claimText}
                        onChange={(event) => onClaimChange(event.target.value)}
                        maxLength={TEXT_MAX_CHARS}
                        placeholder="Par exemple, la légende du message reçu"
                        disabled={busy}
                    />
                </div>
            )}

            {progress && (
                <div className={styles.progress}>
                    <div
                        role="progressbar"
                        aria-label="Envoi de l'image"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress.stage === "upload" ? percent : undefined}
                        aria-valuetext={progress.stage === "prepare" ? "Préparation de l'image" : `${percent} %`}
                        className={styles.meter}
                    >
                        <span className={styles.meterFill} style={{ width: `${progress.stage === "upload" ? percent : 0}%` }} />
                    </div>
                    <p className={styles.progressText} aria-hidden="true">
                        {progress.stage === "prepare" ? "Préparation de l'image…" : `Envoi de l'image… ${percent}\u00a0%`}
                    </p>
                </div>
            )}
        </div>
    );
});

export default ImageMode;
