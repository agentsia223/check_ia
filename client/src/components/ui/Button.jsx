import { forwardRef } from "react";
import { Link } from "react-router-dom";
import styles from "./Button.module.css";

/**
 * Button or router link styled as a button.
 * @param {{variant?: "primary"|"secondary"|"ghost", size?: "md"|"sm", to?: string,
 *   loading?: boolean, className?: string, type?: string, children: React.ReactNode}} props
 *   `to` renders a react-router <Link>; `loading` disables the button and sets aria-busy.
 *   Every other prop is passed to the element.
 */
const Button = forwardRef(function Button(
    { variant = "primary", size = "md", to, loading = false, className, type = "button", disabled, children, ...rest },
    ref
) {
    const classes = [styles.button, styles[variant], styles[size], loading ? styles.loading : "", className]
        .filter(Boolean)
        .join(" ");

    if (to) {
        return (
            <Link ref={ref} to={to} className={classes} {...rest}>
                {children}
            </Link>
        );
    }

    return (
        <button
            ref={ref}
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading && <span className={styles.spinner} aria-hidden="true" />}
            {children}
        </button>
    );
});

export default Button;
