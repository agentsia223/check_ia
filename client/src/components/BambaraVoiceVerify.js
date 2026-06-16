import React from "react";
import { Box, Typography } from "@mui/material";
import { Mic } from "@mui/icons-material";
import { keyframes } from "@mui/system";

// Blue → violet, within the navy brand family.
const MIC_GRADIENT = "linear-gradient(140deg, var(--navy-500) 0%, #7c5ce6 100%)";
const MIC_GRADIENT_REC = "linear-gradient(140deg, var(--red-500) 0%, #b9314f 100%)";

const ring = keyframes`
  0%   { transform: scale(0.85); opacity: 0.5; }
  100% { transform: scale(1.9); opacity: 0; }
`;
const wave = keyframes`
  0%, 100% { transform: scaleY(0.35); }
  50%      { transform: scaleY(1); }
`;
const dotPulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
`;

// Static bar heights (px) for the decorative waveform either side of the mic.
const BARS = [10, 18, 14, 26, 20, 34, 16, 28, 12, 22, 16, 9];

function Waveform({ active, flip }) {
    const heights = flip ? [...BARS].reverse() : BARS;
    return (
        <Box
            aria-hidden
            sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                gap: "4px",
                height: 56,
                flex: 1,
                justifyContent: flip ? "flex-end" : "flex-start",
                opacity: active ? 1 : 0.45,
                transition: "opacity 0.3s ease",
            }}
        >
            {heights.map((h, i) => (
                <Box
                    key={i}
                    sx={{
                        width: 3,
                        height: h,
                        borderRadius: "var(--radius-pill)",
                        background:
                            "linear-gradient(var(--navy-300), var(--navy-500))",
                        transformOrigin: "center",
                        animation: active ? `${wave} 1s ease-in-out infinite` : "none",
                        animationDelay: `${(i % 6) * 0.12}s`,
                    }}
                />
            ))}
        </Box>
    );
}

function BambaraVoiceVerify({
    phase,
    transcript,
    isTouch,
    loading,
    onToggle,
    onStart,
    onStop,
}) {
    const isRecording = phase === "recording";
    const isTranscribing = phase === "transcribing";
    const disabled = isTranscribing || loading;

    const pressHandlers = isTouch
        ? {
              onPointerDown: onStart,
              onPointerUp: onStop,
              onPointerLeave: onStop,
              onPointerCancel: onStop,
          }
        : { onClick: onToggle };

    const subtitle = isTouch
        ? "Maintenez le micro pour parler."
        : "Appuyez sur le micro ou utilisez la touche Espace pour parler.";

    let actionLabel;
    if (isTranscribing) actionLabel = "Transcription en cours…";
    else if (isRecording) actionLabel = isTouch ? "Relâchez pour arrêter" : "Cliquez ou Espace pour arrêter";
    else actionLabel = isTouch ? "Maintenez pour parler" : "Appuyez pour parler";

    let statusColor = "var(--navy-400)";
    let statusText = "Prêt à écouter";
    let statusPulse = false;
    if (isRecording) {
        statusColor = "var(--red-500)";
        statusText = "Écoute en cours…";
        statusPulse = true;
    } else if (isTranscribing) {
        statusColor = "var(--amber-500)";
        statusText = "Transcription…";
        statusPulse = true;
    }

    const micAriaLabel = isRecording ? "Arrêter l'enregistrement" : "Enregistrer en Bambara";
    const showRings = isRecording || !disabled;

    return (
        <Box
            sx={{
                mb: 3,
                p: { xs: 3, sm: 4 },
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--slate-200)",
                background:
                    "linear-gradient(180deg, var(--slate-50) 0%, var(--navy-50) 100%)",
                textAlign: "center",
            }}
        >
            <Typography
                sx={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    color: "var(--navy-900)",
                }}
            >
                Dicter en Bambara
            </Typography>
            <Typography
                variant="body2"
                aria-live="polite"
                sx={{ mt: 0.5, color: "var(--slate-600)" }}
            >
                {subtitle}
            </Typography>

            <Box
                sx={{
                    mt: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: { xs: 0, sm: 3 },
                }}
            >
                <Waveform active={isRecording} flip />

                {/* Mic button + pulse rings */}
                <Box sx={{ position: "relative", flexShrink: 0, width: 88, height: 88 }}>
                    {showRings && (
                        <>
                            <Box
                                aria-hidden
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "var(--radius-full)",
                                    background: isRecording ? "var(--red-200)" : "var(--navy-200)",
                                    animation: `${ring} 2s ease-out infinite`,
                                }}
                            />
                            <Box
                                aria-hidden
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    borderRadius: "var(--radius-full)",
                                    background: isRecording ? "var(--red-200)" : "var(--navy-200)",
                                    animation: `${ring} 2s ease-out infinite`,
                                    animationDelay: "1s",
                                }}
                            />
                        </>
                    )}
                    <Box
                        component="button"
                        type="button"
                        aria-label={micAriaLabel}
                        disabled={disabled}
                        {...pressHandlers}
                        sx={{
                            position: "relative",
                            width: 88,
                            height: 88,
                            borderRadius: "var(--radius-full)",
                            border: "4px solid #fff",
                            background: isRecording ? MIC_GRADIENT_REC : MIC_GRADIENT,
                            boxShadow: "var(--shadow-lg)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: disabled ? "default" : "pointer",
                            opacity: disabled ? 0.6 : 1,
                            touchAction: "none",
                            transition: "transform 0.15s ease, opacity 0.2s ease",
                            "&:hover": { transform: disabled ? "none" : "scale(1.04)" },
                            "&:active": { transform: disabled ? "none" : "scale(0.97)" },
                        }}
                    >
                        <Mic sx={{ color: "#fff", fontSize: 36 }} />
                    </Box>
                </Box>

                <Waveform active={isRecording} />
            </Box>

            <Typography sx={{ mt: 2.5, fontWeight: 700, color: "var(--navy-900)" }}>
                {actionLabel}
            </Typography>

            <Box sx={{ mt: 1, display: "inline-flex", alignItems: "center", gap: 1 }}>
                <Box
                    aria-hidden
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "var(--radius-full)",
                        backgroundColor: statusColor,
                        animation: statusPulse ? `${dotPulse} 1.2s ease-in-out infinite` : "none",
                    }}
                />
                <Typography variant="body2" aria-live="polite" sx={{ color: "var(--slate-600)" }}>
                    {statusText}
                </Typography>
            </Box>

            {transcript && (
                <Typography
                    variant="body2"
                    sx={{ mt: 1.5, color: "var(--slate-500)", fontStyle: "italic" }}
                >
                    Transcription Bambara : {transcript}
                </Typography>
            )}
        </Box>
    );
}

export default BambaraVoiceVerify;
