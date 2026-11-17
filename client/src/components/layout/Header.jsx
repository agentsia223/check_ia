import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import Logo from "./Logo";
import styles from "./Header.module.css";

const MAIN_LINKS = [
    { to: "/", label: "Vérifier", end: true },
    { to: "/bibliotheque", label: "Bibliothèque" },
    { to: "/fiabilite", label: "Fiabilité" },
];

const linkClass = ({ isActive }) => [styles.link, isActive ? styles.active : ""].filter(Boolean).join(" ");

/** Close a disclosure on Escape or a click outside `ref`. */
function useDismiss(open, setOpen, ref, buttonRef) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        const onPointer = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onPointer);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onPointer);
        };
    }, [open, setOpen, ref, buttonRef]);
}

/**
 * Site header: logo, main links, "Mes vérifications", and "Connexion" or the account menu.
 * On narrow screens the links collapse into a labelled menu button. No props.
 */
export default function Header() {
    const { user, isLoggedIn, loading, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [accountOpen, setAccountOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const accountRef = useRef(null);
    const accountButtonRef = useRef(null);
    const menuRef = useRef(null);
    const menuButtonRef = useRef(null);
    const accountPanelId = useId();
    const menuPanelId = useId();

    useDismiss(accountOpen, setAccountOpen, accountRef, accountButtonRef);
    useDismiss(menuOpen, setMenuOpen, menuRef, menuButtonRef);

    useEffect(() => {
        setAccountOpen(false);
        setMenuOpen(false);
    }, [location.pathname]);

    const email = user?.email ?? "";

    const handleSignOut = async () => {
        setAccountOpen(false);
        setMenuOpen(false);
        await signOut();
        navigate("/");
    };

    return (
        <header className={styles.header}>
            <a className={styles.skip} href="#contenu">
                Aller au contenu
            </a>
            <div className={styles.inner}>
                <div className={styles.brand}>
                    <Link to="/" className={styles.logoLink} aria-label="Check-IA, accueil">
                        <Logo alt="" />
                    </Link>
                    <span className={styles.beta}>Bêta</span>
                </div>

                <nav className={styles.primary} aria-label="Navigation principale">
                    {MAIN_LINKS.map((link) => (
                        <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.right}>
                    <NavLink to="/mes-verifications" className={linkClass}>
                        Mes vérifications
                    </NavLink>
                    {!loading && !isLoggedIn && (
                        <Button to="/connexion" variant="secondary" size="sm">
                            Connexion
                        </Button>
                    )}
                    {!loading && isLoggedIn && (
                        <div className={styles.account} ref={accountRef}>
                            <button
                                ref={accountButtonRef}
                                type="button"
                                className={styles.accountButton}
                                aria-expanded={accountOpen}
                                aria-controls={accountPanelId}
                                onClick={() => setAccountOpen((open) => !open)}
                            >
                                <Icon name="user" />
                                <span className="sr-only">Mon compte : </span>
                                <span className={styles.email}>{email}</span>
                                <Icon name="chevron-down" />
                            </button>
                            <div id={accountPanelId} className={styles.accountPanel} hidden={!accountOpen}>
                                <p className={styles.signedAs}>
                                    Connecté avec
                                    <span className={styles.panelEmail}>{email}</span>
                                </p>
                                <Button variant="ghost" size="sm" className={styles.panelAction} onClick={handleSignOut}>
                                    Se déconnecter
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.mobile} ref={menuRef}>
                    <button
                        ref={menuButtonRef}
                        type="button"
                        className={styles.menuButton}
                        aria-expanded={menuOpen}
                        aria-controls={menuPanelId}
                        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <Icon name={menuOpen ? "close" : "menu"} size={22} />
                        <span aria-hidden="true">Menu</span>
                    </button>
                    {menuOpen && (
                        <div id={menuPanelId} className={styles.mobilePanel}>
                            <nav aria-label="Navigation principale (menu)">
                                <ul role="list" className={styles.mobileList}>
                                    {[...MAIN_LINKS, { to: "/mes-verifications", label: "Mes vérifications" }].map(
                                        (link) => (
                                            <li key={link.to}>
                                                <NavLink
                                                    to={link.to}
                                                    end={link.end}
                                                    className={linkClass}
                                                    onClick={() => setMenuOpen(false)}
                                                >
                                                    {link.label}
                                                </NavLink>
                                            </li>
                                        )
                                    )}
                                </ul>
                            </nav>
                            {!loading && !isLoggedIn && (
                                <Button to="/connexion" variant="secondary" className={styles.mobileAction}>
                                    Connexion
                                </Button>
                            )}
                            {!loading && isLoggedIn && (
                                <div className={styles.mobileAccount}>
                                    <p className={styles.signedAs}>
                                        Connecté avec
                                        <span className={styles.panelEmail}>{email}</span>
                                    </p>
                                    <Button variant="secondary" className={styles.mobileAction} onClick={handleSignOut}>
                                        Se déconnecter
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
