import { createQueryClient, shouldRetry } from "./queryClient";
import { ApiError } from "./api";

test("4xx errors are not retried; network and 5xx are retried twice", () => {
    expect(shouldRetry(0, new ApiError(404, "not_found"))).toBe(false);
    expect(shouldRetry(0, new ApiError(403, "anon_quota"))).toBe(false);
    expect(shouldRetry(0, new ApiError(0, "network"))).toBe(true);
    expect(shouldRetry(1, new ApiError(502, "server"))).toBe(true);
    expect(shouldRetry(2, new ApiError(502, "server"))).toBe(false);
    expect(shouldRetry(0, new Error("x"))).toBe(true);
});

test("creates a client with the app defaults and accepts overrides", () => {
    const client = createQueryClient({ defaultOptions: { queries: { retry: false } } });
    const defaults = client.getDefaultOptions();
    expect(defaults.queries.retry).toBe(false);
    expect(defaults.queries.staleTime).toBe(30000);
    expect(defaults.mutations.retry).toBe(false);
    expect(createQueryClient().getDefaultOptions().queries.retry).toBe(shouldRetry);
});
