import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Library from "./components/Library";
import SubmitFact from "./components/SubmitFact";
import ImageContentVerification from "./components/ImageContentVerification";
import AIImageDetection from "./components/AIImageDetection";
import Login from "./components/Login";
import Register from "./components/Register";
import PrivateRoute from "./utils/PrivateRoute";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Terms from "./components/Terms";
import Privacy from "./components/Privacy";
import { AuthProvider } from "./utils/AuthContext";

function App() {
    return (
        <Router>
            <AuthProvider>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: "100vh",
                    }}
                >
                    <Navigation />
                    <div sx={{ marginTop: 4, flexGrow: 1 }}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/library" element={<Library />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/privacy" element={<Privacy />} />
                            <Route
                                path="/submit"
                                element={
                                    <PrivateRoute>
                                        <SubmitFact />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/verify-image"
                                element={
                                    <PrivateRoute>
                                        <ImageContentVerification />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/detect-ai-image"
                                element={
                                    <PrivateRoute>
                                        <AIImageDetection />
                                    </PrivateRoute>
                                }
                            />
                        </Routes>
                    </div>
                    <Footer />
                </div>
            </AuthProvider>
        </Router>
    );
}

export default App;
