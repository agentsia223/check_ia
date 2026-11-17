import { forwardRef, useId } from "react";
import styles from "./TextMode.module.css";

/** Text checks accept up to this many characters (spec 5.2; the server enforces the same). */
export const TEXT_MAX_CHARS = 1000;

/** 1000 -> "1 000" (no-break space), the French way. */
export const formatCount = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");

/**
 * The claim textarea of the composer, with a live character counter. Controlled.
 * The label is visually hidden by default (the composer card is the visual frame);
 * pass `visibleLabel` to show it (voice mode).
 * @param {{value: string, onChange: (value: string) => void, label?: string,
 *   visibleLabel?: boolean, hint?: React.ReactNode, placeholder?: string, id?: string,
 *   readOnly?: boolean}} props the ref goes to the <textarea>.
 */
const TextMode = forwardRef(function TextMode(
    {
        value,
        onChange,
        label = "Affirmation à vérifier",
        visibleLabel = false,
        hint,
        placeholder = "Collez une affirmation ou un message reçu",
        id,
        readOnly = false,
    },
    ref
) {
    const autoId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const inputId = id || `claim${autoId}`;
    const counterId = `${inputId}-count`;
    const hintId = hint ? `${inputId}-hint` : null;
    const errorId = `${inputId}-error`;
    const tooLong = value.length > TEXT_MAX_CHARS;
    const describedBy = [hintId, counterId, tooLong ? errorId : null].filter(Boolean).join(" ");

    return (
        <div className={styles.wrap}>
            <label htmlFor={inputId} className={visibleLabel ? styles.label : "sr-only"}>
                {label}
            </label>
            {hint && (
                <p id={hintId} className={styles.hint}>
                    {hint}
                </p>
            )}
            <textarea
                ref={ref}
                id={inputId}
                className={[styles.textarea, visibleLabel ? styles.boxed : ""].filter(Boolean).join(" ")}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                maxLength={TEXT_MAX_CHARS}
                rows={4}
                autoComplete="off"
                readOnly={readOnly}
                aria-describedby={describedBy}
                aria-invalid={tooLong || undefined}
            />
            <div className={styles.footer}>
                {tooLong && (
                    <p id={errorId} className={styles.error}>
                        Le texte dépasse {formatCount(TEXT_MAX_CHARS)} caractères. Raccourcissez-le avant de
                        vérifier.
                    </p>
                )}
                <p id={counterId} className={[styles.counter, tooLong ? styles.over : ""].filter(Boolean).join(" ")}>
                    {`${formatCount(value.length)} / ${formatCount(TEXT_MAX_CHARS)}`}
                </p>
            </div>
        </div>
    );
});

export default TextMode;
