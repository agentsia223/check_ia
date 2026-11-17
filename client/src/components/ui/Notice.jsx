import Icon from "./Icon";
import styles from "./Notice.module.css";

const ICONS = { info: "info", warning: "alert", error: "alert" };

/**
 * Inline message. Errors use role="alert"; info and warning use role="status".
 * @param {{tone?: "info"|"error"|"warning", title?: React.ReactNode, className?: string,
 *   children: React.ReactNode}} props extra props go on the root <div>.
 */
export default function Notice({ tone = "info", title, className, children, ...rest }) {
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={[styles.notice, styles[tone], className].filter(Boolean).join(" ")}
            {...rest}
        >
            <Icon name={ICONS[tone] ?? "info"} className={styles.icon} />
            <div className={styles.body}>
                {title && <p className={styles.title}>{title}</p>}
                {children}
            </div>
        </div>
    );
}
