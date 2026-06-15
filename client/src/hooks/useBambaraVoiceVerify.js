import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../config";

export const REVIEW_SECONDS = 3;
export const MIN_RECORDING_MS = 400;

// Drives the Bambara voice → verify flow:
// idle → recording → transcribing → review(countdown) → (verify) → idle
/**
 * Bambara voice → auto-verify flow (idle → recording → transcribing → review → verify).
 * `getAccessToken`, `onText`, and `onVerify` may change each render — the latest is always
 * used. Prefer a stable `getAccessToken` to avoid needless keydown-listener re-subscription.
 */
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
    const processAudioRef = useRef(null);
    const startPendingRef = useRef(false);
    const stopRequestedRef = useRef(false);

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
            const httpStatus = error?.response?.status;
            const serverError = error?.response?.data?.error || "";
            let message;
            if (!error?.response) {
                // No response reached the browser: network error, dropped
                // connection, or a worker killed mid-request (surfaces as CORS).
                message =
                    "Connexion au service de transcription impossible. Vérifiez votre connexion et réessayez.";
            } else if (httpStatus === 503) {
                message =
                    "Le service de transcription est momentanément indisponible. Réessayez plus tard.";
            } else if (httpStatus === 504 || /timed out|timeout/i.test(serverError)) {
                message =
                    "La transcription a pris trop de temps. Essayez un enregistrement plus court.";
            } else {
                message = "Impossible de transcrire cet audio. Veuillez réessayer.";
            }
            toast.error(message);
            setPhase("idle");
        }
    }, [getAccessToken, startCountdown]);

    useEffect(() => {
        processAudioRef.current = processAudio;
    }, [processAudio]);

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

        startPendingRef.current = true;
        stopRequestedRef.current = false;

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
                    toast.error("Enregistrement trop court. Maintenez plus longtemps.");
                    setPhase("idle");
                    return;
                }
                processAudioRef.current(audioBlob);
            };

            recorder.onerror = (event) => {
                console.error("Erreur du MediaRecorder Bambara :", event?.error || event);
                stopStream();
                setPhase("idle");
                toast.error("Une erreur s'est produite pendant l'enregistrement.");
            };

            recorder.start();
            setPhase("recording");
        } catch (error) {
            startPendingRef.current = false;
            console.error("Erreur lors de l'enregistrement Bambara :", error);
            stopStream();
            setPhase("idle");
            toast.error("Impossible d'accéder au microphone.");
        }
    }, [phase, isLoggedIn, stopStream]);

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
