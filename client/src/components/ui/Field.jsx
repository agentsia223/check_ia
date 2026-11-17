import { forwardRef, useId } from "react";
import styles from "./Field.module.css";

/**
 * Labelled text input (or textarea) with hint and error wired to aria-describedby.
 * @param {{label: React.ReactNode, error?: React.ReactNode, hint?: React.ReactNode, id?: string,
 *   multiline?: boolean, trailing?: React.ReactNode, className?: string}} props
 *   `multiline` renders a <textarea>; `trailing` is placed inside the control's right edge
 *   (e.g. a labelled show-password button). Other props (type, autoComplete, value,
 *   onChange, required…) go on the input; the ref too.
 */
const Field = forwardRef(function Field(
    { label, error, hint, id, multiline = false, trailing, className, ...inputProps },
    ref
) {
    const autoId = useId();
    const inputId = id || `field${autoId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const hintId = hint ? `${inputId}-hint` : null;
    const errorId = error ? `${inputId}-error` : null;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
    const Control = multiline ? "textarea" : "input";

    return (
        <div className={[styles.field, className].filter(Boolean).join(" ")}>
            <label className={styles.label} htmlFor={inputId}>
                {label}
            </label>
            <div className={[styles.control, trailing ? styles.withTrailing : ""].filter(Boolean).join(" ")}>
                <Control
                    ref={ref}
                    id={inputId}
                    className={[styles.input, error ? styles.invalid : ""].filter(Boolean).join(" ")}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    {...inputProps}
                />
                {trailing && <div className={styles.trailing}>{trailing}</div>}
            </div>
            {hint && (
                <p id={hintId} className={styles.hint}>
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className={styles.error}>
                    {error}
                </p>
            )}
        </div>
    );
});

export default Field;
