import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";

export const MIN_RECORDING_MS = 400;

const TRANSCRIBE_TIMEOUT_MS = 120000;
const TRANSLATE_TIMEOUT_MS = 60000;

export const VOICE_MESSAGES = Object.freeze({
    added: "Texte ajouté. Modifiez-le si besoin, puis lancez la vérification.",
    noAudio: "Aucun audio n'a été enregistré.",
    noTranscript: "Aucune transcription n'a été détectée.",
    tooShort: "Enregistrement trop court. Maintenez plus longtemps.",
    signIn: "Connectez-vous pour utiliser la dictée vocale.",
    unsupported: "L'enregistrement vocal n'est pas disponible sur ce navigateur.",
    recorderError: "Une erreur s'est produite pendant l'enregistrement.",
    micDenied: "Impossible d'accéder au microphone.",
    network: "Connexion au service de transcription impossible. Vérifiez votre connexion internet, puis réessayez.",
    starting: "Le service vocal démarre, réessayez dans quelques secondes.",
    badGateway: "Le service vocal est temporairement indisponible. Réessayez dans un instant.",
    unavailable: "Le service de transcription est momentanément indisponible. Réessayez plus tard.",
    timeout: "La transcription a pris trop de temps. Essayez un enregistrement plus court.",
    generic: "Impossible de transcrire cet audio. Veuillez réessayer.",
});

function transcriptionErrorMessage(error) {
    if (!(error instanceof ApiError) || error.status === 0) return VOICE_MESSAGES.network;
    const serverError = typeof error.body?.error === "string" ? error.body.error : "";
    if (error.status === 503 && error.code === "voice_service_starting") return VOICE_MESSAGES.starting;
    if (error.status === 502) return VOICE_MESSAGES.badGateway;
    if (error.status === 503) return VOICE_MESSAGES.unavailable;
    if (error.status === 504 || /timed out|timeout/i.test(serverError)) return VOICE_MESSAGES.timeout;
    return VOICE_MESSAGES.generic;
}

/**
 * Voice dictation for a claim. Records, transcribes in `language`, and — for Bambara —
 * translates the transcript to French, then fills the claim field via `onText`. French
 * dictation skips the translation step. It does NOT submit anything.
 *
 * Phases: idle → recording → transcribing → idle.
 *
 * @param {{getAccessToken?: () => string|null, isLoggedIn: boolean, language?: "bm"|"fr",
 *   onText: (text: string) => void, enabled?: boolean,
 *   onNotice?: (notice: {tone: "info"|"error", message: string}) => void}} options
 *   `getAccessToken` is kept for compatibility: requests go through apiFetch, which adds the
 *   session token itself. `enabled` turns on the Space-bar toggle (desktop only).
 *   `onNotice` replaces the old toasts; the latest notice is also returned.
 * @returns {{phase: "idle"|"recording"|"transcribing", transcript: string, isTouch: boolean,
 *   start: () => Promise<void>, stop: () => void, toggle: () => void,
 *   notice: {tone: "info"|"error", message: string} | null, clearNotice: () => void}}
 */
export function useVoiceDictation({ getAccessToken, isLoggedIn, language = "bm", onText, enabled = true, onNotice }) {
    const [phase, setPhase] = useState("idle");
    const [transcript, setTranscript] = useState("");
    const [notice, setNotice] = useState(null);

    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordStartRef = useRef(0);
    const processAudioRef = useRef(null);
    const startPendingRef = useRef(false);
    const stopRequestedRef = useRef(false);

    // Always use the latest callbacks and language for async completions.
    const onTextRef = useRef(onText);
    const onNoticeRef = useRef(onNotice);
    const languageRef = useRef(language);
    useEffect(() => {
        onTextRef.current = onText;
        onNoticeRef.current = onNotice;
        languageRef.current = language;
    });

    const notify = useCallback((tone, message) => {
        const next = { tone, message };
        setNotice(next);
        onNoticeRef.current?.(next);
    }, []);

    const clearNotice = useCallback(() => setNotice(null), []);

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

    const processAudio = useCallback(
        async (audioBlob) => {
            if (!audioBlob || audioBlob.size === 0) {
                notify("error", VOICE_MESSAGES.noAudio);
                setPhase("idle");
                return;
            }

            const lang = languageRef.current;
            const formData = new FormData();
            const audioFile = new File([audioBlob], `dictation-${lang}-${Date.now()}.webm`, {
                type: audioBlob.type || "audio/webm",
            });
            formData.append("file", audioFile);
            formData.append("language", lang);

            setPhase("transcribing");
            try {
                const transcription = await apiFetch("bambara/transcribe/", {
                    method: "POST",
                    formData,
                    timeoutMs: TRANSCRIBE_TIMEOUT_MS,
                });
                const transcriptText = transcription?.text || "";
                setTranscript(transcriptText);

                if (!transcriptText.trim()) {
                    notify("error", VOICE_MESSAGES.noTranscript);
                    setPhase("idle");
                    return;
                }

                // Bambara is translated to French; French is used as-is.
                let frenchText = transcriptText;
                if (lang === "bm") {
                    const translation = await apiFetch("bambara/translate/", {
                        method: "POST",
                        json: { text: transcriptText, source_lang: "bm", target_lang: "fr" },
                        timeoutMs: TRANSLATE_TIMEOUT_MS,
                    });
                    frenchText = translation?.translated_text || transcriptText;
                }

                onTextRef.current?.(frenchText);
                setPhase("idle");
                notify("info", VOICE_MESSAGES.added);
            } catch (error) {
                notify("error", transcriptionErrorMessage(error));
                setPhase("idle");
            }
        },
        [notify]
    );

    useEffect(() => {
        processAudioRef.current = processAudio;
    }, [processAudio]);

    const start = useCallback(async () => {
        if (phase !== "idle") return;
        if (!isLoggedIn) {
            notify("error", VOICE_MESSAGES.signIn);
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            notify("error", VOICE_MESSAGES.unsupported);
            return;
        }

        startPendingRef.current = true;
        stopRequestedRef.current = false;
        setNotice(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startPendingRef.current = false;
            if (stopRequestedRef.current) {
                stopRequestedRef.current = false;
                stream.getTracks().forEach((track) => track.stop());
                setPhase("idle");
                return;
            }
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
                    notify("error", VOICE_MESSAGES.tooShort);
                    setPhase("idle");
                    return;
                }
                processAudioRef.current(audioBlob);
            };

            recorder.onerror = () => {
                stopStream();
                setPhase("idle");
                notify("error", VOICE_MESSAGES.recorderError);
            };

            recorder.start();
            setPhase("recording");
        } catch {
            startPendingRef.current = false;
            stopStream();
            setPhase("idle");
            notify("error", VOICE_MESSAGES.micDenied);
        }
    }, [phase, isLoggedIn, stopStream, notify]);

    const stop = useCallback(() => {
        if (phase === "recording") {
            mediaRecorderRef.current?.stop();
        } else if (startPendingRef.current) {
            // Release happened before the mic stream resolved (fast tap on touch);
            // tell the pending start() to abort instead of getting stuck recording.
            stopRequestedRef.current = true;
        }
    }, [phase]);

    const toggle = useCallback(() => {
        if (phase === "recording") stop();
        else if (phase === "idle") start();
    }, [phase, start, stop]);

    // Desktop + voice mode only: Space toggles recording (unless typing in a field).
    useEffect(() => {
        if (isTouch || !enabled) return undefined;
        const onKeyDown = (e) => {
            if (e.code === "Space" || e.key === " ") {
                const el = e.target;
                const tag = el?.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
                if (phase === "idle" || phase === "recording") {
                    e.preventDefault();
                    toggle();
                }
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isTouch, enabled, phase, toggle]);

    // Cleanup on unmount.
    useEffect(() => {
        return () => {
            stopStream();
        };
    }, [stopStream]);

    return { phase, transcript, isTouch, start, stop, toggle, notice, clearNotice };
}
