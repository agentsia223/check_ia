import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Button from "./components/ui/Button";
import { createQueryClient } from "./lib/queryClient";
import styles from "./App.module.css";

const Home = lazy(() => import("./pages/Home.jsx"));
const CheckPage = lazy(() => import("./pages/CheckPage.jsx"));
const Library = lazy(() => import("./pages/Library.jsx"));
const History = lazy(() => import("./pages/History.jsx"));
const Fiabilite = lazy(() => import("./pages/Fiabilite.jsx"));
const Reliability = lazy(() => import("./pages/Reliability.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Terms = lazy(() => import("./pages/Terms.jsx"));
const Privacy = lazy(() => import("./pages/Privacy.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

/** Old paths and where they now live. */
export const REDIRECTS = Object.freeze({
    "/library": "/bibliotheque",
    "/login": "/connexion",
    "/register": "/inscription",
    "/submit": "/",
    "/verify-image": "/?mode=image",
    "/detect-ai-image": "/?mode=image",
    "/terms": "/conditions",
    "/privacy": "/confidentialite",
});

/**
 * On every new pathname (not the first render, not hash or query changes): move focus
 * to <main> so keyboard and screen-reader users start at the new page, and scroll to
 * the top for PUSH/REPLACE. Back/forward (POP) keeps the browser's scroll restoration.
 */
function useRouteChangeFocus(mainRef) {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();
    const previousPathname = useRef(pathname);

    useEffect(() => {
        if (previousPathname.current === pathname) return; // first render (and StrictMode re-run)
        previousPathname.current = pathname;
        if (navigationType !== "POP") window.scrollTo(0, 0);
        mainRef.current?.focus({ preventScroll: true });
        // Only pathname changes count; navigationType is read for that change.
    }, [pathname]);
}

function PageLoading() {
    return (
        <div className={styles.loading} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            Chargement…
        </div>
    );
}

/** Catches a page that fails to load (e.g. a stale chunk after a deploy). */
class PageErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className={styles.error} role="alert">
                <h1>Cette page n'a pas pu s'afficher</h1>
                <p>Rechargez la page. Si le problème continue, revenez dans quelques minutes.</p>
                <Button onClick={() => window.location.reload()}>Recharger la page</Button>
            </div>
        );
    }
}

function Layout() {
    const { pathname } = useLocation();
    const mainRef = useRef(null);
    useRouteChangeFocus(mainRef);
    return (
        <div className={styles.shell}>
            <Header />
            <main id="contenu" ref={mainRef} tabIndex={-1} className={styles.main}>
                <PageErrorBoundary key={pathname}>
                    <Suspense fallback={<PageLoading />}>
                        <Outlet />
                    </Suspense>
                </PageErrorBoundary>
            </main>
            <Footer />
        </div>
    );
}

/** The route table (spec section 5), inside the header/footer frame. Needs a Router above it. */
export function AppRoutes() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="v/:id" element={<CheckPage />} />
                <Route path="bibliotheque" element={<Library />} />
                <Route
                    path="mes-verifications"
                    element={
                        <RequireAuth>
                            <History />
                        </RequireAuth>
                    }
                />
                <Route path="fiabilite" element={<Fiabilite />} />
                <Route path="reliability" element={<Reliability />} />
                <Route path="connexion" element={<Login />} />
                <Route path="inscription" element={<Register />} />
                <Route path="mot-de-passe-oublie" element={<ForgotPassword />} />
                <Route path="reinitialiser" element={<ResetPassword />} />
                <Route path="conditions" element={<Terms />} />
                <Route path="confidentialite" element={<Privacy />} />
                {Object.entries(REDIRECTS).map(([from, to]) => (
                    <Route key={from} path={from} element={<Navigate to={to} replace />} />
                ))}
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    );
}

/**
 * The app: query client, auth, focus/scroll handling on navigation, and routes. Render inside a Router
 * (BrowserRouter in main.jsx, MemoryRouter in tests).
 * @param {{queryClient?: import("@tanstack/react-query").QueryClient}} props optional client for tests.
 */
export default function App({ queryClient }) {
    const [client] = useState(() => queryClient ?? createQueryClient());
    return (
        <QueryClientProvider client={client}>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </QueryClientProvider>
    );
}
