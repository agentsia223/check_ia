import React, { useState, useContext, useEffect } from "react";
import {
    Container,
    Typography,
    TextField,
    Button,
    Box,
    Alert,
    Card,
    CardContent,
    Grid,
    Fade,
    LinearProgress,
    Divider,
} from "@mui/material";
import {
    CloudUpload,
    HourglassEmpty,
    PhotoCamera,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../utils/AuthContext";
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
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-md)",
    border: "1px solid var(--border-subtle)",
});

const HeroSection = styled(Box)(({ theme }) => ({
    background: "var(--navy-600)",
    borderRadius: "var(--radius-lg)",
    padding: theme.spacing(6, 4),
    textAlign: "center",
    marginBottom: theme.spacing(4),
    color: "#ffffff",
    position: "relative",
    overflow: "hidden",
}));

const StyledCard = styled(Card)(() => ({
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    backgroundColor: "#ffffff",
    boxShadow: "var(--shadow-sm)",
    transition: "all 0.3s ease",
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "var(--shadow-md)",
    },
}));

// Map verification status to the brand verdict vocabulary.
const statusToVerdict = (status) => {
    switch (status) {
        case "VRAIE":
            return "true";
        case "FAUSSE":
            return "false";
        case "INDÉTERMINÉE":
            return "misleading";
        case "ANALYSÉE":
        default:
            return "unverified";
    }
};

function ImageContentVerification() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [claimText, setClaimText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [taskId, setTaskId] = useState(null);
    const [error, setError] = useState("");
    const { user } = useContext(AuthContext);

    // Function to format the analysis text
    const formatAnalysisText = (text) => {
        if (!text) return "";

        // Split text into lines and process each line
        const lines = text.split("\n");
        const formattedLines = [];

        for (let line of lines) {
            // Skip empty lines
            if (line.trim() === "") {
                formattedLines.push(<Typography key={Math.random()} variant="body1" />);
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
                formattedLines.push(<Typography key={Math.random()} variant="body1">{formatted}</Typography>);
            }
            // Handle bullet points
            else if (
                line.trim().startsWith("*") ||
                line.trim().startsWith("-")
            ) {
                formattedLines.push(
                    <Typography
                        key={Math.random()}
                        variant="body1"
                        sx={{ marginLeft: "20px", marginBottom: "4px" }}
                    >
                        • {line.trim().substring(1).trim()}
                    </Typography>
                );
            }
            // Regular lines
            else {
                formattedLines.push(<Typography key={Math.random()} variant="body1">{line}</Typography>);
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
        setTaskId(null);

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
            formData.append("claim_text", claimText);

            const response = await fetch(
                `${API_BASE_URL}verify-image-content/`,
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
                throw new Error(data.error || "Erreur lors de la vérification");
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
                err.message ||
                    "Une erreur s'est produite lors de la vérification"
            );
            setLoading(false);
        }
    };

    // Polling to check task status
    useEffect(() => {
        let interval;
        if (taskId && user) {
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
                            // This is the upload task - switch to polling the verification task
                            clearInterval(interval);
                            setTaskId(resultData.task_id); // This will trigger new polling for verification task
                            return;
                        }

                        // This is the verification task completion
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
                        setError(data.error || "Erreur lors de la vérification");
                    }
                    // If still PENDING, continue polling
                } catch (err) {
                    console.error("Erreur lors de la vérification du statut:", err);
                    setError("Erreur lors de la vérification du statut");
                    setLoading(false);
                    clearInterval(interval);
                }
            }, 2000); // Poll every 2 seconds
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [taskId, user]);

    const getStatusText = (status) => {
        switch (status) {
            case "VRAIE":
                return "Affirmation confirmée";
            case "FAUSSE":
                return "Affirmation contredite";
            case "INDÉTERMINÉE":
                return "Résultat indéterminé";
            case "ANALYSÉE":
                return "Image analysée";
            default:
                return status;
        }
    };

    // Authentication guard
    if (!user) {
        return (
            <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
                <HeroSection>
                    <Box sx={{ position: "relative", zIndex: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                            <Logo white height={44} />
                        </Box>
                        <PhotoCamera sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                        <Typography
                            variant="h3"
                            component="h1"
                            gutterBottom
                            sx={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                        >
                            Vérification d'Image
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: "auto" }}>
                            Analysez le contenu de vos images et vérifiez la véracité des affirmations
                        </Typography>
                    </Box>
                </HeroSection>

                <StyledCard>
                    <CardContent sx={{ p: 4, textAlign: "center" }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ fontFamily: "var(--font-display)", color: "var(--navy-900)", fontWeight: 600 }}
                        >
                            Connexion requise
                        </Typography>
                        <Typography variant="body1" sx={{ color: "var(--slate-500)", mb: 3 }}>
                            Veuillez vous connecter pour accéder à la vérification d'images.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            href="/login"
                            sx={{
                                bgcolor: "var(--navy-600)",
                                color: "#ffffff",
                                px: 4,
                                py: 1.5,
                                minHeight: 48,
                                borderRadius: "var(--radius-md)",
                                fontWeight: 600,
                                textTransform: "none",
                                fontSize: "1.1rem",
                                boxShadow: "var(--shadow-sm)",
                                "&:hover": {
                                    bgcolor: "var(--navy-700)",
                                    boxShadow: "var(--shadow-md)",
                                    transform: "translateY(-2px)",
                                },
                            }}
                        >
                            Se connecter
                        </Button>
                    </CardContent>
                </StyledCard>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}>
            {/* Hero Section */}
            <HeroSection>
                <Box sx={{ position: "relative", zIndex: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                        <Logo white height={44} />
                    </Box>
                    <PhotoCamera sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                    <Typography
                        variant="h3"
                        component="h1"
                        gutterBottom
                        sx={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
                    >
                        Vérification d'Image
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: "auto" }}>
                        Téléchargez une image et optionnellement une affirmation à vérifier.
                        Notre IA analysera le contenu et déterminera la véracité.
                    </Typography>
                </Box>
            </HeroSection>

            {/* Main Form */}
            <StyledCard>
                <CardContent sx={{ p: 4 }}>
                    <Box component="form" onSubmit={handleSubmit}>
                        <Grid container spacing={4}>
                            {/* Image Upload Section */}
                            <Grid item xs={12} md={6}>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{ fontFamily: "var(--font-display)", color: "var(--navy-900)", fontWeight: 600 }}
                                >
                                    Sélectionner une image
                                </Typography>

                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<CloudUpload />}
                                    fullWidth
                                    size="large"
                                    sx={{
                                        py: 2,
                                        minHeight: 48,
                                        borderRadius: "var(--radius-md)",
                                        borderColor: "var(--border-subtle)",
                                        color: "var(--slate-500)",
                                        fontWeight: 500,
                                        textTransform: "none",
                                        "&:hover": {
                                            borderColor: "var(--navy-600)",
                                            background: "rgba(40, 52, 138, 0.04)",
                                        },
                                    }}
                                >
                                    Choisir un fichier image
                                    <VisuallyHiddenInput
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                    />
                                </Button>

                                {imagePreview && (
                                    <Fade in timeout={300}>
                                        <Box sx={{ mt: 3, textAlign: "center" }}>
                                            <ImagePreview src={imagePreview} alt="Aperçu" />
                                            <Typography
                                                variant="body2"
                                                sx={{ mt: 1, fontWeight: 500, color: "var(--slate-500)" }}
                                            >
                                                {selectedImage?.name}
                                            </Typography>
                                        </Box>
                                    </Fade>
                                )}
                            </Grid>

                            {/* Claim Text Section */}
                            <Grid item xs={12} md={6}>
                                <Typography
                                    variant="h6"
                                    gutterBottom
                                    sx={{ fontFamily: "var(--font-display)", color: "var(--navy-900)", fontWeight: 600 }}
                                >
                                    Affirmation à vérifier
                                </Typography>

                                <TextField
                                    fullWidth
                                    multiline
                                    rows={6}
                                    placeholder="Ex: Cette image montre le président français lors de sa visite officielle..."
                                    value={claimText}
                                    onChange={(e) => setClaimText(e.target.value)}
                                    variant="outlined"
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: "var(--radius-md)",
                                            background: "var(--slate-50)",
                                            "& fieldset": {
                                                borderColor: "var(--border-subtle)",
                                            },
                                            "&:hover fieldset": {
                                                borderColor: "var(--navy-600)",
                                            },
                                            "&.Mui-focused fieldset": {
                                                borderColor: "var(--navy-600)",
                                            },
                                        },
                                    }}
                                />
                                <Typography variant="caption" sx={{ mt: 1, display: "block", color: "var(--slate-500)" }}>
                                    Laissez vide pour une analyse générale de l'image
                                </Typography>
                            </Grid>
                        </Grid>

                        {/* Error Alert */}
                        {error && (
                            <Alert severity="error" sx={{ mt: 3, borderRadius: "var(--radius-md)" }}>
                                {error}
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Box sx={{ mt: 4, textAlign: "center" }}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={loading || !selectedImage}
                                sx={{
                                    bgcolor: loading ? "var(--slate-500)" : "var(--green-500)",
                                    color: "#ffffff",
                                    px: 6,
                                    py: 1.5,
                                    minHeight: 48,
                                    borderRadius: "var(--radius-md)",
                                    fontWeight: 600,
                                    textTransform: "none",
                                    fontSize: "1.1rem",
                                    minWidth: 200,
                                    boxShadow: "var(--shadow-sm)",
                                    "&:hover": {
                                        bgcolor: loading ? "var(--slate-500)" : "var(--green-600)",
                                        boxShadow: loading ? "var(--shadow-sm)" : "var(--shadow-md)",
                                        transform: loading ? "none" : "translateY(-2px)",
                                    },
                                    "&.Mui-disabled": {
                                        bgcolor: "var(--slate-300)",
                                        color: "#ffffff",
                                    },
                                }}
                            >
                                {loading ? "Vérification en cours..." : "Vérifier l'image"}
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </StyledCard>

            {/* Loading State */}
            {loading && (
                <Fade in>
                    <StyledCard sx={{ mt: 4 }}>
                        <CardContent sx={{ p: 4, textAlign: "center" }}>
                            <HourglassEmpty sx={{ fontSize: 48, color: "var(--navy-600)", mb: 2 }} />
                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{ fontFamily: "var(--font-display)", color: "var(--navy-900)", fontWeight: 600 }}
                            >
                                Analyse de l'image en cours
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 3, color: "var(--slate-500)" }}>
                                Veuillez patienter pendant que notre IA analyse le contenu de votre image...
                            </Typography>
                            <LinearProgress
                                variant="indeterminate"
                                sx={{
                                    borderRadius: "var(--radius-pill)",
                                    height: "8px",
                                    background: "var(--slate-100)",
                                    "& .MuiLinearProgress-bar": {
                                        background: "var(--navy-600)",
                                    }
                                }}
                            />
                        </CardContent>
                    </StyledCard>
                </Fade>
            )}

            {/* Results */}
            {result && (
                <Fade in timeout={500}>
                    <StyledCard sx={{ mt: 4 }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography
                                variant="h5"
                                gutterBottom
                                sx={{ fontFamily: "var(--font-display)", color: "var(--navy-900)", fontWeight: 700 }}
                            >
                                Résultat de la vérification
                            </Typography>

                            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
                                <VerdictBadge
                                    verdict={statusToVerdict(result.status)}
                                    variant="soft"
                                    size="lg"
                                    label={getStatusText(result.status)}
                                />
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <ConfidenceMeter
                                    value={result.confidence}
                                    verdict={statusToVerdict(result.status)}
                                    label="Confiance"
                                />
                            </Box>

                            <Divider sx={{ mb: 3, borderColor: "var(--border-subtle)" }} />

                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{ fontFamily: "var(--font-display)", color: "var(--navy-900)", fontWeight: 600 }}
                            >
                                Analyse détaillée
                            </Typography>

                            {result.explanation && (
                                <Box sx={{
                                    p: 3,
                                    background: "var(--slate-50)",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border-subtle)",
                                    mb: 3
                                }}>
                                    {formatAnalysisText(result.explanation)}
                                </Box>
                            )}

                            {result.details && Object.keys(result.details).length > 0 && (
                                <Box sx={{
                                    p: 3,
                                    background: "#ffffff",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border-subtle)"
                                }}>
                                    <Typography variant="body2" gutterBottom sx={{ color: "var(--slate-500)" }}>
                                        <strong>Type de vérification:</strong> Contenu d'image
                                    </Typography>
                                    {claimText && (
                                        <Typography variant="body2" sx={{ color: "var(--slate-500)" }}>
                                            <strong>Affirmation vérifiée:</strong>{" "}
                                            <Box component="span" sx={{ fontFamily: "var(--font-mono)" }}>
                                                {claimText}
                                            </Box>
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            <Typography
                                variant="caption"
                                sx={{ mt: 3, display: "block", textAlign: "center", color: "var(--slate-500)", fontFamily: "var(--font-mono)" }}
                            >
                                Vérification effectuée le {new Date(result.date).toLocaleString("fr-FR")}
                            </Typography>
                        </CardContent>
                    </StyledCard>
                </Fade>
            )}
        </Container>
    );
}

export default ImageContentVerification;
