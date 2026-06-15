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

test("transcribes Bambara audio and fills the claim text", async () => {
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

    const audio = new File(["audio-bytes"], "claim.wav", { type: "audio/wav" });
    await userEvent.upload(screen.getByLabelText(/fichier audio/i), audio);
    await userEvent.click(screen.getByRole("button", { name: /transcrire l'audio/i }));

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
});
