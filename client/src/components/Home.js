import React, { useContext } from "react";
import {
    Container,
    Typography,
    Box,
    Button,
    Grid,
    Card,
    CardContent,
    Stack,
    Chip,
    Avatar,
} from "@mui/material";
import { Link } from "react-router-dom";
import {
    FactCheck,
    Image as ImageIcon,
    Psychology,
    TrendingUp,
    Security,
    VerifiedUser,
    Speed,
    ArrowForward,
    CheckCircle,
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";

function Home() {
    const { isLoggedIn } = useContext(AuthContext);

    const features = [
        {
            icon: FactCheck,
            title: "Vérification de Texte",
            description:
                "Analysez la véracité d'informations textuelles avec notre IA avancée",
            link: "/submit",
            color: "#2563eb",
            gradient: "from-blue-500 to-blue-600",
        },
        {
            icon: ImageIcon,
            title: "Analyse d'Images",
            description: "Vérifiez l'authenticité et le contenu des images",
            link: "/verify-image",
            color: "#f59e0b",
            gradient: "from-amber-500 to-orange-500",
        },
        {
            icon: Psychology,
            title: "Détection IA",
            description:
                "Identifiez les contenus générés par intelligence artificielle",
            link: "/detect-ai-image",
            color: "#10b981",
            gradient: "from-emerald-500 to-teal-500",
        },
    ];

    return (
        <Box
            sx={{
                width: "100%",
                bgcolor: "white",
                minHeight: "100vh",
            }}
        >
            {/* Hero Section */}
            <Box
                sx={{
                    width: "100%",
                    background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    py: { xs: 8, md: 12 },
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.1)",
                        zIndex: 1,
                    },
                }}
            >
                <Container
                    maxWidth="xl"
                    sx={{
                        position: "relative",
                        zIndex: 2,
                        px: { xs: 2, sm: 4, md: 6 },
                    }}
                >
                    <Grid
                        container
                        spacing={4}
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Grid item xs={12} md={8}>
                            <Stack spacing={3}>
                                <Chip
                                    label="🚀 Nouvelle Version Disponible"
                                    sx={{
                                        alignSelf: "flex-start",
                                        bgcolor: "rgba(255, 255, 255, 0.2)",
                                        color: "white",
                                        backdropFilter: "blur(10px)",
                                        border: "1px solid rgba(255, 255, 255, 0.3)",
                                    }}
                                />
                                <Typography
                                    variant="h1"
                                    sx={{
                                        fontSize: {
                                            xs: "2.5rem",
                                            md: "3.5rem",
                                            lg: "4rem",
                                        },
                                        fontWeight: 800,
                                        lineHeight: 1.1,
                                        background:
                                            "linear-gradient(45deg, #ffffff, #f1f5f9)",
                                        backgroundClip: "text",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                    }}
                                >
                                    Check-IA
                                </Typography>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontSize: {
                                            xs: "1.25rem",
                                            md: "1.5rem",
                                        },
                                        fontWeight: 500,
                                        opacity: 0.95,
                                        lineHeight: 1.4,
                                        maxWidth: "600px",
                                    }}
                                >
                                    La plateforme IA de référence pour la
                                    vérification des faits en Afrique
                                    francophone
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        fontSize: "1.1rem",
                                        opacity: 0.85,
                                        maxWidth: "500px",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    Combattez la désinformation avec nos outils
                                    d'IA avancés. Vérification instantanée,
                                    sources multiples, résultats fiables.
                                </Typography>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={2}
                                    sx={{ pt: 2 }}
                                >
                                    {isLoggedIn ? (
                                        <>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                component={Link}
                                                to="/submit"
                                                endIcon={<ArrowForward />}
                                                sx={{
                                                    bgcolor: "white",
                                                    color: "#2563eb",
                                                    fontWeight: 600,
                                                    px: 4,
                                                    py: 1.5,
                                                    "&:hover": {
                                                        bgcolor: "#f8fafc",
                                                        transform:
                                                            "translateY(-2px)",
                                                        boxShadow:
                                                            "0 8px 25px rgba(0,0,0,0.15)",
                                                    },
                                                }}
                                            >
                                                Commencer la Vérification
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                component={Link}
                                                to="/library"
                                                sx={{
                                                    borderColor: "white",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    px: 4,
                                                    py: 1.5,
                                                    "&:hover": {
                                                        bgcolor:
                                                            "rgba(255, 255, 255, 0.1)",
                                                        borderColor: "white",
                                                    },
                                                }}
                                            >
                                                Explorer la Bibliothèque
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                component={Link}
                                                to="/register"
                                                endIcon={<ArrowForward />}
                                                sx={{
                                                    bgcolor: "white",
                                                    color: "#2563eb",
                                                    fontWeight: 600,
                                                    px: 4,
                                                    py: 1.5,
                                                    "&:hover": {
                                                        bgcolor: "#f8fafc",
                                                        transform:
                                                            "translateY(-2px)",
                                                        boxShadow:
                                                            "0 8px 25px rgba(0,0,0,0.15)",
                                                    },
                                                }}
                                            >
                                                Commencer Gratuitement
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                component={Link}
                                                to="/login"
                                                sx={{
                                                    borderColor: "white",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    px: 4,
                                                    py: 1.5,
                                                    "&:hover": {
                                                        bgcolor:
                                                            "rgba(255, 255, 255, 0.1)",
                                                        borderColor: "white",
                                                    },
                                                }}
                                            >
                                                Se Connecter
                                            </Button>
                                        </>
                                    )}
                                </Stack>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Box
                                sx={{
                                    display: { xs: "none", md: "flex" },
                                    justifyContent: "center",
                                    alignItems: "center",
                                    height: "100%",
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 280,
                                        height: 280,
                                        borderRadius: "50%",
                                        background: "rgba(255, 255, 255, 0.1)",
                                        backdropFilter: "blur(20px)",
                                        border: "2px solid rgba(255, 255, 255, 0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        position: "relative",
                                        "&::before": {
                                            content: '""',
                                            position: "absolute",
                                            width: "120%",
                                            height: "120%",
                                            border: "1px solid rgba(255, 255, 255, 0.1)",
                                            borderRadius: "50%",
                                            animation:
                                                "pulse 3s ease-in-out infinite",
                                        },
                                    }}
                                >
                                    <VerifiedUser
                                        sx={{ fontSize: 120, opacity: 0.9 }}
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Box sx={{ py: 6, bgcolor: "white" }}>
                <Container
                    maxWidth="xl"
                    sx={{
                        py: 6,
                        px: { xs: 2, sm: 4, md: 6 },
                    }}
                >
                    <Stack spacing={6}>
                        <Box
                            sx={{
                                textAlign: "center",
                                maxWidth: 600,
                                mx: "auto",
                            }}
                        >
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: "2rem", md: "2.5rem" },
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    mb: 2,
                                }}
                            >
                                Outils de Vérification
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: "#475569",
                                    fontSize: "1.1rem",
                                    lineHeight: 1.6,
                                }}
                            >
                                Découvrez nos outils alimentés par l'IA pour une
                                vérification rapide et précise des informations
                            </Typography>
                        </Box>

                        <Grid container spacing={4}>
                            {features.map((feature, index) => (
                                <Grid item xs={12} md={4} key={index}>
                                    <Card
                                        sx={{
                                            height: "100%",
                                            border: "1px solid #f1f5f9",
                                            borderRadius: 3,
                                            transition:
                                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            "&:hover": {
                                                transform: "translateY(-8px)",
                                                boxShadow:
                                                    "0 20px 40px rgba(0,0,0,0.1)",
                                                borderColor: feature.color,
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Stack spacing={3}>
                                                <Avatar
                                                    sx={{
                                                        width: 64,
                                                        height: 64,
                                                        bgcolor: feature.color,
                                                        mb: 1,
                                                    }}
                                                >
                                                    <feature.icon
                                                        sx={{ fontSize: 32 }}
                                                    />
                                                </Avatar>
                                                <Box>
                                                    <Typography
                                                        variant="h5"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: "#0f172a",
                                                            mb: 1,
                                                        }}
                                                    >
                                                        {feature.title}
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            color: "#475569",
                                                            lineHeight: 1.6,
                                                        }}
                                                    >
                                                        {feature.description}
                                                    </Typography>
                                                </Box>
                                                {isLoggedIn && (
                                                    <Button
                                                        variant="contained"
                                                        component={Link}
                                                        to={feature.link}
                                                        endIcon={
                                                            <ArrowForward />
                                                        }
                                                        sx={{
                                                            bgcolor:
                                                                feature.color,
                                                            color: "white",
                                                            fontWeight: 600,
                                                            alignSelf:
                                                                "flex-start",
                                                            "&:hover": {
                                                                bgcolor:
                                                                    feature.color,
                                                                filter: "brightness(0.9)",
                                                            },
                                                        }}
                                                    >
                                                        Essayer
                                                    </Button>
                                                )}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Stack>
                </Container>
            </Box>

            {/* Benefits Section */}
            <Box sx={{ py: 6, bgcolor: "#f8fafc" }}>
                <Container
                    maxWidth="xl"
                    sx={{
                        py: 6,
                        px: { xs: 2, sm: 4, md: 6 },
                    }}
                >
                    <Stack spacing={6}>
                        <Box
                            sx={{
                                textAlign: "center",
                                maxWidth: 600,
                                mx: "auto",
                            }}
                        >
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: "2rem", md: "2.5rem" },
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    mb: 2,
                                }}
                            >
                                Avantages de l'Utilisation de Check-IA
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: "#475569",
                                    fontSize: "1.1rem",
                                    lineHeight: 1.6,
                                }}
                            >
                                Découvrez les avantages de l'utilisation de
                                notre plateforme pour votre vérification des
                                faits
                            </Typography>
                        </Box>

                        <Grid container spacing={4}>
                            {[
                                {
                                    icon: Speed,
                                    title: "Rapide",
                                    description: "Résultats en secondes",
                                },
                                {
                                    icon: Security,
                                    title: "Sécurisé",
                                    description: "Données protégées",
                                },
                                {
                                    icon: TrendingUp,
                                    title: "Fiable",
                                    description: "99.2% de précision",
                                },
                            ].map((benefit, index) => (
                                <Grid item xs={12} md={4} key={index}>
                                    <Card
                                        sx={{
                                            height: "100%",
                                            border: "1px solid #f1f5f9",
                                            borderRadius: 3,
                                            transition:
                                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            "&:hover": {
                                                transform: "translateY(-8px)",
                                                boxShadow:
                                                    "0 20px 40px rgba(0,0,0,0.1)",
                                                borderColor: "#2563eb",
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Stack spacing={3}>
                                                <Avatar
                                                    sx={{
                                                        width: 64,
                                                        height: 64,
                                                        bgcolor: "#2563eb",
                                                        mb: 1,
                                                    }}
                                                >
                                                    <benefit.icon
                                                        sx={{ fontSize: 32 }}
                                                    />
                                                </Avatar>
                                                <Box>
                                                    <Typography
                                                        variant="h5"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: "#0f172a",
                                                            mb: 1,
                                                        }}
                                                    >
                                                        {benefit.title}
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            color: "#475569",
                                                            lineHeight: 1.6,
                                                        }}
                                                    >
                                                        {benefit.description}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Stack>
                </Container>
            </Box>

            {/* Why Choose Us Section */}
            <Box sx={{ py: 8, bgcolor: "#f8fafc" }}>
                <Container
                    maxWidth="xl"
                    sx={{
                        py: 6,
                        px: { xs: 2, sm: 4, md: 6 },
                    }}
                >
                    <Grid container spacing={6} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Stack spacing={3}>
                                <Typography
                                    variant="h2"
                                    sx={{
                                        fontSize: { xs: "2rem", md: "2.5rem" },
                                        fontWeight: 700,
                                        color: "#0f172a",
                                    }}
                                >
                                    Pourquoi Check-IA ?
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        color: "#475569",
                                        fontSize: "1.1rem",
                                        lineHeight: 1.7,
                                    }}
                                >
                                    Notre plateforme utilise des technologies
                                    d'IA de pointe spécialement adaptées au
                                    contexte africain francophone pour offrir
                                    des vérifications précises et fiables.
                                </Typography>
                                <Stack spacing={2}>
                                    {[
                                        "Algorithmes adaptés aux langues locales",
                                        "Sources vérifiées et contextualisées",
                                        "Interface intuitive et accessible",
                                        "Résultats instantanés et détaillés",
                                    ].map((item, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                            }}
                                        >
                                            <CheckCircle
                                                sx={{
                                                    color: "#10b981",
                                                    fontSize: 24,
                                                }}
                                            />
                                            <Typography
                                                variant="body1"
                                                sx={{ color: "#475569" }}
                                            >
                                                {item}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Card
                                            sx={{
                                                p: 3,
                                                textAlign: "center",
                                                border: "1px solid #e2e8f0",
                                            }}
                                        >
                                            <Speed
                                                sx={{
                                                    fontSize: 48,
                                                    color: "#2563eb",
                                                    mb: 1,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                Rapide
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "#64748b" }}
                                            >
                                                Résultats en secondes
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Card
                                            sx={{
                                                p: 3,
                                                textAlign: "center",
                                                border: "1px solid #e2e8f0",
                                            }}
                                        >
                                            <Security
                                                sx={{
                                                    fontSize: 48,
                                                    color: "#10b981",
                                                    mb: 1,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                Sécurisé
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "#64748b" }}
                                            >
                                                Données protégées
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Card
                                            sx={{
                                                p: 3,
                                                textAlign: "center",
                                                border: "1px solid #e2e8f0",
                                                mt: 2,
                                            }}
                                        >
                                            <TrendingUp
                                                sx={{
                                                    fontSize: 48,
                                                    color: "#f59e0b",
                                                    mb: 1,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                Fiable
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "#64748b" }}
                                            >
                                                99.2% de précision
                                            </Typography>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* CTA Section */}
            <Box
                sx={{
                    py: 8,
                    background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    textAlign: "center",
                }}
            >
                <Container
                    maxWidth="xl"
                    sx={{
                        py: 6,
                        px: { xs: 2, sm: 4, md: 6 },
                    }}
                >
                    <Stack spacing={4} alignItems="center" textAlign="center">
                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: { xs: "2rem", md: "2.5rem" },
                                fontWeight: 700,
                            }}
                        >
                            Prêt à Vérifier ?
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{
                                fontSize: "1.1rem",
                                opacity: 0.9,
                                maxWidth: 500,
                            }}
                        >
                            Rejoignez des milliers d'utilisateurs qui font
                            confiance à Check-IA pour combattre la
                            désinformation en Afrique francophone.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            component={Link}
                            to={isLoggedIn ? "/submit" : "/register"}
                            endIcon={<ArrowForward />}
                            sx={{
                                bgcolor: "white",
                                color: "#2563eb",
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                fontSize: "1.1rem",
                                "&:hover": {
                                    bgcolor: "#f8fafc",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
                                },
                            }}
                        >
                            {isLoggedIn
                                ? "Commencer la Vérification"
                                : "Créer un Compte Gratuit"}
                        </Button>
                    </Stack>
                </Container>
            </Box>
        </Box>
    );
}

export default Home;
