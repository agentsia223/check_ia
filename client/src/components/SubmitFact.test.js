import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import SubmitFact from "./SubmitFact";
import { AuthContext } from "../utils/AuthContext";
import { API_BASE_URL } from "../config";
import { MIN_RECORDING_MS } from "../hooks/useBambaraVoiceVerify";

jest.mock("axios");
jest.mock("../utils/AuthContext", () => {
    const React = require("react");
    return { AuthContext: React.createContext() };
});

const renderSubmitFact = () =>
    render(
        <AuthContext.Provider
            value={{
                isLoggedIn: true,
                getAccessToken: jest.fn(() => "access-token"),
            }}
        >
            <SubmitFact />
        </AuthContext.Provider>
    );

const CLAIM_LABEL = /affirmation à vérifier/i;
const VERIFY_BUTTON = /vérifier l'information/i;

class MockMediaRecorder {
    static instances = [];

    constructor(stream) {
        this.stream = stream;
        this.state = "inactive";
        this.ondataavailable = null;
        this.onstop = null;
        MockMediaRecorder.instances.push(this);
    }

    start() {
        this.state = "recording";
    }

    stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: "audio/webm" }) });
        this.onstop?.();
    }
}

beforeEach(() => {
    MockMediaRecorder.instances = [];
    Object.defineProperty(window.navigator, "mediaDevices", {
        configurable: true,
        value: {
            getUserMedia: jest.fn(() =>
                Promise.resolve({
                    getTracks: () => [{ stop: jest.fn() }],
                })
            ),
        },
    });
    window.MediaRecorder = MockMediaRecorder;
    axios.post.mockReset();
    axios.get.mockResolvedValue({
        data: { statut: "en cours", web_sources: [], detailed_result: "" },
    });
});

test("manual submit posts the claim to the submissions endpoint", async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 7 } });
    renderSubmitFact();

    await userEvent.type(screen.getByLabelText(CLAIM_LABEL), "La terre est ronde");
    await userEvent.click(screen.getByRole("button", { name: VERIFY_BUTTON }));

    await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
            `${API_BASE_URL}submissions/`,
            { texte: "La terre est ronde", source: "" },
            {
                headers: {
                    Authorization: "Bearer access-token",
                    "Content-Type": "application/json",
                },
            }
        )
    );
});

function mockCoarsePointer() {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === "(pointer: coarse)",
        media: query,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }));
}

async function switchToVoice() {
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /^voix$/i }));
    });
}

// Switch to voice mode, start recording, record `ms` of (fake) time, then stop.
async function record(ms = 500) {
    await switchToVoice();
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /enregistrer en bambara/i }));
    });
    await act(async () => {
        jest.advanceTimersByTime(ms);
    });
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /arrêter l'enregistrement/i }));
    });
}

describe("Bambara voice dictation", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        delete window.matchMedia;
    });

    test("the dictation card shows only in voice mode", async () => {
        renderSubmitFact();

        // Text mode (default): no mic.
        expect(
            screen.queryByRole("button", { name: /enregistrer en bambara/i })
        ).not.toBeInTheDocument();

        await switchToVoice();
        expect(
            screen.getByRole("button", { name: /enregistrer en bambara/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/dicter en bambara/i)).toBeInTheDocument();
    });

    test("dictation fills the claim with the translation and does NOT submit", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } });
        renderSubmitFact();

        await record(500);

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Merci");
        // transcribe + translate only — no submission fired automatically.
        expect(axios.post).toHaveBeenCalledTimes(2);

        // Let time pass — still no auto-submit.
        await act(async () => {
            jest.advanceTimersByTime(5000);
        });
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    test("the user submits the dictated (and editable) text themselves", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } })
            .mockResolvedValueOnce({ data: { id: 42 } });
        renderSubmitFact();

        await record(500);
        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Merci");

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: VERIFY_BUTTON }));
        });

        expect(axios.post).toHaveBeenNthCalledWith(
            3,
            `${API_BASE_URL}submissions/`,
            { texte: "Merci", source: "" },
            {
                headers: {
                    Authorization: "Bearer access-token",
                    "Content-Type": "application/json",
                },
            }
        );
    });

    test("does not fill the claim when the transcription is empty", async () => {
        axios.post.mockResolvedValueOnce({ data: { text: "   " } });
        renderSubmitFact();

        await record(500);

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("");
        expect(axios.post).toHaveBeenCalledTimes(1); // transcribe only, no translate
    });

    test("does not fill the claim when transcription fails", async () => {
        axios.post.mockRejectedValueOnce(new Error("network"));
        renderSubmitFact();

        await record(500);

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("");
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test("ignores a recording shorter than the minimum duration", async () => {
        renderSubmitFact();

        await record(MIN_RECORDING_MS - 1); // just below the minimum

        expect(axios.post).not.toHaveBeenCalled();
    });

    test("spacebar toggles recording in voice mode", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } });
        renderSubmitFact();
        await switchToVoice();

        await act(async () => {
            fireEvent.keyDown(document.body, { key: " ", code: "Space" });
        });
        expect(
            screen.getByRole("button", { name: /arrêter l'enregistrement/i })
        ).toBeInTheDocument();

        await act(async () => {
            jest.advanceTimersByTime(500);
        });
        await act(async () => {
            fireEvent.keyDown(document.body, { key: " ", code: "Space" });
        });

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Merci");
    });

    test("spacebar does nothing in text mode", async () => {
        renderSubmitFact(); // text mode (default)

        await act(async () => {
            fireEvent.keyDown(document.body, { key: " ", code: "Space" });
        });

        expect(
            screen.queryByRole("button", { name: /arrêter l'enregistrement/i })
        ).not.toBeInTheDocument();
        expect(axios.post).not.toHaveBeenCalled();
    });

    test("spacebar does not start recording while typing in the claim field", async () => {
        renderSubmitFact();
        await switchToVoice();
        const textarea = screen.getByLabelText(CLAIM_LABEL);
        textarea.focus();

        fireEvent.keyDown(textarea, { key: " ", code: "Space" });

        expect(
            screen.queryByRole("button", { name: /arrêter l'enregistrement/i })
        ).not.toBeInTheDocument();
    });

    test("touch: press-and-hold dictates and fills the claim", async () => {
        mockCoarsePointer();
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } });
        renderSubmitFact();
        await switchToVoice();

        const btn = screen.getByRole("button", { name: /enregistrer en bambara/i });
        await act(async () => {
            fireEvent.pointerDown(btn);
        });
        await act(async () => {
            jest.advanceTimersByTime(500);
        });
        await act(async () => {
            fireEvent.pointerUp(btn);
        });

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Merci");
        expect(axios.post).toHaveBeenCalledTimes(2); // no auto-submit
    });

    test("touch: a fast tap (release before the mic resolves) does not get stuck recording", async () => {
        mockCoarsePointer();
        let resolveMedia;
        const mediaPromise = new Promise((res) => {
            resolveMedia = res;
        });
        navigator.mediaDevices.getUserMedia = jest.fn(() => mediaPromise);
        renderSubmitFact();
        await switchToVoice();

        const btn = screen.getByRole("button", { name: /enregistrer en bambara/i });
        await act(async () => {
            fireEvent.pointerDown(btn); // start() begins, awaits the mic
        });
        await act(async () => {
            fireEvent.pointerUp(btn); // release before the mic resolves
        });
        await act(async () => {
            resolveMedia({ getTracks: () => [{ stop: jest.fn() }] }); // mic resolves now
        });

        // Not stuck recording: mic stays idle, no transcription POST fired.
        const mic = screen.getByRole("button", { name: /enregistrer en bambara/i });
        expect(mic).not.toBeDisabled();
        expect(axios.post).not.toHaveBeenCalled();
    });
});
