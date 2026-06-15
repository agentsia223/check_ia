import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Mic, StopCircle } from "@mui/icons-material";

function BambaraVoiceVerify({
    phase,
    transcript,
    countdown,
    isTouch,
    loading,
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
    else if (phase === "review") statusText = `Vérification automatique dans ${countdown ?? "…"} s...`;
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
                disabled={isBusy || loading}
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

            <Typography
                variant="body2"
                aria-live="polite"
                sx={{ mt: 2, color: "var(--slate-600)" }}
            >
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
