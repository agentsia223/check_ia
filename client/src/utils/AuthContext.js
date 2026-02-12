import React, { createContext, useState, useEffect } from "react";
import { supabase, getCurrentSession } from "../lib/supabase";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            try {
                const { session } = await getCurrentSession();
                setSession(session);
                if (session?.user) {
                    setUser(session.user);
                }
            } catch (error) {
                console.error("Error getting initial session:", error);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                // Auth state changed
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, error: error.message };
        }
    };

    const register = async (email, password, options = {}) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options,
            });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error("Registration error:", error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        }
    };

    const getAccessToken = () => {
        return session?.access_token || null;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                login,
                register,
                logout,
                isLoggedIn: !!user,
                getAccessToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
