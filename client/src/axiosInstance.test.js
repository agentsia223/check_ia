jest.mock("./lib/supabase", () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
            refreshSession: jest.fn(),
            signOut: jest.fn(),
        },
    },
}));

const axiosInstance = require("./axiosInstance").default;
const { supabase } = require("./lib/supabase");

beforeEach(() => {
    jest.clearAllMocks();
});

test("request interceptor attaches the current Supabase access token", async () => {
    supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "request-token" } },
    });

    const requestInterceptor = axiosInstance.interceptors.request.handlers[0].fulfilled;
    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer request-token");
});

test("response interceptor refreshes an expired token and retries the request", async () => {
    supabase.auth.refreshSession.mockResolvedValue({
        data: { session: { access_token: "refreshed-token" } },
        error: null,
    });
    const requestSpy = jest.spyOn(axiosInstance, "request").mockResolvedValue({ data: "retried" });

    const responseErrorInterceptor = axiosInstance.interceptors.response.handlers[0].rejected;
    const originalConfig = { headers: {} };
    await responseErrorInterceptor({
        response: { status: 401 },
        config: originalConfig,
    });

    expect(originalConfig.headers.Authorization).toBe("Bearer refreshed-token");
    expect(requestSpy).toHaveBeenCalledWith(originalConfig);
});

test("response interceptor signs out when token refresh fails", async () => {
    delete window.location;
    window.location = { href: "" };
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    supabase.auth.refreshSession.mockResolvedValue({
        data: {},
        error: new Error("refresh failed"),
    });

    const responseErrorInterceptor = axiosInstance.interceptors.response.handlers[0].rejected;
    await responseErrorInterceptor({
        response: { status: 401 },
        config: { headers: {} },
    }).catch(() => undefined);

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(window.location.href).toBe("/login");
    consoleError.mockRestore();
});
