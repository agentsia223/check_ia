import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
    LinearProgress,
    Fade,
    Paper,
    Link,
} from "@mui/material";
import {
    FactCheck,
    Verified,
    Warning,
    HourglassEmpty,
    OpenInNew,
    Search,
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";

// Fallback responses si aucune explication détaillée n'est disponible
const fallbackResponses = {
    vérifié: "Cette information a été vérifiée et est considérée comme fiable selon nos analyses approfondies.",
    rejeté: "Cette information a été identifiée comme potentiellement fausse ou trompeuse après vérification.",
    "en cours": "Vérification en cours, notre IA analyse les sources disponibles...",
};

function SubmitFact() {
    const [texte, setTexte] = useState("");
    const [source, setSource] = useState("");
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submissionId, setSubmissionId] = useState(null);
    const [webSources, setWebSources] = useState([]);
    const [detailedResult, setDetailedResult] = useState("");
    const { getAccessToken, isLoggedIn } = useContext(AuthContext);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!isLoggedIn) {
            toast.error(
                "Vous devez être connecté pour soumettre une information."
            );
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
                { texte, source },
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

    // Polling pour vérifier le statut
    useEffect(() => {
        let interval;
        if (submissionId && isLoggedIn) {
            interval = setInterval(() => {
                const accessToken = getAccessToken();
                axios
                    .get(`${API_BASE_URL}submissions/${submissionId}/`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    })
                    .then((response) => {
                        setStatus(response.data.statut);
                        setWebSources(response.data.web_sources || []);
                        setDetailedResult(response.data.detailed_result || "");

                        if (response.data.statut !== "en cours") {
                            clearInterval(interval);
                            setLoading(false);
                        }
                    })
                    .catch((error) => {
                        console.error(
                            "Erreur lors de la vérification du statut :",
                            error
                        );
                        setLoading(false);
                        toast.error(
                            "Une erreur est survenue lors de la vérification du statut."
                        );
                    });
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [submissionId, isLoggedIn, getAccessToken]);

    // Updated handleChange for Texte
    const handleTexteChange = (e) => {
        setTexte(e.target.value);
        if (status) {
            setStatus(null);
            setWebSources([]);
            setDetailedResult("");
        }
    };

    // Function to get the display text for the result
    const getResultText = () => {
        if (detailedResult && detailedResult.trim()) {
            return detailedResult;
        }
        return fallbackResponses[status] || "Statut inconnu";
    };

    // Get status configuration
    const getStatusConfig = () => {
        switch (status) {
            case "vérifié":
                return {
                    color: "#10b981",
                    bgcolor: "#f0fdf4",
                    icon: <Verified sx={{ fontSize: 48, color: "#10b981" }} />,
                    title: "Information Vérifiée",
                    chip: "Fiable",
                };
            case "rejeté":
                return {
                    color: "#ef4444",
                    bgcolor: "#fef2f2",
                    icon: <Warning sx={{ fontSize: 48, color: "#ef4444" }} />,
                    title: "Information Douteuse",
                    chip: "Non Fiable",
                };
            default:
                return {
                    color: "#f59e0b",
                    bgcolor: "#fefbeb",
                    icon: <HourglassEmpty sx={{ fontSize: 48, color: "#f59e0b" }} />,
                    title: "Vérification en Cours",
                    chip: "En Analyse",
                };
        }
    };

    if (!isLoggedIn) {
        return (
            <Box sx={{ minHeight: "80vh", bgcolor: "#f8fafc" }}>
                <Container maxWidth="xl" sx={{ py: 8, px: { xs: 2, sm: 4, md: 6 } }}>
                    <Grid container justifyContent="center">
                        <Grid item xs={12} md={8} lg={6}>
                            <Paper 
                                elevation={0} 
                                sx={{ 
                                    p: 6, 
                                    textAlign: "center",
                                    borderRadius: 3,
                                    border: "1px solid #e2e8f0"
                                }}
                            >
                                <FactCheck sx={{ fontSize: 64, color: "#64748b", mb: 2 }} />
                                <Typography
                                    variant="h4"
                                    component="h1"
                                    sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}
                                >
                                    Accès Requis
                                </Typography>
                                <Typography variant="body1" sx={{ color: "#64748b", fontSize: "1.1rem" }}>
                                    Vous devez être connecté pour utiliser notre outil de vérification d'informations.
                                </Typography>
                                <Button
                                    variant="contained"
                                    href="/login"
                                    sx={{
                                        mt: 3,
                                        px: 4,
                                        py: 1.5,
                                        fontSize: "1.1rem",
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        background: "linear-gradient(45deg, #2563eb, #3b82f6)",
                                        "&:hover": {
                                            background: "linear-gradient(45deg, #1d4ed8, #2563eb)",
                                        }
                                    }}
                                >
                                    Se Connecter
                                </Button>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: "80vh", bgcolor: "#f8fafc" }}>
            <ToastContainer />
            
            {/* Hero Section */}
            <Box sx={{ bgcolor: "white", borderBottom: "1px solid #e2e8f0" }}>
                <Container maxWidth="xl" sx={{ py: 6, px: { xs: 2, sm: 4, md: 6 } }}>
                    <Box sx={{ textAlign: "center", maxWidth: 800, mx: "auto" }}>
                        <FactCheck sx={{ fontSize: 64, color: "#2563eb", mb: 2 }} />
                        <Typography
                            variant="h2"
                            component="h1"
                            sx={{
                                fontWeight: 800,
                                color: "#0f172a",
                                mb: 2,
                                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" }
                            }}
                        >
                            Vérifier une Information
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                color: "#64748b",
                                fontWeight: 400,
                                lineHeight: 1.6,
                                maxWidth: 600,
                                mx: "auto"
                            }}
                        >
                            Soumettez n'importe quelle information et notre IA analysera sa fiabilité en temps réel
                        </Typography>
                    </Box>
                </Container>
            </Box>

            {/* Main Content */}
            <Container maxWidth="xl" sx={{ py: 6, px: { xs: 2, sm: 4, md: 6 } }}>
                <Grid container spacing={4} justifyContent="center">
                    <Grid item xs={12} lg={8}>
                        {/* Submission Form */}
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 6, 
                                borderRadius: 3, 
                                border: "1px solid #e2e8f0",
                                mb: 4
                            }}
                        >
                            <form onSubmit={handleSubmit}>
                                <Box sx={{ mb: 4 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{ fontWeight: 600, color: "#0f172a", mb: 2 }}
                                    >
                                        Information à vérifier
                                    </Typography>
                                    <TextField
                                        label="Saisissez le texte, l'affirmation ou la déclaration à vérifier"
                                        multiline
                                        rows={4}
                                        value={texte}
                                        onChange={handleTexteChange}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: 2,
                                                backgroundColor: "#f8fafc",
                                                "& fieldset": {
                                                    borderColor: "#e2e8f0",
                                                },
                                                "&:hover fieldset": {
                                                    borderColor: "#cbd5e1",
                                                },
                                                "&.Mui-focused fieldset": {
                                                    borderColor: "#2563eb",
                                                }
                                            }
                                        }}
                                    />
                                </Box>

                                <Box sx={{ mb: 4 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{ fontWeight: 600, color: "#0f172a", mb: 2 }}
                                    >
                                        Source (optionnel)
                                    </Typography>
                                    <TextField
                                        label="URL de la source où vous avez trouvé cette information"
                                        type="url"
                                        value={source}
                                        onChange={(e) => setSource(e.target.value)}
                                        fullWidth
                                        variant="outlined"
                                        placeholder="https://exemple.com/article"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: 2,
                                                backgroundColor: "#f8fafc",
                                                "& fieldset": {
                                                    borderColor: "#e2e8f0",
                                                },
                                                "&:hover fieldset": {
                                                    borderColor: "#cbd5e1",
                                                },
                                                "&.Mui-focused fieldset": {
                                                    borderColor: "#2563eb",
                                                }
                                            }
                                        }}
                                    />
                                </Box>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    type="submit"
                                    size="large"
                                    disabled={loading || !texte.trim()}
                                    startIcon={<Search />}
                                    sx={{
                                        py: 1.5,
                                        px: 4,
                                        fontSize: "1.1rem",
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        background: "linear-gradient(45deg, #2563eb, #3b82f6)",
                                        "&:hover": {
                                            background: "linear-gradient(45deg, #1d4ed8, #2563eb)",
                                        },
                                        "&:disabled": {
                                            background: "#94a3b8",
                                        }
                                    }}
                                >
                                    {loading ? "Vérification en cours..." : "Lancer la Vérification"}
                                </Button>
                            </form>
                        </Paper>

                        {/* Loading State */}
                        {loading && (
                            <Fade in={loading}>
                                <Paper 
                                    elevation={0} 
                                    sx={{ 
                                        p: 4, 
                                        borderRadius: 3, 
                                        border: "1px solid #e2e8f0",
                                        textAlign: "center",
                                        mb: 4
                                    }}
                                >
                                    <HourglassEmpty sx={{ fontSize: 48, color: "#f59e0b", mb: 2 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 600, color: "#0f172a", mb: 2 }}>
                                        Analyse en cours...
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: "#64748b", mb: 3 }}>
                                        Notre IA recherche et analyse les sources disponibles
                                    </Typography>
                                    <LinearProgress 
                                        sx={{ 
                                            borderRadius: 1,
                                            height: 8,
                                            "& .MuiLinearProgress-bar": {
                                                borderRadius: 1,
                                            }
                                        }} 
                                    />
                                </Paper>
                            </Fade>
                        )}

                        {/* Results */}
                        {status && !loading && (
                            <Fade in={!loading}>
                                <Paper 
                                    elevation={0} 
                                    sx={{ 
                                        p: 6, 
                                        borderRadius: 3, 
                                        border: `2px solid ${getStatusConfig().color}`,
                                        bgcolor: getStatusConfig().bgcolor,
                                        mb: 4
                                    }}
                                >
                                    <Box sx={{ textAlign: "center", mb: 4 }}>
                                        {getStatusConfig().icon}
                                        <Typography
                                            variant="h4"
                                            sx={{ 
                                                fontWeight: 700, 
                                                color: getStatusConfig().color, 
                                                mt: 2, 
                                                mb: 1 
                                            }}
                                        >
                                            {getStatusConfig().title}
                                        </Typography>
                                        <Chip
                                            label={getStatusConfig().chip}
                                            sx={{
                                                bgcolor: getStatusConfig().color,
                                                color: "white",
                                                fontWeight: 600,
                                                px: 2
                                            }}
                                        />
                                    </Box>
                                    
                                    <Alert 
                                        severity={status === "vérifié" ? "success" : status === "rejeté" ? "error" : "warning"}
                                        sx={{ 
                                            fontSize: "1.1rem",
                                            "& .MuiAlert-message": {
                                                width: "100%"
                                            }
                                        }}
                                    >
                                        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                                            {getResultText()}
                                        </Typography>
                                    </Alert>
                                </Paper>
                            </Fade>
                        )}

                        {/* Sources Section */}
                        {status && !loading && webSources.length > 0 && (
                            <Fade in={!loading}>
                                <Paper 
                                    elevation={0} 
                                    sx={{ 
                                        p: 6, 
                                        borderRadius: 3, 
                                        border: "1px solid #e2e8f0" 
                                    }}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{ 
                                            fontWeight: 700, 
                                            color: "#0f172a", 
                                            mb: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1
                                        }}
                                    >
                                        <Search sx={{ color: "#2563eb" }} />
                                        Sources Analysées
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ color: "#64748b", mb: 4 }}
                                    >
                                        Notre IA s'est basée sur les sources suivantes pour sa vérification :
                                    </Typography>
                                    
                                    <Grid container spacing={3}>
                                        {webSources.map((source, index) => (
                                            <Grid item xs={12} key={index}>
                                                <Card
                                                    elevation={0}
                                                    sx={{ 
                                                        border: "1px solid #e2e8f0",
                                                        borderRadius: 2,
                                                        transition: "all 0.2s ease",
                                                        "&:hover": {
                                                            borderColor: "#2563eb",
                                                            transform: "translateY(-2px)",
                                                            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.1)"
                                                        }
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 3 }}>
                                                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                                                            <OpenInNew sx={{ color: "#2563eb", mt: 0.5 }} />
                                                            <Box sx={{ flex: 1 }}>
                                                                <Link
                                                                    href={source.link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    sx={{
                                                                        textDecoration: "none",
                                                                        color: "#2563eb",
                                                                        fontWeight: 600,
                                                                        fontSize: "1.1rem",
                                                                        "&:hover": {
                                                                            textDecoration: "underline"
                                                                        }
                                                                    }}
                                                                >
                                                                    {source.title}
                                                                </Link>
                                                                {source.date && (
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            display: "block",
                                                                            color: "#64748b",
                                                                            mt: 1,
                                                                            fontSize: "0.9rem"
                                                                        }}
                                                                    >
                                                                        Publié le : {source.date}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Paper>
                            </Fade>
                        )}
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}

export default SubmitFact;
