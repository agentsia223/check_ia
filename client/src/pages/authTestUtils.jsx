import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthContext } from "../auth/AuthContext";

function Where() {
    const l = useLocation();
    return <p data-testid="where">{l.pathname}</p>;
}

/** Renders `ui` at `path` with a mocked auth context and a probe route for "/" and others. */
export function renderAuth(ui, { path = "/", state, auth = {} } = {}) {
    const value = {
        user: null,
        isLoggedIn: false,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        sendPasswordReset: vi.fn(),
        updatePassword: vi.fn(),
        getAccessToken: vi.fn(),
        ...auth,
    };
    const entry = { pathname: path, state };
    render(
        <AuthContext.Provider value={value}>
            <MemoryRouter initialEntries={[entry]}>
                <Routes>
                    <Route path={path} element={ui} />
                    <Route path="*" element={<Where />} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );
    return value;
}
