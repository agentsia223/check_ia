# Bambara Voice Verify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse Bambara fact-checking into one fluid gesture — speak, stop, and verification fires on its own — replacing today's three-click record → stop → verify flow.

**Architecture:** Extract the voice concern out of the 741-line `SubmitFact.js` into a `useBambaraVoiceVerify` hook (MediaRecorder lifecycle + state machine + transcribe→translate→countdown→verify orchestration) and a presentational `BambaraVoiceVerify` component. `SubmitFact` lifts its submission POST into a reusable `submitForVerification(text)` and passes it to the hook as the auto-verify callback.

**Tech Stack:** React 18 (CRA), MUI 6, axios, react-toastify, Jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-15-bambara-voice-verify-design.md`

---

## File Structure

- **Create** `client/src/hooks/useBambaraVoiceVerify.js` — recording + orchestration hook. Owns `MediaRecorder`, the `idle→recording→transcribing→review` state machine, spacebar/Escape handling, and the transcribe→translate→countdown→verify pipeline. Exposes `{ phase, transcript, countdown, isTouch, start, stop, toggle, cancel }`.
- **Create** `client/src/components/BambaraVoiceVerify.js` — presentational inline block (mic button, status text, countdown + Annuler, transcript). No network/recorder logic.
- **Create** `client/src/components/BambaraVoiceVerify.test.js` — presentational tests (touch vs desktop labels, press/release, countdown + cancel rendering).
- **Modify** `client/src/components/SubmitFact.js` — add `submitForVerification(text)`, render `<BambaraVoiceVerify>`, remove the old inline voice state/handlers/refs.
- **Modify** `client/src/components/SubmitFact.test.js` — replace the old voice test with the new auto-verify flow tests.

**Constants** (defined in the hook, exported for tests): `REVIEW_SECONDS = 3`, `MIN_RECORDING_MS = 400`.

**Conventions:** French user-facing strings. Tests mock `axios`, `navigator.mediaDevices.getUserMedia`, and `MediaRecorder` (the existing `SubmitFact.test.js` already sets these up). No backend changes.

---

## Task 1: Extract `submitForVerification` in SubmitFact (refactor)

Pure refactor: the manual submit button keeps working, but the POST logic becomes a standalone function the voice flow can call too.

**Files:**
- Modify: `client/src/components/SubmitFact.js:55-95` (`handleSubmit`)
- Test: `client/src/components/SubmitFact.test.js`

- [ ] **Step 1: Write the failing test** — append to `client/src/components/SubmitFact.test.js`:

```js
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
```

- [ ] **Step 2: Run it — confirm it passes already** (this captures current behavior before refactor)

Run: `cd client && CI=true npm test -- --watchAll=false src/components/SubmitFact.test.js -t "manual submit posts"`
Expected: PASS (the current `handleSubmit` already does this).

- [ ] **Step 3: Refactor `handleSubmit`** — replace `client/src/components/SubmitFact.js:55-95` with:

```js
    const submitForVerification = (text) => {
        if (!isLoggedIn) {
            toast.error(
                "Vous devez être connecté pour soumettre une information."
            );
            return;
        }
        if (!text || !text.trim()) {
            return;
        }

        setLoading(true);
        setStatus(null);
        setWebSources([]);
        setDetailedResult("");

        const accessToken = getAccessToken();

        axios
            .post(
                `${API_BASE_URL}submissions/`,
                { texte: text, source },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            )
            .then((response) => {
                setSubmissionId(response.data.id);
                setStatus("en cours");
                toast.success("Information soumise avec succès !");
            })
            .catch((error) => {
                console.error("Erreur lors de la soumission :", error);
                setLoading(false);
                toast.error(
                    "Erreur lors de la soumission. Veuillez réessayer."
                );
            });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitForVerification(texte);
    };
```

- [ ] **Step 4: Run the test again — still green**

Run: `cd client && CI=true npm test -- --watchAll=false src/components/SubmitFact.test.js -t "manual submit posts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SubmitFact.js client/src/components/SubmitFact.test.js
git commit -m "refactor: extract submitForVerification from handleSubmit"
```

---

## Task 2: Create the `useBambaraVoiceVerify` hook

**Files:**
- Create: `client/src/hooks/useBambaraVoiceVerify.js`

- [ ] **Step 1: Write the hook** — create `client/src/hooks/useBambaraVoiceVerify.js` with exactly:

```js
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../config";

export const REVIEW_SECONDS = 3;
export const MIN_RECORDING_MS = 400;

// Drives the Bambara voice → verify flow:
// idle → recording → transcribing → review(countdown) → (verify) → idle
export function useBambaraVoiceVerify({ getAccessToken, isLoggedIn, onText, onVerify }) {
    const [phase, setPhase] = useState("idle");
    const [transcript, setTranscript] = useState("");
    const [countdown, setCountdown] = useState(null);

    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordStartRef = useRef(0);
    const countdownTimerRef = useRef(null);
    const verifyTimerRef = useRef(null);

    // Always call the latest callbacks so timers fired later use current state.
    const onTextRef = useRef(onText);
    const onVerifyRef = useRef(onVerify);
    useEffect(() => {
        onTextRef.current = onText;
        onVerifyRef.current = onVerify;
    });

    // Touch devices get press-and-hold; pointer devices get the spacebar toggle.
    const isTouch = useRef(
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches
    ).current;

    const stopStream = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    const clearTimers = useCallback(() => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        if (verifyTimerRef.current) {
            clearTimeout(verifyTimerRef.current);
            verifyTimerRef.current = null;
        }
    }, []);

    const cancel = useCallback(() => {
        clearTimers();
        setCountdown(null);
        setPhase("idle");
    }, [clearTimers]);

    const startCountdown = useCallback(() => {
        setPhase("review");
        setCountdown(REVIEW_SECONDS);
        countdownTimerRef.current = setInterval(() => {
            setCountdown((c) => (c && c > 1 ? c - 1 : c));
        }, 1000);
        verifyTimerRef.current = setTimeout(() => {
            clearTimers();
            setCountdown(null);
            setPhase("idle");
            onVerifyRef.current?.();
        }, REVIEW_SECONDS * 1000);
    }, [clearTimers]);

    const processAudio = useCallback(async (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0) {
            toast.error("Aucun audio n'a été enregistré.");
            setPhase("idle");
            return;
        }

        const accessToken = getAccessToken();
        const formData = new FormData();
        const audioFile = new File(
            [audioBlob],
            `bambara-recording-${Date.now()}.webm`,
            { type: audioBlob.type || "audio/webm" }
        );
        formData.append("file", audioFile);
        formData.append("language", "bm");

        setPhase("transcribing");
        try {
            const transcriptionResponse = await axios.post(
                `${API_BASE_URL}bambara/transcribe/`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            const transcriptText = transcriptionResponse.data.text || "";
            setTranscript(transcriptText);

            if (!transcriptText.trim()) {
                toast.error("Aucune transcription n'a été détectée.");
                setPhase("idle");
                return;
            }

            const translationResponse = await axios.post(
                `${API_BASE_URL}bambara/translate/`,
                { text: transcriptText, source_lang: "bm", target_lang: "fr" },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            const french = translationResponse.data.translated_text || transcriptText;
            onTextRef.current?.(french);
            startCountdown();
        } catch (error) {
            console.error("Erreur lors de la transcription Bambara :", error);
            toast.error("Impossible de transcrire cet audio. Veuillez réessayer.");
            setPhase("idle");
        }
    }, [getAccessToken, startCountdown]);

    const start = useCallback(async () => {
        if (phase !== "idle") return;
        if (!isLoggedIn) {
            toast.error("Vous devez être connecté pour soumettre une information.");
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            toast.error("L'enregistrement vocal n'est pas disponible sur ce navigateur.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaStreamRef.current = stream;
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recordStartRef.current = Date.now();
            setTranscript("");

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const elapsed = Date.now() - recordStartRef.current;
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                stopStream();
                if (elapsed < MIN_RECORDING_MS) {
                    toast.error("Enregistrement trop court. Maintenez plus longtemps.");
                    setPhase("idle");
                    return;
                }
                processAudio(audioBlob);
            };

            recorder.start();
            setPhase("recording");
        } catch (error) {
            console.error("Erreur lors de l'enregistrement Bambara :", error);
            stopStream();
            setPhase("idle");
            toast.error("Impossible d'accéder au microphone.");
        }
    }, [phase, isLoggedIn, stopStream, processAudio]);

    const stop = useCallback(() => {
        if (phase === "recording") {
            mediaRecorderRef.current?.stop();
        }
    }, [phase]);

    const toggle = useCallback(() => {
        if (phase === "recording") stop();
        else if (phase === "idle") start();
    }, [phase, start, stop]);

    // Desktop only: Space toggles recording (unless typing in a field); Escape cancels review.
    useEffect(() => {
        if (isTouch) return undefined;
        const onKeyDown = (e) => {
            if (e.code === "Space" || e.key === " ") {
                const el = e.target;
                const tag = el?.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
                if (phase === "idle" || phase === "recording") {
                    e.preventDefault();
                    toggle();
                }
            } else if (e.key === "Escape" && phase === "review") {
                cancel();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isTouch, phase, toggle, cancel]);

    // Cleanup on unmount.
    useEffect(() => {
        return () => {
            clearTimers();
            stopStream();
        };
    }, [clearTimers, stopStream]);

    return { phase, transcript, countdown, isTouch, start, stop, toggle, cancel };
}
```

- [ ] **Step 2: Lint-check the new file compiles**

Run: `cd client && npx eslint src/hooks/useBambaraVoiceVerify.js`
Expected: no errors (warnings about hook deps are acceptable; fix any error).

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useBambaraVoiceVerify.js
git commit -m "feat: add useBambaraVoiceVerify recording + auto-verify hook"
```

---

## Task 3: Create the `BambaraVoiceVerify` component + presentational tests

**Files:**
- Create: `client/src/components/BambaraVoiceVerify.js`
- Create: `client/src/components/BambaraVoiceVerify.test.js`

- [ ] **Step 1: Write the failing presentational tests** — create `client/src/components/BambaraVoiceVerify.test.js`:

```js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BambaraVoiceVerify from "./BambaraVoiceVerify";

const baseProps = {
    phase: "idle",
    transcript: "",
    countdown: null,
    isTouch: false,
    onToggle: jest.fn(),
    onStart: jest.fn(),
    onStop: jest.fn(),
    onCancel: jest.fn(),
};

test("touch mode shows hold-to-talk and fires start on press, stop on release", () => {
    const onStart = jest.fn();
    const onStop = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch onStart={onStart} onStop={onStop} />);

    const btn = screen.getByRole("button", { name: /maintenez pour parler/i });
    fireEvent.pointerDown(btn);
    expect(onStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(btn);
    expect(onStop).toHaveBeenCalledTimes(1);
});

test("desktop mode toggles on click", () => {
    const onToggle = jest.fn();
    render(<BambaraVoiceVerify {...baseProps} isTouch={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: /enregistrer en bambara/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
});

test("review phase renders the countdown and Annuler", () => {
    const onCancel = jest.fn();
    render(
        <BambaraVoiceVerify
            {...baseProps}
            phase="review"
            transcript="I ni ce"
            countdown={2}
            onCancel={onCancel}
        />
    );

    expect(screen.getByText(/vérification automatique dans 2/i)).toBeInTheDocument();
    expect(screen.getByText(/transcription bambara : i ni ce/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /annuler/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run — confirm it fails (module not found)**

Run: `cd client && CI=true npm test -- --watchAll=false src/components/BambaraVoiceVerify.test.js`
Expected: FAIL — `Cannot find module './BambaraVoiceVerify'`.

- [ ] **Step 3: Write the component** — create `client/src/components/BambaraVoiceVerify.js`:

```jsx
import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Mic, StopCircle } from "@mui/icons-material";

function BambaraVoiceVerify({
    phase,
    transcript,
    countdown,
    isTouch,
    onToggle,
    onStart,
    onStop,
    onCancel,
}) {
    const isRecording = phase === "recording";
    const isBusy = phase === "transcribing" || phase === "review";

    const pressHandlers = isTouch
        ? {
              onPointerDown: onStart,
              onPointerUp: onStop,
              onPointerLeave: onStop,
              onPointerCancel: onStop,
          }
        : { onClick: onToggle };

    let buttonLabel;
    if (phase === "transcribing") buttonLabel = "Traitement de l'audio...";
    else if (phase === "review") buttonLabel = "Vérification imminente...";
    else if (isRecording) buttonLabel = isTouch ? "Relâchez pour arrêter" : "Arrêter l'enregistrement";
    else buttonLabel = isTouch ? "Maintenez pour parler en Bambara" : "Enregistrer en Bambara";

    let statusText;
    if (isRecording) statusText = "Parlez maintenant. La vérification démarre dès l'arrêt.";
    else if (phase === "transcribing") statusText = "Transcription et traduction en cours...";
    else if (phase === "review") statusText = `Vérification automatique dans ${countdown} s...`;
    else if (isTouch) statusText = "Maintenez le bouton et parlez. La vérification se lance automatiquement.";
    else statusText = "Appuyez sur Espace (ou le bouton) et parlez. La vérification se lance automatiquement.";

    return (
        <Box
            sx={{
                mb: 3,
                p: 3,
                border: "1px solid var(--slate-200)",
                borderRadius: "var(--radius-md)",
                bgcolor: "var(--slate-50)",
            }}
        >
            <Button
                variant="contained"
                type="button"
                fullWidth
                startIcon={isRecording ? <StopCircle /> : <Mic />}
                disabled={isBusy}
                {...pressHandlers}
                sx={{
                    minHeight: 52,
                    borderRadius: "var(--radius-md)",
                    bgcolor: isRecording ? "var(--red-600)" : "var(--navy-600)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    touchAction: "none",
                    "&:hover": {
                        bgcolor: isRecording ? "var(--red-700)" : "var(--navy-700)",
                    },
                }}
            >
                {buttonLabel}
            </Button>

            <Typography variant="body2" sx={{ mt: 2, color: "var(--slate-600)" }}>
                {statusText}
            </Typography>

            {phase === "review" && (
                <Button
                    type="button"
                    onClick={onCancel}
                    sx={{ mt: 1, color: "var(--red-600)", fontWeight: 700 }}
                >
                    Annuler
                </Button>
            )}

            {transcript && (
                <Typography variant="body2" sx={{ mt: 1, color: "var(--slate-600)" }}>
                    Transcription Bambara : {transcript}
                </Typography>
            )}
        </Box>
    );
}

export default BambaraVoiceVerify;
```

- [ ] **Step 4: Run — confirm the tests pass**

Run: `cd client && CI=true npm test -- --watchAll=false src/components/BambaraVoiceVerify.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/BambaraVoiceVerify.js client/src/components/BambaraVoiceVerify.test.js
git commit -m "feat: add BambaraVoiceVerify presentational component"
```

---

## Task 4: Wire the hook + component into SubmitFact

**Files:**
- Modify: `client/src/components/SubmitFact.js` (imports, remove old voice code, render new block)

- [ ] **Step 1: Update the React import** — replace `client/src/components/SubmitFact.js:1`:

```js
import React, { useState, useEffect, useContext } from "react";
```

(Removes now-unused `useRef` and `useCallback`.)

- [ ] **Step 2: Remove `Mic` and `StopCircle` from the icon import** — replace `client/src/components/SubmitFact.js:18-26`:

```js
import {
    FactCheck,
    Verified,
    Warning,
    HourglassEmpty,
    Search,
} from "@mui/icons-material";
```

- [ ] **Step 3: Add the new imports** — directly after the `SourceCard` import (`client/src/components/SubmitFact.js:30`), add:

```js
import BambaraVoiceVerify from "./BambaraVoiceVerify";
import { useBambaraVoiceVerify } from "../hooks/useBambaraVoiceVerify";
```

- [ ] **Step 4: Remove the old voice state and refs** — delete these lines from the state block (`client/src/components/SubmitFact.js:47-52`):

```js
    const [isRecording, setIsRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [bambaraTranscript, setBambaraTranscript] = useState("");
    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
```

- [ ] **Step 5: Remove `stopMediaStream` and its unmount effect** — delete `client/src/components/SubmitFact.js:152-163`:

```js
    const stopMediaStream = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopMediaStream();
        };
    }, [stopMediaStream]);
```

- [ ] **Step 6: Remove `transcribeAndTranslateAudio` and `handleVoiceRecording`** — delete the whole block `client/src/components/SubmitFact.js:165-263` (from `const transcribeAndTranslateAudio = async (audioBlob) => {` through the closing `};` of `handleVoiceRecording`).

- [ ] **Step 7: Instantiate the hook** — immediately after `resetResultState` (now near `client/src/components/SubmitFact.js:150`), add:

```js
    const voice = useBambaraVoiceVerify({
        getAccessToken,
        isLoggedIn,
        onText: (frenchText) => {
            setTexte(frenchText);
            resetResultState();
        },
        onVerify: () => submitForVerification(texte),
    });
```

- [ ] **Step 8: Replace the old voice UI block** — replace the entire voice `<Box>` (originally `client/src/components/SubmitFact.js:447-492`, the `<Box sx={{ mb: 3, p: 3, ... }}>` containing the record `<Button>`, its status `<Typography>`, and the `bambaraTranscript` block) with:

```jsx
                                    <BambaraVoiceVerify
                                        phase={voice.phase}
                                        transcript={voice.transcript}
                                        countdown={voice.countdown}
                                        isTouch={voice.isTouch}
                                        onToggle={voice.toggle}
                                        onStart={voice.start}
                                        onStop={voice.stop}
                                        onCancel={voice.cancel}
                                    />
```

- [ ] **Step 9: Run the build to catch unused vars / syntax errors**

Run: `cd client && CI=true npm run build`
Expected: `Compiled successfully` (no "is defined but never used" eslint errors). If any unused import/var remains, remove it.

- [ ] **Step 10: Commit**

```bash
git add client/src/components/SubmitFact.js
git commit -m "feat: wire BambaraVoiceVerify into SubmitFact (speak-to-verify)"
```

---

## Task 5: Replace the SubmitFact voice flow tests

The old test `records Bambara audio and automatically fills the claim text` (`client/src/components/SubmitFact.test.js:65-117`) assumed the old labels and no auto-verify, and would now fail the min-duration guard. Replace it with timer-driven tests for the new flow.

**Files:**
- Modify: `client/src/components/SubmitFact.test.js`

- [ ] **Step 1: Update the test imports** — replace `client/src/components/SubmitFact.test.js:1-7`:

```js
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import SubmitFact from "./SubmitFact";
import { AuthContext } from "../utils/AuthContext";
import { API_BASE_URL } from "../config";
```

- [ ] **Step 2: Delete the old voice test** — remove `client/src/components/SubmitFact.test.js:65-117` (the entire `test("records Bambara audio and automatically fills the claim text", ...)`). Leave the `manual submit posts ...` test from Task 1 in place.

- [ ] **Step 3: Add a recording helper and the new flow tests** — append to `client/src/components/SubmitFact.test.js`:

```js
// Drives: start recording → record `ms` of (fake) time → stop.
async function record(ms = 500) {
    await act(async () => {
        fireEvent.click(
            screen.getByRole("button", { name: /enregistrer en bambara/i })
        );
    });
    act(() => {
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
        jest.runOnlyPendingTimers();
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
        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(axios.post).toHaveBeenCalledTimes(2); // transcribe + translate only
    });

    test("ignores a recording shorter than the minimum duration", async () => {
        renderSubmitFact();

        await record(100); // below MIN_RECORDING_MS (400)

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

        act(() => {
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
```

- [ ] **Step 4: Run the SubmitFact test file**

Run: `cd client && CI=true npm test -- --watchAll=false src/components/SubmitFact.test.js`
Expected: PASS (manual submit test + all 7 flow tests). If `waitFor` is unused after edits, that's a warning only.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SubmitFact.test.js
git commit -m "test: cover Bambara speak-to-verify flow and edge cases"
```

---

## Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole frontend test suite**

Run: `cd client && CI=true npm test -- --watchAll=false`
Expected: all suites pass, including `BambaraVoiceVerify.test.js` and `SubmitFact.test.js`.

- [ ] **Step 2: Production build (catches eslint-as-error and unused symbols)**

Run: `cd client && CI=true npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run `cd client && npm run build` then serve, or `npx react-scripts start`. On desktop: focus outside the text field, press Space → button shows "Arrêter l'enregistrement"; speak; press Space → transcript appears, claim fills with the French translation, a 3s "Vérification automatique dans N s..." countdown shows with **Annuler**; let it elapse → verification starts. On a touch device / device-emulation: the button reads "Maintenez pour parler en Bambara" and records only while held.

- [ ] **Step 4: Final commit (if the smoke test prompted any tweak)**

```bash
git add -A
git commit -m "chore: finalize Bambara speak-to-verify"
```

---

## Self-Review Notes

- **Spec coverage:** interaction model (Task 2 spacebar/hold + isTouch; Task 3 labels) ✓; brief cancel window (Task 2 `startCountdown`/`cancel`; Task 5 cancel test) ✓; verify French translation (Task 2 `processAudio` → `onText` → `onVerify`) ✓; edge cases — empty transcript, API failure, min-duration, not-logged-in, unmount cleanup (Task 2; Task 5 tests) ✓; refactor into hook + component (Tasks 1–4) ✓; testing matrix (Task 5) ✓.
- **No placeholders:** every code/test block is complete and copy-pasteable.
- **Type/name consistency:** hook returns `{ phase, transcript, countdown, isTouch, start, stop, toggle, cancel }`; component props and SubmitFact wiring (Task 4 Step 8) use exactly those names; constants `REVIEW_SECONDS`/`MIN_RECORDING_MS` are defined once in Task 2 and referenced (by value 3000ms / 400ms) in Task 5 tests.
- **Line-number caveat:** the `SubmitFact.js` line numbers reflect the pre-edit file; after each deletion the later anchors shift. Match on the quoted code, not the absolute line numbers.
