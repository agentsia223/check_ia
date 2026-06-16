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
    Grid,
    LinearProgress,
    Fade,
    Paper,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import {
    FactCheck,
    Verified,
    Warning,
    HourglassEmpty,
    Search,
    Keyboard,
    Mic,
    Translate,
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";
import Logo from "./brand/Logo";
import VerdictBadge from "./brand/VerdictBadge";
import SourceCard from "./brand/SourceCard";
import BambaraVoiceVerify from "./BambaraVoiceVerify";
import { useBambaraVoiceVerify } from "../hooks/useBambaraVoiceVerify";

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
    const [claimLanguage, setClaimLanguage] = useState("fr");
    const [bambaraInput, setBambaraInput] = useState("voice");
    const [bambaraText, setBambaraText] = useState("");
    const [translatedFromBambara, setTranslatedFromBambara] = useState(false);
    const [translating, setTranslating] = useState(false);
    const { getAccessToken, isLoggedIn } = useContext(AuthContext);

    const submitForVerification = (text) => {
        if (!isLoggedIn) {
            toast.error(
                "Vous devez être connecté pour soumettre une information."
            );
            return;
        }
        if (loading) {
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

    const resetResultState = () => {
        if (status) {
            setStatus(null);
            setWebSources([]);
            setDetailedResult("");
        }
    };

    // Shared look for the segmented (toggle) controls.
    const segmentedSx = {
        display: "inline-flex",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--slate-200)",
        backgroundColor: "var(--slate-50)",
        p: "4px",
        "& .MuiToggleButtonGroup-grouped": {
            border: 0,
            borderRadius: "var(--radius-sm) !important",
            px: 2.5,
            py: 0.75,
            gap: 1,
            textTransform: "none",
            fontWeight: 600,
            color: "var(--slate-600)",
            "&.Mui-selected": {
                backgroundColor: "#fff",
                color: "var(--navy-700)",
                boxShadow: "var(--shadow-xs)",
                "&:hover": { backgroundColor: "#fff" },
            },
        },
    };

    const handleLanguageChange = (e, lang) => {
        if (!lang) return;
        setClaimLanguage(lang);
        if (lang === "fr") {
            // French journey: the claim box holds the user's own French.
            setTranslatedFromBambara(false);
        }
    };

    const translateBambaraText = async () => {
        const bmText = bambaraText.trim();
        if (!bmText) return;

        setTranslating(true);
        try {
            const accessToken = getAccessToken();
            const response = await axios.post(
                `${API_BASE_URL}bambara/translate/`,
                { text: bmText, source_lang: "bm", target_lang: "fr" },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            setTexte(response.data.translated_text || bmText);
            setTranslatedFromBambara(true);
            resetResultState();
            toast.success("Traduit en français. Corrigez si besoin, puis vérifiez.");
        } catch (error) {
            console.error("Erreur lors de la traduction Bambara :", error);
            toast.error("Impossible de traduire ce texte. Veuillez réessayer.");
        } finally {
            setTranslating(false);
        }
    };

    const voice = useBambaraVoiceVerify({
        getAccessToken,
        isLoggedIn,
        enabled: claimLanguage === "bm" && bambaraInput === "voice",
        onText: (frenchText) => {
            setTexte(frenchText);
            setTranslatedFromBambara(true);
            resetResultState();
        },
    });

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
                    verdict: "true",
                    color: "var(--green-600)",
                    bgcolor: "var(--green-50)",
                    border: "var(--green-200)",
                    severity: "success",
                    icon: <Verified sx={{ fontSize: 48, color: "var(--green-500)" }} />,
                    title: "Information Vérifiée",
                    chip: "Fiable",
                };
            case "rejeté":
                return {
                    verdict: "false",
                    color: "var(--red-700)",
                    bgcolor: "var(--red-50)",
                    border: "var(--red-200)",
                    severity: "error",
                    icon: <Warning sx={{ fontSize: 48, color: "var(--red-600)" }} />,
                    title: "Information Douteuse",
                    chip: "Non Fiable",
                };
            default:
                return {
                    verdict: "unverified",
                    color: "var(--amber-700)",
                    bgcolor: "var(--amber-50)",
                    border: "var(--amber-200)",
                    severity: "warning",
                    icon: <HourglassEmpty sx={{ fontSize: 48, color: "var(--amber-500)" }} />,
                    title: "Vérification en Cours",
                    chip: "En Analyse",
                };
        }
    };

    if (!isLoggedIn) {
        return (
            <Box sx={{ minHeight: "80vh", bgcolor: "var(--slate-50)" }}>
                <Container maxWidth="xl" sx={{ py: 8, px: { xs: 2, sm: 4, md: 6 } }}>
                    <Grid container justifyContent="center">
                        <Grid item xs={12} md={8} lg={6}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 6,
                                    textAlign: "center",
                                    borderRadius: "var(--radius-lg)",
                                    border: "1px solid var(--slate-200)",
                                    boxShadow: "var(--shadow-sm)",
                                    bgcolor: "#fff",
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 84,
                                        height: 84,
                                        mx: "auto",
                                        mb: 3,
                                        borderRadius: "var(--radius-lg)",
                                        bgcolor: "var(--navy-50)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <FactCheck sx={{ fontSize: 48, color: "var(--navy-600)" }} />
                                </Box>
                                <Typography
                                    variant="h4"
                                    component="h1"
                                    sx={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--navy-900)", mb: 2 }}
                                >
                                    Accès Requis
                                </Typography>
                                <Typography variant="body1" sx={{ color: "var(--slate-500)", fontSize: "1.1rem" }}>
                                    Vous devez être connecté pour utiliser notre outil de vérification d'informations.
                                </Typography>
                                <Button
                                    variant="contained"
                                    href="/login"
                                    sx={{
                                        mt: 3,
                                        px: 4,
                                        py: 1.5,
                                        minHeight: 48,
                                        fontSize: "1.1rem",
                                        fontWeight: 600,
                                        borderRadius: "var(--radius-md)",
                                        boxShadow: "var(--shadow-sm)",
                                        bgcolor: "var(--navy-600)",
                                        "&:hover": {
                                            bgcolor: "var(--navy-700)",
                                            boxShadow: "var(--shadow-md)",
                                        },
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
        <Box sx={{ minHeight: "80vh", bgcolor: "var(--slate-50)" }}>
            <ToastContainer />

            {/* Hero Section */}
            <Box sx={{ bgcolor: "var(--navy-600)" }}>
                <Container maxWidth="xl" sx={{ py: 7, px: { xs: 2, sm: 4, md: 6 } }}>
                    <Box sx={{ textAlign: "center", maxWidth: 800, mx: "auto" }}>
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                            <Logo white height={44} />
                        </Box>
                        <Typography
                            variant="h2"
                            component="h1"
                            sx={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                                color: "#fff",
                                mb: 2,
                                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" }
                            }}
                        >
                            Vérifier une Information
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                color: "rgba(255, 255, 255, 0.82)",
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
                                borderRadius: "var(--radius-lg)",
                                border: "1px solid var(--slate-200)",
                                boxShadow: "var(--shadow-sm)",
                                bgcolor: "#fff",
                                mb: 4
                            }}
                        >
                            <form onSubmit={handleSubmit}>
                                <Box sx={{ mb: 4 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--navy-900)", mb: 0.5 }}
                                    >
                                        Information à vérifier
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "var(--slate-600)", mb: 2 }}>
                                        Choisissez la langue de votre affirmation, puis saisissez-la (ou dictez-la en bambara).
                                    </Typography>

                                    {/* Langue de l'affirmation (le parcours) */}
                                    <ToggleButtonGroup
                                        value={claimLanguage}
                                        exclusive
                                        onChange={handleLanguageChange}
                                        aria-label="Langue de l'affirmation"
                                        sx={{ mb: 3, ...segmentedSx }}
                                    >
                                        <ToggleButton value="fr" aria-label="Français">
                                            Français
                                        </ToggleButton>
                                        <ToggleButton value="bm" aria-label="Bambara">
                                            Bambara
                                        </ToggleButton>
                                    </ToggleButtonGroup>

                                    {claimLanguage === "bm" && (
                                        <Box sx={{ mb: 3 }}>
                                            <ToggleButtonGroup
                                                value={bambaraInput}
                                                exclusive
                                                onChange={(e, mode) => mode && setBambaraInput(mode)}
                                                aria-label="Mode de saisie en bambara"
                                                sx={{ mb: 2, ...segmentedSx }}
                                            >
                                                <ToggleButton value="voice" aria-label="Parler">
                                                    <Mic sx={{ fontSize: 18 }} /> Parler
                                                </ToggleButton>
                                                <ToggleButton value="text" aria-label="Écrire">
                                                    <Keyboard sx={{ fontSize: 18 }} /> Écrire
                                                </ToggleButton>
                                            </ToggleButtonGroup>

                                            {bambaraInput === "voice" && (
                                                <BambaraVoiceVerify
                                                    phase={voice.phase}
                                                    transcript={voice.transcript}
                                                    isTouch={voice.isTouch}
                                                    loading={loading}
                                                    onToggle={voice.toggle}
                                                    onStart={voice.start}
                                                    onStop={voice.stop}
                                                />
                                            )}

                                            {bambaraInput === "text" && (
                                                <Box>
                                                    <Typography
                                                        component="label"
                                                        htmlFor="bambara-input"
                                                        sx={{ display: "block", fontWeight: 600, color: "var(--navy-900)", mb: 1 }}
                                                    >
                                                        Votre affirmation en bambara
                                                    </Typography>
                                                    <TextField
                                                        id="bambara-input"
                                                        placeholder="Sɛbɛn i ka kuma bamanankan na…"
                                                        multiline
                                                        rows={3}
                                                        value={bambaraText}
                                                        onChange={(e) => setBambaraText(e.target.value)}
                                                        fullWidth
                                                        variant="outlined"
                                                        sx={{
                                                            "& .MuiOutlinedInput-root": {
                                                                borderRadius: "var(--radius-md)",
                                                                backgroundColor: "var(--slate-50)",
                                                                "& fieldset": { borderColor: "var(--slate-200)" },
                                                                "&:hover fieldset": { borderColor: "var(--slate-300)" },
                                                                "&.Mui-focused fieldset": { borderColor: "var(--navy-600)" },
                                                            },
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={translateBambaraText}
                                                        disabled={translating || !bambaraText.trim()}
                                                        startIcon={<Translate />}
                                                        sx={{
                                                            mt: 1.5,
                                                            textTransform: "none",
                                                            fontWeight: 700,
                                                            color: "var(--navy-700)",
                                                            borderRadius: "var(--radius-md)",
                                                            border: "1px solid var(--slate-200)",
                                                            px: 2,
                                                            "&:hover": { backgroundColor: "var(--navy-50)" },
                                                        }}
                                                    >
                                                        {translating ? "Traduction…" : "Traduire en français"}
                                                    </Button>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    <Typography
                                        component="label"
                                        htmlFor="claim-input"
                                        sx={{ display: "block", fontWeight: 600, color: "var(--navy-900)", mb: translatedFromBambara ? 0.5 : 1 }}
                                    >
                                        {claimLanguage === "bm"
                                            ? "Affirmation à vérifier (en français)"
                                            : "Affirmation à vérifier"}
                                    </Typography>
                                    {translatedFromBambara && (
                                        <Typography
                                            variant="body2"
                                            sx={{ mb: 1, color: "var(--slate-500)", display: "flex", alignItems: "center", gap: 0.75 }}
                                        >
                                            <Translate sx={{ fontSize: 16, color: "var(--slate-400)" }} />
                                            Traduit du bambara — corrigez le texte si besoin avant de vérifier.
                                        </Typography>
                                    )}
                                    <TextField
                                        id="claim-input"
                                        placeholder="Exemple : Le gouvernement a annoncé une nouvelle mesure sur..."
                                        multiline
                                        rows={4}
                                        value={texte}
                                        onChange={handleTexteChange}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "var(--radius-md)",
                                                backgroundColor: "var(--slate-50)",
                                                "& fieldset": {
                                                    borderColor: "var(--slate-200)",
                                                },
                                                "&:hover fieldset": {
                                                    borderColor: "var(--slate-300)",
                                                },
                                                "&.Mui-focused fieldset": {
                                                    borderColor: "var(--navy-600)",
                                                }
                                            },
                                        }}
                                    />
                                </Box>

                                <Box sx={{ mb: 4 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--navy-900)", mb: 2 }}
                                    >
                                        Source (optionnel)
                                    </Typography>
                                    <TextField
                                        type="url"
                                        value={source}
                                        onChange={(e) => setSource(e.target.value)}
                                        fullWidth
                                        variant="outlined"
                                        placeholder="Collez le lien de la source, si vous en avez une"
                                        inputProps={{ "aria-label": "Source (optionnel)" }}
                                        sx={{
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: "var(--radius-md)",
                                                backgroundColor: "var(--slate-50)",
                                                fontFamily: "var(--font-mono)",
                                                "& fieldset": {
                                                    borderColor: "var(--slate-200)",
                                                },
                                                "&:hover fieldset": {
                                                    borderColor: "var(--slate-300)",
                                                },
                                                "&.Mui-focused fieldset": {
                                                    borderColor: "var(--navy-600)",
                                                }
                                            },
                                            "& label.Mui-focused": {
                                                color: "var(--navy-600)",
                                            }
                                        }}
                                    />
                                </Box>

                                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
                                    <Button
                                        variant="contained"
                                        type="submit"
                                        size="large"
                                        disabled={loading || !texte.trim()}
                                        startIcon={<Search />}
                                        sx={{
                                            py: 1.5,
                                            px: 4,
                                            minHeight: 48,
                                            fontSize: "1.1rem",
                                            fontWeight: 700,
                                            borderRadius: "var(--radius-md)",
                                            boxShadow: "var(--shadow-md)",
                                            color: "#fff",
                                            background: "linear-gradient(140deg, var(--navy-500) 0%, #7c5ce6 100%)",
                                            "&:hover": {
                                                background: "linear-gradient(140deg, var(--navy-600) 0%, #6a49d6 100%)",
                                                boxShadow: "var(--shadow-lg)",
                                            },
                                            "&:disabled": {
                                                background: "var(--slate-300)",
                                                color: "#fff",
                                                boxShadow: "none",
                                            }
                                        }}
                                    >
                                        {loading ? "Vérification en cours..." : "Vérifier l'information"}
                                    </Button>
                                    <Typography
                                        variant="body2"
                                        sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "var(--slate-500)" }}
                                    >
                                        <Verified sx={{ fontSize: 18, color: "var(--slate-400)" }} />
                                        Ajoutez une affirmation ou utilisez l'enregistrement vocal pour lancer l'analyse.
                                    </Typography>
                                </Box>
                            </form>
                        </Paper>

                        {/* Loading State */}
                        {loading && (
                            <Fade in={loading}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        borderRadius: "var(--radius-lg)",
                                        border: "1px solid var(--slate-200)",
                                        boxShadow: "var(--shadow-sm)",
                                        bgcolor: "#fff",
                                        textAlign: "center",
                                        mb: 4
                                    }}
                                >
                                    <HourglassEmpty sx={{ fontSize: 48, color: "var(--amber-500)", mb: 2 }} />
                                    <Typography variant="h6" sx={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--navy-900)", mb: 2 }}>
                                        Analyse en cours...
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: "var(--slate-500)", mb: 3 }}>
                                        Notre IA recherche et analyse les sources disponibles
                                    </Typography>
                                    <LinearProgress
                                        sx={{
                                            borderRadius: "var(--radius-pill)",
                                            height: 8,
                                            bgcolor: "var(--navy-50)",
                                            "& .MuiLinearProgress-bar": {
                                                borderRadius: "var(--radius-pill)",
                                                bgcolor: "var(--navy-600)",
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
                                        borderRadius: "var(--radius-lg)",
                                        border: `1px solid ${getStatusConfig().border}`,
                                        boxShadow: "var(--shadow-sm)",
                                        bgcolor: getStatusConfig().bgcolor,
                                        mb: 4
                                    }}
                                >
                                    <Box sx={{ textAlign: "center", mb: 4 }}>
                                        {getStatusConfig().icon}
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontFamily: "var(--font-display)",
                                                fontWeight: 700,
                                                color: getStatusConfig().color,
                                                mt: 2,
                                                mb: 2
                                            }}
                                        >
                                            {getStatusConfig().title}
                                        </Typography>
                                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                                            <VerdictBadge
                                                verdict={getStatusConfig().verdict}
                                                variant="solid"
                                                size="md"
                                                label={getStatusConfig().chip}
                                            />
                                        </Box>
                                    </Box>

                                    <Alert
                                        severity={getStatusConfig().severity}
                                        sx={{
                                            fontSize: "1.1rem",
                                            borderRadius: "var(--radius-md)",
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
                                        borderRadius: "var(--radius-lg)",
                                        border: "1px solid var(--slate-200)",
                                        boxShadow: "var(--shadow-sm)",
                                        bgcolor: "#fff",
                                    }}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontFamily: "var(--font-display)",
                                            fontWeight: 700,
                                            color: "var(--navy-900)",
                                            mb: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1
                                        }}
                                    >
                                        <Search sx={{ color: "var(--navy-600)" }} />
                                        Sources Analysées
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{ color: "var(--slate-500)", mb: 4 }}
                                    >
                                        Notre IA s'est basée sur les sources suivantes pour sa vérification :
                                    </Typography>

                                    <Grid container spacing={3}>
                                        {webSources.map((source, index) => (
                                            <Grid item xs={12} key={index}>
                                                <SourceCard
                                                    name={source.title}
                                                    url={source.link}
                                                    date={source.date}
                                                    rank={index + 1}
                                                />
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
