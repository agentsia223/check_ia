import { act, fireEvent, renderHook } from "@testing-library/react";
import { useVoiceDictation, MIN_RECORDING_MS, VOICE_MESSAGES } from "./useVoiceDictation";
import { apiFetch, ApiError } from "../lib/api";

vi.mock("../lib/api", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, apiFetch: vi.fn() };
});

class MockMediaRecorder {
    static instances = [];

    constructor(stream) {
        this.stream = stream;
        this.ondataavailable = null;
        this.onstop = null;
        this.onerror = null;
        MockMediaRecorder.instances.push(this);
    }

    start() {}

    stop() {
        this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: "audio/webm" }) });
        this.onstop?.();
    }
}

let now = 0;
const tracks = [];

beforeEach(() => {
    now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    MockMediaRecorder.instances = [];
    tracks.length = 0;
    Object.defineProperty(window.navigator, "mediaDevices", {
        configurable: true,
        value: {
            getUserMedia: vi.fn(() => {
                const track = { stop: vi.fn() };
                tracks.push(track);
                return Promise.resolve({ getTracks: () => [track] });
            }),
        },
    });
    window.MediaRecorder = MockMediaRecorder;
});

afterEach(() => {
    vi.restoreAllMocks();
    apiFetch.mockReset();
    delete window.MediaRecorder;
});

const setup = (overrides = {}) => {
    const props = {
        getAccessToken: () => "token",
        isLoggedIn: true,
        language: "bm",
        onText: vi.fn(),
        onNotice: vi.fn(),
        enabled: true,
        ...overrides,
    };
    const hook = renderHook((p) => useVoiceDictation(p), { initialProps: props });
    return { ...hook, props };
};

const record = async (result, durationMs) => {
    await act(async () => {
        await result.current.start();
    });
    expect(result.current.phase).toBe("recording");
    now += durationMs;
    await act(async () => {
        result.current.stop();
    });
};

test("Bambara: transcribes, translates and fills the claim without submitting", async () => {
    apiFetch
        .mockResolvedValueOnce({ text: "I ni ce" })
        .mockResolvedValueOnce({ translated_text: "Merci" });
    const { result, props } = setup();

    await record(result, 500);

    expect(props.onText).toHaveBeenCalledWith("Merci");
    expect(result.current.transcript).toBe("I ni ce");
    expect(result.current.phase).toBe("idle");
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(apiFetch.mock.calls[0][0]).toBe("bambara/transcribe/");
    const formData = apiFetch.mock.calls[0][1].formData;
    expect(formData.get("language")).toBe("bm");
    expect(formData.get("file")).toBeInstanceOf(File);
    expect(apiFetch.mock.calls[1]).toEqual([
        "bambara/translate/",
        expect.objectContaining({
            method: "POST",
            json: { text: "I ni ce", source_lang: "bm", target_lang: "fr" },
        }),
    ]);
    expect(result.current.notice).toEqual({ tone: "info", message: VOICE_MESSAGES.added });
    expect(props.onNotice).toHaveBeenCalledWith({ tone: "info", message: VOICE_MESSAGES.added });
    expect(tracks[0].stop).toHaveBeenCalled();
});

test("French skips the translation step", async () => {
    apiFetch.mockResolvedValueOnce({ text: "La terre est ronde" });
    const { result, props } = setup({ language: "fr" });

    await record(result, 500);

    expect(props.onText).toHaveBeenCalledWith("La terre est ronde");
    expect(apiFetch).toHaveBeenCalledTimes(1);
});

test("a missing translation falls back to the transcript", async () => {
    apiFetch.mockResolvedValueOnce({ text: "I ni ce" }).mockResolvedValueOnce({});
    const { result, props } = setup();
    await record(result, 500);
    expect(props.onText).toHaveBeenCalledWith("I ni ce");
});

test("an empty transcription does not fill the claim", async () => {
    apiFetch.mockResolvedValueOnce({ text: "   " });
    const { result, props } = setup();

    await record(result, 500);

    expect(props.onText).not.toHaveBeenCalled();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(result.current.notice.message).toBe(VOICE_MESSAGES.noTranscript);
});

test("a recording shorter than the minimum is ignored", async () => {
    const { result } = setup();
    await record(result, MIN_RECORDING_MS - 1);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(result.current.notice.message).toBe(VOICE_MESSAGES.tooShort);
});

test("an empty recording is reported", async () => {
    const { result } = setup();
    await act(async () => {
        await result.current.start();
    });
    const recorder = MockMediaRecorder.instances[0];
    recorder.stop = function stop() {
        this.onstop?.();
    };
    now += 600;
    await act(async () => {
        result.current.stop();
    });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(result.current.notice.message).toBe(VOICE_MESSAGES.noAudio);
});

test.each([
    [new ApiError(0, "network"), VOICE_MESSAGES.network],
    [new ApiError(503, "voice_service_starting"), VOICE_MESSAGES.starting],
    [new ApiError(502, "server"), VOICE_MESSAGES.badGateway],
    [new ApiError(503, "server"), VOICE_MESSAGES.unavailable],
    [new ApiError(504, "server"), VOICE_MESSAGES.timeout],
    [new ApiError(500, "server", "", { error: "Request timed out" }), VOICE_MESSAGES.timeout],
    [new ApiError(400, "invalid"), VOICE_MESSAGES.generic],
    [new Error("weird"), VOICE_MESSAGES.network],
])("transcription failure %o shows a French message and does not fill the claim", async (error, message) => {
    apiFetch.mockRejectedValueOnce(error);
    const { result, props } = setup();

    await record(result, 500);

    expect(props.onText).not.toHaveBeenCalled();
    expect(result.current.notice).toEqual({ tone: "error", message });
    expect(result.current.phase).toBe("idle");
});

test("signed-out users are asked to sign in", async () => {
    const { result } = setup({ isLoggedIn: false });
    await act(async () => {
        await result.current.start();
    });
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(result.current.notice.message).toBe(VOICE_MESSAGES.signIn);
    act(() => result.current.clearNotice());
    expect(result.current.notice).toBeNull();
});

test("browsers without MediaRecorder get a clear message", async () => {
    delete window.MediaRecorder;
    const { result } = setup();
    await act(async () => {
        await result.current.start();
    });
    expect(result.current.notice.message).toBe(VOICE_MESSAGES.unsupported);
});

test("a refused microphone is reported", async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    const { result } = setup();
    await act(async () => {
        await result.current.start();
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.notice.message).toBe(VOICE_MESSAGES.micDenied);
});

test("a recorder error returns to idle", async () => {
    const { result } = setup();
    await act(async () => {
        await result.current.start();
    });
    await act(async () => {
        MockMediaRecorder.instances[0].onerror({ error: new Error("x") });
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.notice.message).toBe(VOICE_MESSAGES.recorderError);
});

test("Space toggles recording when enabled", async () => {
    apiFetch.mockResolvedValueOnce({ text: "I ni ce" }).mockResolvedValueOnce({ translated_text: "Merci" });
    const { result, props } = setup();

    await act(async () => {
        fireEvent.keyDown(document.body, { key: " ", code: "Space" });
    });
    expect(result.current.phase).toBe("recording");

    now += 500;
    await act(async () => {
        fireEvent.keyDown(document.body, { key: " ", code: "Space" });
    });
    expect(props.onText).toHaveBeenCalledWith("Merci");
});

test("Space does nothing when disabled or while typing", async () => {
    const { result } = setup({ enabled: false });
    await act(async () => {
        fireEvent.keyDown(document.body, { key: " ", code: "Space" });
    });
    expect(result.current.phase).toBe("idle");

    const { result: enabledResult } = setup();
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    await act(async () => {
        fireEvent.keyDown(textarea, { key: " ", code: "Space" });
    });
    expect(enabledResult.current.phase).toBe("idle");
    textarea.remove();
});

test("toggle starts and stops", async () => {
    apiFetch.mockResolvedValueOnce({ text: "Bonjour" });
    const { result, props } = setup({ language: "fr" });
    await act(async () => {
        result.current.toggle();
    });
    expect(result.current.phase).toBe("recording");
    now += 500;
    await act(async () => {
        result.current.toggle();
    });
    expect(props.onText).toHaveBeenCalledWith("Bonjour");
});

test("a fast tap (release before the mic resolves) does not get stuck recording", async () => {
    let resolveMedia;
    navigator.mediaDevices.getUserMedia = vi.fn(
        () =>
            new Promise((resolve) => {
                resolveMedia = resolve;
            })
    );
    const { result } = setup();

    let pending;
    act(() => {
        pending = result.current.start();
    });
    act(() => {
        result.current.stop();
    });
    const track = { stop: vi.fn() };
    await act(async () => {
        resolveMedia({ getTracks: () => [track] });
        await pending;
    });

    expect(result.current.phase).toBe("idle");
    expect(track.stop).toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
});

test("touch devices are detected from a coarse pointer", () => {
    const original = window.matchMedia;
    window.matchMedia = (query) => ({ matches: query === "(pointer: coarse)", media: query });
    const { result } = setup();
    expect(result.current.isTouch).toBe(true);
    window.matchMedia = original;
});
