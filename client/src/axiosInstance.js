// src/axiosInstance.js
import axios from "axios";
import { supabase } from "./lib/supabase";

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api/",
});

// Add a request interceptor to include the Supabase token
axiosInstance.interceptors.request.use(
    async (config) => {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session?.access_token) {
                config.headers.Authorization = `Bearer ${session.access_token}`;
            }
        } catch (error) {
            console.error("Error getting session for axios:", error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token might be expired, try to refresh
            try {
                const { data, error: refreshError } =
                    await supabase.auth.refreshSession();
                if (refreshError) throw refreshError;

                // Retry the original request with the new token
                if (data.session?.access_token) {
                    error.config.headers.Authorization = `Bearer ${data.session.access_token}`;
                    return axiosInstance.request(error.config);
                }
            } catch (refreshError) {
                // Refresh failed, redirect to login
                console.error("Token refresh failed:", refreshError);
                await supabase.auth.signOut();
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
