import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { API_BASE_URL } from "../config";

export const MIN_RECORDING_MS = 400;

/**
 * Voice dictation for a claim. Records, transcribes in `language`, and — for
 * Bambara — translates the transcript to French, then fills the claim field via
 * `onText`. French dictation skips the translation step (the transcript is the
 * French claim). It does NOT submit anything — the user reviews/edits, then
 * launches verification themselves.
 *
 * Phases: idle → recording → transcribing → idle.
 *
 * `getAccessToken` and `onText` may change each render; the latest is always used.
 * Prefer a stable `getAccessToken` to avoid needless keydown-listener re-subscription.
 */
export function useVoiceDictation({ getAccessToken, isLoggedIn, language = "bm", onText, enabled = true }) {
    const [phase, setPhase] = useState("idle");
    const [transcript, setTranscript] = useState("");

    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordStartRef = useRef(0);
    const processAudioRef = useRef(null);
    const startPendingRef = useRef(false);
    const stopRequestedRef = useRef(false);

    // Always use the latest language / onText for async completions.
    const onTextRef = useRef(onText);
    const languageRef = useRef(language);
    useEffect(() => {
        onTextRef.current = onText;
        languageRef.current = language;
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

    const processAudio = useCallback(async (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0) {
            toast.error("Aucun audio n'a été enregistré.");
            setPhase("idle");
            return;
        }

        const lang = languageRef.current;
        const accessToken = getAccessToken();
        const formData = new FormData();
        const audioFile = new File(
            [audioBlob],
            `dictation-${lang}-${Date.now()}.webm`,
            { type: audioBlob.type || "audio/webm" }
        );
        formData.append("file", audioFile);
        formData.append("language", lang);

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

            // Bambara is translated to French; French is used as-is.
            let frenchText = transcriptText;
            if (lang === "bm") {
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
                frenchText = translationResponse.data.translated_text || transcriptText;
            }

            onTextRef.current?.(frenchText);
            setPhase("idle");
            toast.success(
                "Texte ajouté. Modifiez-le si besoin, puis lancez la vérification."
            );
        } catch (error) {
            console.error("Erreur lors de la transcription vocale :", error);
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
    }, [getAccessToken]);

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
                console.error("Erreur du MediaRecorder :", event?.error || event);
                stopStream();
                setPhase("idle");
                toast.error("Une erreur s'est produite pendant l'enregistrement.");
            };

            recorder.start();
            setPhase("recording");
        } catch (error) {
            startPendingRef.current = false;
            console.error("Erreur lors de l'enregistrement :", error);
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

    return { phase, transcript, isTouch, start, stop, toggle };
}
