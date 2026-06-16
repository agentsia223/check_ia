import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import SubmitFact from "./SubmitFact";
import { AuthContext } from "../utils/AuthContext";
import { API_BASE_URL } from "../config";
import { MIN_RECORDING_MS } from "../hooks/useVoiceDictation";

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

const JSON_HEADERS = {
    headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
    },
};

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

test("manual submit posts the (French) claim to the submissions endpoint", async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 7 } });
    renderSubmitFact();

    await userEvent.type(screen.getByLabelText(CLAIM_LABEL), "La terre est ronde");
    await userEvent.click(screen.getByRole("button", { name: VERIFY_BUTTON }));

    await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
            `${API_BASE_URL}submissions/`,
            { texte: "La terre est ronde", source: "" },
            JSON_HEADERS
        )
    );
});

test("Bambara journey: the verdict is translated back to Bambara, with a toggle to French", async () => {
    const intervalSpy = jest.spyOn(window, "setInterval").mockImplementation((cb) => {
        cb();
        return 1;
    });
    axios.post
        .mockResolvedValueOnce({ data: { translated_text: "Le ciel est bleu" } }) // claim BM→FR
        .mockResolvedValueOnce({ data: { id: 5 } }) // submit
        .mockResolvedValueOnce({ data: { translated_text: "Sankolo ka blen tigi" } }); // result FR→BM
    axios.get.mockResolvedValue({
        data: {
            statut: "vérifié",
            web_sources: [],
            detailed_result: "Le ciel est effectivement bleu.",
        },
    });

    renderSubmitFact();

    fireEvent.click(screen.getByRole("button", { name: /^bambara$/i }));
    fireEvent.change(screen.getByLabelText(/votre affirmation en bambara/i), {
        target: { value: "Sankolo ka blen" },
    });
    fireEvent.click(screen.getByRole("button", { name: /traduire en français/i }));
    await waitFor(() =>
        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Le ciel est bleu")
    );

    fireEvent.click(screen.getByRole("button", { name: VERIFY_BUTTON }));

    // Verdict auto-shows in Bambara.
    expect(await screen.findByText("Sankolo ka blen tigi")).toBeInTheDocument();
    expect(
        axios.post.mock.calls.some(
            ([url, body]) =>
                url === `${API_BASE_URL}bambara/translate/` &&
                body.source_lang === "fr" &&
                body.target_lang === "bm"
        )
    ).toBe(true);

    // Toggle back to French.
    fireEvent.click(screen.getByRole("button", { name: /résultat en français/i }));
    expect(screen.getByText("Le ciel est effectivement bleu.")).toBeInTheDocument();

    intervalSpy.mockRestore();
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

async function selectLanguage(name) {
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name }));
    });
}

async function selectMethod(name) {
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name }));
    });
}

// Switch to the voice sub-mode for `language` (French is the default language).
async function goVoice(language = "bm") {
    if (language === "bm") await selectLanguage(/^bambara$/i);
    await selectMethod(/^parler$/i);
}

// Voice dictation: switch to voice, record `ms` of fake time, then stop.
async function record(ms = 500, language = "bm") {
    await goVoice(language);
    const micName = language === "bm" ? /enregistrer en bambara/i : /enregistrer en français/i;
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: micName }));
    });
    await act(async () => {
        jest.advanceTimersByTime(ms);
    });
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /arrêter l'enregistrement/i }));
    });
}

describe("Language journeys", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        delete window.matchMedia;
    });

    test("French is the default; Bambara reveals a text box and voice", async () => {
        renderSubmitFact();

        // French + text (default): direct claim box, no mic, no Bambara box.
        expect(screen.getByLabelText(CLAIM_LABEL)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^écrire$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^parler$/i })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /enregistrer/i })).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText(/votre affirmation en bambara/i)
        ).not.toBeInTheDocument();

        await selectLanguage(/^bambara$/i);
        // Bambara + text (carried over): the Bambara input box shows.
        expect(screen.getByLabelText(/votre affirmation en bambara/i)).toBeInTheDocument();

        await selectMethod(/^parler$/i);
        expect(
            screen.getByRole("button", { name: /enregistrer en bambara/i })
        ).toBeInTheDocument();
        expect(screen.getByText(/dicter en bambara/i)).toBeInTheDocument();
    });

    test("Bambara text: translating fills the French claim and shows a note", async () => {
        axios.post.mockResolvedValueOnce({ data: { translated_text: "Bonjour" } });
        renderSubmitFact();
        await selectLanguage(/^bambara$/i);

        await act(async () => {
            fireEvent.change(screen.getByLabelText(/votre affirmation en bambara/i), {
                target: { value: "I ni ce" },
            });
        });
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: /traduire en français/i }));
        });

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Bonjour");
        expect(screen.getByText(/traduit du bambara/i)).toBeInTheDocument();
        expect(axios.post).toHaveBeenCalledWith(
            `${API_BASE_URL}bambara/translate/`,
            { text: "I ni ce", source_lang: "bm", target_lang: "fr" },
            JSON_HEADERS
        );
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test("Bambara voice fills the claim with the translation and does NOT submit", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } });
        renderSubmitFact();

        await record(500, "bm");

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Merci");
        expect(screen.getByText(/traduit du bambara/i)).toBeInTheDocument();
        expect(axios.post).toHaveBeenCalledTimes(2); // transcribe + translate, no submit
    });

    test("French voice fills the claim directly (no translation, no note)", async () => {
        axios.post.mockResolvedValueOnce({ data: { text: "La terre est ronde" } });
        renderSubmitFact();

        await record(500, "fr");

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("La terre est ronde");
        expect(axios.post).toHaveBeenCalledTimes(1); // transcribe only — no translation
        expect(screen.queryByText(/traduit du bambara/i)).not.toBeInTheDocument();
        // The transcribe call was made in French.
        const [, formData] = axios.post.mock.calls[0];
        expect(formData.get("language")).toBe("fr");
    });

    test("the user submits the dictated (and editable) text themselves", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } })
            .mockResolvedValueOnce({ data: { id: 42 } });
        renderSubmitFact();

        await record(500, "bm");
        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("Merci");

        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: VERIFY_BUTTON }));
        });

        expect(axios.post).toHaveBeenNthCalledWith(
            3,
            `${API_BASE_URL}submissions/`,
            { texte: "Merci", source: "" },
            JSON_HEADERS
        );
    });

    test("does not fill the claim when the transcription is empty", async () => {
        axios.post.mockResolvedValueOnce({ data: { text: "   " } });
        renderSubmitFact();

        await record(500, "bm");

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("");
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test("does not fill the claim when transcription fails", async () => {
        axios.post.mockRejectedValueOnce(new Error("network"));
        renderSubmitFact();

        await record(500, "bm");

        expect(screen.getByLabelText(CLAIM_LABEL)).toHaveValue("");
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test("ignores a recording shorter than the minimum duration", async () => {
        renderSubmitFact();

        await record(MIN_RECORDING_MS - 1, "bm");

        expect(axios.post).not.toHaveBeenCalled();
    });

    test("spacebar toggles recording in the voice sub-mode", async () => {
        axios.post
            .mockResolvedValueOnce({ data: { text: "I ni ce" } })
            .mockResolvedValueOnce({ data: { translated_text: "Merci" } });
        renderSubmitFact();
        await goVoice("bm");

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

    test("spacebar does nothing in a text sub-mode", async () => {
        renderSubmitFact(); // French + text (default): voice disabled

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
        await goVoice("bm");
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
        await goVoice("bm");

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
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    test("touch: a fast tap (release before the mic resolves) does not get stuck recording", async () => {
        mockCoarsePointer();
        let resolveMedia;
        const mediaPromise = new Promise((res) => {
            resolveMedia = res;
        });
        navigator.mediaDevices.getUserMedia = jest.fn(() => mediaPromise);
        renderSubmitFact();
        await goVoice("bm");

        const btn = screen.getByRole("button", { name: /enregistrer en bambara/i });
        await act(async () => {
            fireEvent.pointerDown(btn);
        });
        await act(async () => {
            fireEvent.pointerUp(btn);
        });
        await act(async () => {
            resolveMedia({ getTracks: () => [{ stop: jest.fn() }] });
        });

        expect(
            screen.getByRole("button", { name: /enregistrer en bambara/i })
        ).not.toBeDisabled();
        expect(axios.post).not.toHaveBeenCalled();
    });
});
