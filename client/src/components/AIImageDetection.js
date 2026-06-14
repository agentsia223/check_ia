import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Button,
    Box,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Grid,
} from "@mui/material";
import {
    CloudUpload,
    Psychology,
    Security,
    Warning,
    CheckCircle,
    SmartToy,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { supabase } from "../lib/supabase";
import { API_BASE_URL } from "../config";
import Logo from "./brand/Logo";
import VerdictBadge from "./brand/VerdictBadge";
import ConfidenceMeter from "./brand/ConfidenceMeter";

const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
});

const ImagePreview = styled("img")({
    maxWidth: "100%",
    maxHeight: "300px",
    objectFit: "contain",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--slate-200)",
    boxShadow: "var(--shadow-sm)",
});

function AIImageDetection() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [taskId, setTaskId] = useState(null);

    // Function to format the analysis text
    const formatAnalysisText = (text) => {
        if (!text) return "";

        // Split text into lines and process each line
        const lines = text.split("\n");
        const formattedLines = [];

        for (let line of lines) {
            // Skip empty lines
            if (line.trim() === "") {
                formattedLines.push(<br key={Math.random()} />);
                continue;
            }

            // Handle bold text (**text**)
            if (line.includes("**")) {
                const parts = line.split("**");
                const formatted = parts.map((part, index) => {
                    if (index % 2 === 1) {
                        return <strong key={index}>{part}</strong>;
                    }
                    return part;
                });
                formattedLines.push(<div key={Math.random()}>{formatted}</div>);
            }
            // Handle bullet points
            else if (
                line.trim().startsWith("*") ||
                line.trim().startsWith("-")
            ) {
                formattedLines.push(
                    <div
                        key={Math.random()}
                        style={{ marginLeft: "20px", marginBottom: "4px" }}
                    >
                        • {line.trim().substring(1).trim()}
                    </div>
                );
            }
            // Regular lines
            else {
                formattedLines.push(<div key={Math.random()}>{line}</div>);
            }
        }

        return formattedLines;
    };

    const handleImageSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                // 10MB limit
                setError("L'image ne doit pas dépasser 10MB");
                return;
            }

            if (!file.type.startsWith("image/")) {
                setError("Veuillez sélectionner un fichier image valide");
                return;
            }

            setSelectedImage(file);
            setError("");

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedImage) {
            setError("Veuillez sélectionner une image");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                setError(
                    "Vous devez être connecté pour utiliser cette fonctionnalité"
                );
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append("image", selectedImage);

            const response = await fetch(
                `${API_BASE_URL}detect-ai-image/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de la détection");
            }

            // Start polling for results with the task_id
            if (data.task_id) {
                setTaskId(data.task_id);
            } else {
                throw new Error("Task ID not received from server");
            }
        } catch (err) {
            console.error("Erreur:", err);
            setError(
                err.message || "Une erreur s'est produite lors de la détection"
            );
            setLoading(false);
        }
    };

    // Polling to check task status
    useEffect(() => {
        let interval;
        if (taskId) {
            interval = setInterval(async () => {
                try {
                    const {
                        data: { session },
                    } = await supabase.auth.getSession();

                    if (!session) {
                        setError("Session expirée. Veuillez vous reconnecter.");
                        setLoading(false);
                        return;
                    }

                    const response = await fetch(
                        `${API_BASE_URL}task-status/${taskId}/`,
                        {
                            headers: {
                                Authorization: `Bearer ${session.access_token}`,
                            },
                        }
                    );

                    const data = await response.json();

                    if (data.state === 'SUCCESS' && data.result) {
                        const resultData = data.result;

                        // Check if this is the upload task completion
                        if (resultData.success && resultData.task_id && !resultData.status) {
                            // This is the upload task - switch to polling the detection task
                            clearInterval(interval);
                            setTaskId(resultData.task_id); // This will trigger new polling for detection task
                            return;
                        }

                        // This is the detection task completion
                        if (resultData.success && resultData.status) {
                            clearInterval(interval);
                            setLoading(false);
                            setResult({
                                status: resultData.status,
                                confidence: resultData.confidence || 0,
                                explanation: resultData.explanation || "Analyse terminée avec succès",
                                details: resultData.details || {},
                                date: resultData.date || new Date().toISOString()
                            });
                        } else if (resultData.error) {
                            clearInterval(interval);
                            setLoading(false);
                            setError(resultData.error);
                        }
                    } else if (data.state === 'FAILURE') {
                        clearInterval(interval);
                        setLoading(false);
                        setError(data.result?.error || 'La détection a échoué');
                    } else if (data.state === 'PENDING' || data.state === 'RETRY') {
                        // Task is still running, continue polling
                        // Task still running, continue polling
                    }
                } catch (err) {
                    console.error('Erreur lors de la vérification du statut:', err);
                    clearInterval(interval);
                    setLoading(false);
                    setError('Erreur lors de la vérification du statut de la tâche');
                }
            }, 2000); // Poll every 2 seconds
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [taskId]);

    // Map detection status -> brand verdict key for VerdictBadge / ConfidenceMeter.
    // AUTHENTIQUE = green/true, IA_DÉTECTÉE = red alarm/false, INCERTAIN = amber/misleading.
    const getVerdictKey = (status) => {
        switch (status) {
            case "AUTHENTIQUE":
                return "true";
            case "IA_DÉTECTÉE":
                return "false";
            case "INCERTAIN":
                return "misleading";
            default:
                return "unverified";
        }
    };

    // Alert severity for the status callout (warning/caution stays amber).
    const getStatusSeverity = (status) => {
        switch (status) {
            case "AUTHENTIQUE":
                return "success";
            case "IA_DÉTECTÉE":
                return "error";
            case "INCERTAIN":
                return "warning";
            default:
                return "info";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "AUTHENTIQUE":
                return <CheckCircle />;
            case "IA_DÉTECTÉE":
                return <SmartToy />;
            case "INCERTAIN":
                return <Warning />;
            default:
                return <Psychology />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case "AUTHENTIQUE":
                return "Image authentique";
            case "IA_DÉTECTÉE":
                return "IA détectée";
            case "INCERTAIN":
                return "Résultat incertain";
            default:
                return status;
        }
    };

    const getStatusDescription = (status) => {
        switch (status) {
            case "AUTHENTIQUE":
                return "Cette image semble être authentique et prise par un appareil photo réel.";
            case "IA_DÉTECTÉE":
                return "Cette image présente des caractéristiques typiques d'une génération par IA.";
            case "INCERTAIN":
                return "Il n'est pas possible de déterminer avec certitude l'origine de cette image.";
            default:
                return "Analyse en cours...";
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper
                elevation={0}
                sx={{
                    overflow: "hidden",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--slate-200)",
                    boxShadow: "var(--shadow-sm)",
                    bgcolor: "var(--surface-card)",
                }}
            >
                {/* Navy hero band with reversed brand logo */}
                <Box
                    sx={{
                        background: "var(--navy-600)",
                        color: "var(--text-on-brand)",
                        px: { xs: 3, md: 5 },
                        py: { xs: 4, md: 5 },
                        textAlign: "center",
                    }}
                >
                    <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                        <Logo white height={40} />
                    </Box>
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 64,
                            height: 64,
                            borderRadius: "var(--radius-full)",
                            bgcolor: "rgba(255,255,255,0.12)",
                            mb: 2,
                        }}
                    >
                        <Psychology sx={{ fontSize: 38, color: "#fff" }} />
                    </Box>
                    <Typography
                        variant="h4"
                        component="h1"
                        gutterBottom
                        sx={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            color: "#fff",
                        }}
                    >
                        Détection d'Images IA
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            color: "rgba(255,255,255,0.85)",
                            maxWidth: 680,
                            mx: "auto",
                        }}
                    >
                        Téléchargez une image pour détecter si elle a été
                        générée par intelligence artificielle ou si c'est un
                        deepfake. Notre système analyse les artefacts typiques
                        de la génération IA.
                    </Typography>
                </Box>

                <Box sx={{ p: { xs: 3, md: 4 } }}>
                    {/* Info Cards */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={4}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: "100%",
                                    borderRadius: "var(--radius-lg)",
                                    border: "1px solid var(--slate-200)",
                                    boxShadow: "var(--shadow-xs)",
                                }}
                            >
                                <CardContent sx={{ textAlign: "center" }}>
                                    <Security
                                        sx={{
                                            fontSize: 40,
                                            mb: 1,
                                            color: "var(--navy-600)",
                                        }}
                                    />
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            fontFamily: "var(--font-display)",
                                            fontWeight: 700,
                                            color: "var(--navy-900)",
                                        }}
                                    >
                                        Détection Avancée
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "var(--slate-500)" }}
                                    >
                                        Analyse des visages, textures, et artefacts
                                        de génération IA
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: "100%",
                                    borderRadius: "var(--radius-lg)",
                                    border: "1px solid var(--slate-200)",
                                    boxShadow: "var(--shadow-xs)",
                                }}
                            >
                                <CardContent sx={{ textAlign: "center" }}>
                                    <SmartToy
                                        sx={{
                                            fontSize: 40,
                                            mb: 1,
                                            color: "var(--navy-600)",
                                        }}
                                    />
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            fontFamily: "var(--font-display)",
                                            fontWeight: 700,
                                            color: "var(--navy-900)",
                                        }}
                                    >
                                        IA Spécialisée
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "var(--slate-500)" }}
                                    >
                                        Utilise des modèles d'IA avancés pour
                                        l'analyse d'images
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: "100%",
                                    borderRadius: "var(--radius-lg)",
                                    border: "1px solid var(--slate-200)",
                                    boxShadow: "var(--shadow-xs)",
                                }}
                            >
                                <CardContent sx={{ textAlign: "center" }}>
                                    <CheckCircle
                                        sx={{
                                            fontSize: 40,
                                            mb: 1,
                                            color: "var(--green-500)",
                                        }}
                                    />
                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            fontFamily: "var(--font-display)",
                                            fontWeight: 700,
                                            color: "var(--navy-900)",
                                        }}
                                    >
                                        Résultats Fiables
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "var(--slate-500)" }}
                                    >
                                        Analyse détaillée avec niveau de confiance
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Box component="form" onSubmit={handleSubmit}>
                        {/* Image Upload */}
                        <Box sx={{ mb: 3 }}>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUpload />}
                                fullWidth
                                size="large"
                                sx={{
                                    mb: 2,
                                    minHeight: 48,
                                    borderRadius: "var(--radius-md)",
                                    borderColor: "var(--navy-600)",
                                    color: "var(--navy-600)",
                                    fontWeight: 600,
                                    "&:hover": {
                                        borderColor: "var(--navy-700)",
                                        bgcolor: "var(--navy-50)",
                                    },
                                }}
                            >
                                Sélectionner une image à analyser
                                <VisuallyHiddenInput
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                            </Button>

                            {imagePreview && (
                                <Box sx={{ textAlign: "center", mb: 2 }}>
                                    <ImagePreview src={imagePreview} alt="Aperçu" />
                                    <Typography
                                        variant="caption"
                                        display="block"
                                        sx={{
                                            mt: 1,
                                            fontFamily: "var(--font-mono)",
                                            color: "var(--slate-500)",
                                        }}
                                    >
                                        {selectedImage?.name}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Error Alert */}
                        {error && (
                            <Alert
                                severity="error"
                                sx={{ mb: 3, borderRadius: "var(--radius-md)" }}
                            >
                                {error}
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={loading || !selectedImage}
                            sx={{
                                mb: 3,
                                minHeight: 48,
                                borderRadius: "var(--radius-md)",
                                fontWeight: 700,
                                bgcolor: "var(--green-500)",
                                color: "#fff",
                                boxShadow: "var(--shadow-sm)",
                                "&:hover": {
                                    bgcolor: "var(--green-600)",
                                    boxShadow: "var(--shadow-md)",
                                },
                            }}
                        >
                            {loading ? (
                                <>
                                    <CircularProgress
                                        size={20}
                                        sx={{ mr: 1, color: "#fff" }}
                                    />
                                    Détection en cours...
                                </>
                            ) : (
                                "Détecter l'IA"
                            )}
                        </Button>

                        {/* Results */}
                        {result && (
                            <Card
                                elevation={0}
                                sx={{
                                    mt: 3,
                                    borderRadius: "var(--radius-lg)",
                                    border: "1px solid var(--slate-200)",
                                    boxShadow: "var(--shadow-sm)",
                                }}
                            >
                                <CardContent>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: 2,
                                            mb: 2,
                                        }}
                                    >
                                        <VerdictBadge
                                            verdict={getVerdictKey(result.status)}
                                            variant="solid"
                                            size="lg"
                                            label={getStatusText(result.status)}
                                        />
                                    </Box>

                                    <ConfidenceMeter
                                        value={result.confidence || 0}
                                        verdict={getVerdictKey(result.status)}
                                        label="Confiance"
                                        style={{ marginBottom: 24 }}
                                    />

                                    <Alert
                                        severity={getStatusSeverity(result.status)}
                                        icon={getStatusIcon(result.status)}
                                        sx={{
                                            mb: 3,
                                            borderRadius: "var(--radius-md)",
                                        }}
                                    >
                                        {getStatusDescription(result.status)}
                                    </Alert>

                                    <Typography
                                        variant="h6"
                                        gutterBottom
                                        sx={{
                                            fontFamily: "var(--font-display)",
                                            fontWeight: 700,
                                            color: "var(--navy-900)",
                                        }}
                                    >
                                        Analyse détaillée:
                                    </Typography>

                                    <Box
                                        sx={{
                                            color: "var(--slate-800)",
                                            "& h1, & h2, & h3, & h4, & h5, & h6": {
                                                fontFamily: "var(--font-display)",
                                                fontSize: "1.1rem",
                                                fontWeight: "bold",
                                                color: "var(--navy-900)",
                                                margin: "16px 0 8px 0",
                                            },
                                            "& p": {
                                                margin: "8px 0",
                                            },
                                            "& ul, & ol": {
                                                paddingLeft: "20px",
                                                margin: "8px 0",
                                            },
                                            "& li": {
                                                margin: "4px 0",
                                            },
                                            "& strong": {
                                                fontWeight: "bold",
                                            },
                                            "& em": {
                                                fontStyle: "italic",
                                            },
                                        }}
                                    >
                                        {formatAnalysisText(result.explanation)}
                                    </Box>

                                    {result.details && (
                                        <Box
                                            sx={{
                                                mt: 2,
                                                p: 2,
                                                bgcolor: "var(--slate-50)",
                                                border: "1px solid var(--slate-100)",
                                                borderRadius: "var(--radius-md)",
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--slate-700)" }}
                                            >
                                                <strong>Type:</strong>{" "}
                                                {result.details.type_verification}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Typography
                                        variant="caption"
                                        sx={{
                                            mt: 2,
                                            display: "block",
                                            fontFamily: "var(--font-mono)",
                                            color: "var(--slate-500)",
                                        }}
                                    >
                                        Détection effectuée le{" "}
                                        {new Date(result.date).toLocaleString(
                                            "fr-FR"
                                        )}
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}

export default AIImageDetection;
