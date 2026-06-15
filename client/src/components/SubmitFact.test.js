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

    await userEvent.type(
        screen.getByLabelText(/saisissez le texte/i),
        "La terre est ronde"
    );
    await userEvent.click(
        screen.getByRole("button", { name: /lancer la vérification/i })
    );

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

// Drives: start recording → record `ms` of (fake) time → stop.
async function record(ms = 500) {
    await act(async () => {
        fireEvent.click(
            screen.getByRole("button", { name: /enregistrer en bambara/i })
        );
    });
    await act(async () => {
        jest.advanceTimersByTime(ms);
    });
    await act(async () => {
        fireEvent.click(
            screen.getByRole("button", { name: /arrêter l'enregistrement/i })
        );
    });
}

describe("Bambara speak-to-verify flow", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test("transcribes, translates, then auto-submits verification after the countdown", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } })
            .mockResolvedValueOnce({ data: { id: 42 } });
        renderSubmitFact();

        await record(500);

        // Translated text fills the claim field; verification has NOT fired yet.
        expect(screen.getByLabelText(/saisissez le texte/i)).toHaveValue("Merci");
        expect(axios.post).toHaveBeenCalledTimes(2);

        // Countdown elapses → auto-verify.
        await act(async () => {
            jest.advanceTimersByTime(3000);
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

    test("does not verify when the transcription is empty", async () => {
        axios.post.mockResolvedValueOnce({ data: { text: "   " } });
        renderSubmitFact();

        await record(500);
        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        // Only the transcribe call happened — no translate, no submissions.
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(
            screen.queryByRole("button", { name: /annuler/i })
        ).not.toBeInTheDocument();
    });

    test("does not verify when transcription fails", async () => {
        axios.post.mockRejectedValueOnce(new Error("502"));
        renderSubmitFact();

        await record(500);
        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test("cancelling the countdown prevents auto-verification", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } });
        renderSubmitFact();

        await record(500);
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /annuler/i }));
        });
        expect(
            screen.queryByRole("button", { name: /annuler/i })
        ).not.toBeInTheDocument();
        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(axios.post).toHaveBeenCalledTimes(2); // transcribe + translate only
    });

    test("ignores a recording shorter than the minimum duration", async () => {
        renderSubmitFact();

        await record(MIN_RECORDING_MS - 1); // just below the minimum

        expect(axios.post).not.toHaveBeenCalled();
    });

    test("spacebar toggles recording on desktop", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } });
        renderSubmitFact();

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

        expect(screen.getByLabelText(/saisissez le texte/i)).toHaveValue("Merci");
    });

    test("spacebar does not start recording while typing in the claim field", () => {
        renderSubmitFact();
        const textarea = screen.getByLabelText(/saisissez le texte/i);
        textarea.focus();

        fireEvent.keyDown(textarea, { key: " ", code: "Space" });

        expect(
            screen.queryByRole("button", { name: /arrêter l'enregistrement/i })
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /enregistrer en bambara/i })
        ).toBeInTheDocument();
    });
});
