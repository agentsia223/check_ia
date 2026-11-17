import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import { AuthContext } from "./AuthContext";

function LoginProbe() {
    const location = useLocation();
    return <p>Connexion depuis {location.state?.from?.pathname}</p>;
}

const renderAt = (value) =>
    render(
        <AuthContext.Provider value={value}>
            <MemoryRouter initialEntries={["/mes-verifications?page=2"]}>
                <Routes>
                    <Route path="/connexion" element={<LoginProbe />} />
                    <Route
                        path="/mes-verifications"
                        element={
                            <RequireAuth>
                                <p>Historique privé</p>
                            </RequireAuth>
                        }
                    />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

test("renders children when signed in", () => {
    renderAt({ isLoggedIn: true, loading: false });
    expect(screen.getByText("Historique privé")).toBeInTheDocument();
});

test("redirects guests to /connexion with the origin location", () => {
    renderAt({ isLoggedIn: false, loading: false });
    expect(screen.queryByText("Historique privé")).not.toBeInTheDocument();
    expect(screen.getByText("Connexion depuis /mes-verifications")).toBeInTheDocument();
});

test("waits for the session before deciding", () => {
    renderAt({ isLoggedIn: false, loading: true });
    expect(screen.getByRole("status")).toHaveTextContent(/chargement/i);
    expect(screen.queryByText(/connexion depuis/i)).not.toBeInTheDocument();
});
