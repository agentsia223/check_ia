import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Renders `children` for signed-in users; otherwise redirects to /connexion with
 * `state.from` set to the current location so sign-in can return there.
 * @param {{children: React.ReactNode}} props
 */
export default function RequireAuth({ children }) {
    const { isLoggedIn, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <p role="status" className="sr-only">
                Chargement…
            </p>
        );
    }
    if (!isLoggedIn) {
        return <Navigate to="/connexion" state={{ from: location }} replace />;
    }
    return children;
}
