import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/**
 * Retry network failures and 5xx twice; never retry 4xx (not found, quota, auth…).
 * @param {number} failureCount @param {unknown} error @returns {boolean}
 */
export function shouldRetry(failureCount, error) {
    if (error instanceof ApiError && error.status > 0 && error.status < 500) return false;
    return failureCount < 2;
}

/**
 * The app's QueryClient. Tests may call it to get a fresh client.
 * @param {import("@tanstack/react-query").QueryClientConfig} [overrides]
 * @returns {QueryClient}
 */
export function createQueryClient(overrides = {}) {
    return new QueryClient({
        ...overrides,
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000,
                retry: shouldRetry,
                refetchOnWindowFocus: true,
                ...overrides.defaultOptions?.queries,
            },
            mutations: {
                retry: false,
                ...overrides.defaultOptions?.mutations,
            },
        },
    });
}
