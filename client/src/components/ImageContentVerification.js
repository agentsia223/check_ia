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
    Chip,
    Grid,
    Fade,
    LinearProgress,
    Divider,
} from "@mui/material";
import {
    CloudUpload,
    CheckCircle,
    Cancel,
    Warning,
    HourglassEmpty,
    Info,
    PhotoCamera,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { supabase } from "../lib/supabase";
import { AuthContext } from "../utils/AuthContext";
import { API_BASE_URL } from "../config";

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
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    border: "1px solid rgba(0,0,0,0.1)",
});

const HeroSection = styled(Box)(({ theme }) => ({
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "20px",
    padding: theme.spacing(6, 4),
    textAlign: "center",
    marginBottom: theme.spacing(4),
    color: "white",
    position: "relative",
    overflow: "hidden",
    "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
    },
}));

const StyledCard = styled(Card)(({ theme }) => ({
    borderRadius: "16px",
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    transition: "all 0.3s ease",
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    },
}));

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

    const getStatusColor = (status) => {
        switch (status) {
            case "VRAIE":
                return "success";
            case "FAUSSE":
                return "error";
            case "INDÉTERMINÉE":
                return "warning";
            case "ANALYSÉE":
                return "info";
            default:
                return "default";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "VRAIE":
                return <CheckCircle />;
            case "FAUSSE":
                return <Cancel />;
            case "INDÉTERMINÉE":
                return <Warning />;
            case "ANALYSÉE":
                return <Info />;
            default:
                return <HourglassEmpty />;
        }
    };

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
                        <PhotoCamera sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                            Vérification d'Image
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: "auto" }}>
                            Analysez le contenu de vos images et vérifiez la véracité des affirmations
                        </Typography>
                    </Box>
                </HeroSection>

                <StyledCard>
                    <CardContent sx={{ p: 4, textAlign: "center" }}>
                        <Typography variant="h5" gutterBottom sx={{ color: "#0f172a", fontWeight: 600 }}>
                            Connexion requise
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            Veuillez vous connecter pour accéder à la vérification d'images.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            href="/login"
                            sx={{
                                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                                px: 4,
                                py: 1.5,
                                borderRadius: "12px",
                                fontWeight: 600,
                                textTransform: "none",
                                fontSize: "1.1rem",
                                "&:hover": {
                                    background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
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
                    <PhotoCamera sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                    <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
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
                                <Typography variant="h6" gutterBottom sx={{ color: "#0f172a", fontWeight: 600 }}>
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
                                        borderRadius: "12px",
                                        borderColor: "#e2e8f0",
                                        color: "#64748b",
                                        fontWeight: 500,
                                        textTransform: "none",
                                        "&:hover": {
                                            borderColor: "#2563eb",
                                            background: "rgba(37, 99, 235, 0.04)",
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
                                                color="text.secondary"
                                                sx={{ mt: 1, fontWeight: 500 }}
                                            >
                                                {selectedImage?.name}
                                            </Typography>
                                        </Box>
                                    </Fade>
                                )}
                            </Grid>

                            {/* Claim Text Section */}
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom sx={{ color: "#0f172a", fontWeight: 600 }}>
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
                                            borderRadius: "12px",
                                            background: "#f8fafc",
                                            "& fieldset": {
                                                borderColor: "#e2e8f0",
                                            },
                                            "&:hover fieldset": {
                                                borderColor: "#2563eb",
                                            },
                                        },
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                    Laissez vide pour une analyse générale de l'image
                                </Typography>
                            </Grid>
                        </Grid>

                        {/* Error Alert */}
                        {error && (
                            <Alert severity="error" sx={{ mt: 3, borderRadius: "12px" }}>
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
                                    background: loading 
                                        ? "linear-gradient(135deg, #64748b 0%, #475569 100%)"
                                        : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                                    px: 6,
                                    py: 1.5,
                                    borderRadius: "12px",
                                    fontWeight: 600,
                                    textTransform: "none",
                                    fontSize: "1.1rem",
                                    minWidth: 200,
                                    "&:hover": {
                                        background: loading 
                                            ? "linear-gradient(135deg, #64748b 0%, #475569 100%)"
                                            : "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                                        transform: loading ? "none" : "translateY(-2px)",
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
                            <HourglassEmpty sx={{ fontSize: 48, color: "#f59e0b", mb: 2 }} />
                            <Typography variant="h6" gutterBottom sx={{ color: "#0f172a", fontWeight: 600 }}>
                                Analyse de l'image en cours
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Veuillez patienter pendant que notre IA analyse le contenu de votre image...
                            </Typography>
                            <LinearProgress 
                                variant="indeterminate"
                                sx={{ 
                                    borderRadius: "4px", 
                                    height: "8px",
                                    background: "#f1f5f9",
                                    "& .MuiLinearProgress-bar": {
                                        background: "linear-gradient(90deg, #f59e0b, #d97706)",
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
                            <Typography variant="h5" gutterBottom sx={{ color: "#0f172a", fontWeight: 700 }}>
                                Résultat de la vérification
                            </Typography>
                            
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                                <Chip
                                    icon={getStatusIcon(result.status)}
                                    label={getStatusText(result.status)}
                                    color={getStatusColor(result.status)}
                                    sx={{ 
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                        px: 1,
                                        height: 40,
                                    }}
                                />
                                <Typography variant="body1" color="text.secondary">
                                    <strong>Confiance:</strong> {result.confidence}%
                                </Typography>
                            </Box>

                            <LinearProgress
                                variant="determinate"
                                value={result.confidence}
                                sx={{ 
                                    mb: 3,
                                    borderRadius: "4px", 
                                    height: "8px",
                                    background: "#f1f5f9",
                                    "& .MuiLinearProgress-bar": {
                                        background: result.status === "VRAIE" 
                                            ? "linear-gradient(90deg, #10b981, #059669)"
                                            : result.status === "FAUSSE"
                                            ? "linear-gradient(90deg, #ef4444, #dc2626)"
                                            : "linear-gradient(90deg, #f59e0b, #d97706)",
                                    }
                                }}
                            />

                            <Divider sx={{ mb: 3 }} />

                            <Typography variant="h6" gutterBottom sx={{ color: "#0f172a", fontWeight: 600 }}>
                                Analyse détaillée
                            </Typography>

                            {result.explanation && (
                                <Box sx={{ 
                                    p: 3, 
                                    background: "#f8fafc", 
                                    borderRadius: "12px",
                                    border: "1px solid #e2e8f0",
                                    mb: 3
                                }}>
                                    {formatAnalysisText(result.explanation)}
                                </Box>
                            )}

                            {result.details && Object.keys(result.details).length > 0 && (
                                <Box sx={{ 
                                    p: 3, 
                                    background: "#fefefe", 
                                    borderRadius: "12px",
                                    border: "1px solid #e2e8f0"
                                }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>Type de vérification:</strong> Contenu d'image
                                    </Typography>
                                    {claimText && (
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Affirmation vérifiée:</strong> {claimText}
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 3, display: "block", textAlign: "center" }}
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
