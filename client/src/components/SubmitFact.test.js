import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import SubmitFact from "./SubmitFact";
import { AuthContext } from "../utils/AuthContext";
import { API_BASE_URL } from "../config";

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
});

test("records Bambara audio and automatically fills the claim text", async () => {
    axios.post.mockResolvedValueOnce({
        data: {
            text: "I ni ce",
            language: "bm",
            duration_s: 2.4,
            model: "asr-model",
        },
    }).mockResolvedValueOnce({
        data: {
            translated_text: "Merci",
            source_lang: "bm",
            target_lang: "fr",
            model: "translation-model",
        },
    });
    renderSubmitFact();

    await userEvent.click(screen.getByRole("button", { name: /enregistrer en bambara/i }));
    await userEvent.click(await screen.findByRole("button", { name: /arrêter l'enregistrement/i }));

    await waitFor(() => {
        expect(
            screen.getByLabelText(/saisissez le texte/i)
        ).toHaveValue("Merci");
    });

    expect(axios.post).toHaveBeenNthCalledWith(
        1,
        `${API_BASE_URL}bambara/transcribe/`,
        expect.any(FormData),
        {
            headers: {
                Authorization: "Bearer access-token",
                "Content-Type": "multipart/form-data",
            },
        }
    );
    expect(axios.post).toHaveBeenNthCalledWith(
        2,
        `${API_BASE_URL}bambara/translate/`,
        { text: "I ni ce", source_lang: "bm", target_lang: "fr" },
        {
            headers: {
                Authorization: "Bearer access-token",
                "Content-Type": "application/json",
            },
        }
    );
    expect(screen.getByText(/transcription bambara : i ni ce/i)).toBeInTheDocument();
    expect(screen.queryByText(/choisir un fichier audio/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /transcrire l'audio/i })).not.toBeInTheDocument();
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
