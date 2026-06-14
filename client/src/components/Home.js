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
    Speed,
    ArrowForward,
    CheckCircle,
} from "@mui/icons-material";
import { AuthContext } from "../utils/AuthContext";
import Logo from "./brand/Logo";

function Home() {
    const { isLoggedIn } = useContext(AuthContext);

    const features = [
        {
            icon: FactCheck,
            title: "Vérification de Texte",
            description:
                "Analysez la véracité d'informations textuelles avec notre IA avancée",
            link: "/submit",
            color: "var(--navy-600)",
            gradient: "from-blue-500 to-blue-600",
        },
        {
            icon: ImageIcon,
            title: "Analyse d'Images",
            description: "Vérifiez l'authenticité et le contenu des images",
            link: "/verify-image",
            color: "var(--green-500)",
            gradient: "from-amber-500 to-orange-500",
        },
        {
            icon: Psychology,
            title: "Détection IA",
            description:
                "Identifiez les contenus générés par intelligence artificielle",
            link: "/detect-ai-image",
            color: "var(--green-600)",
            gradient: "from-emerald-500 to-teal-500",
        },
    ];

    return (
        <Box
            sx={{
                width: "100%",
                bgcolor: "var(--slate-50)",
                minHeight: "100vh",
            }}
        >
            {/* Hero Section */}
            <Box
                sx={{
                    width: "100%",
                    background: "var(--navy-600)",
                    color: "white",
                    py: { xs: 8, md: 12 },
                    position: "relative",
                    overflow: "hidden",
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
                                    label="Nouvelle Version Disponible"
                                    sx={{
                                        alignSelf: "flex-start",
                                        bgcolor: "rgba(255, 255, 255, 0.16)",
                                        color: "white",
                                        fontWeight: 600,
                                        borderRadius: "var(--radius-pill)",
                                        border: "1px solid rgba(255, 255, 255, 0.3)",
                                    }}
                                />
                                <Typography
                                    variant="h1"
                                    sx={{
                                        fontFamily: "var(--font-display)",
                                        fontSize: {
                                            xs: "2.5rem",
                                            md: "3.5rem",
                                            lg: "4rem",
                                        },
                                        fontWeight: 800,
                                        lineHeight: 1.1,
                                        color: "white",
                                    }}
                                >
                                    Check-IA
                                </Typography>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontFamily: "var(--font-display)",
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
                                                    color: "var(--navy-600)",
                                                    fontWeight: 600,
                                                    px: 4,
                                                    py: 1.5,
                                                    minHeight: 48,
                                                    borderRadius:
                                                        "var(--radius-md)",
                                                    "&:hover": {
                                                        bgcolor: "var(--navy-50)",
                                                        transform:
                                                            "translateY(-2px)",
                                                        boxShadow:
                                                            "var(--shadow-lg)",
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
                                                    minHeight: 48,
                                                    borderRadius:
                                                        "var(--radius-md)",
                                                    "&:hover": {
                                                        bgcolor:
                                                            "rgba(255, 255, 255, 0.12)",
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
                                                    bgcolor: "var(--green-500)",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    px: 4,
                                                    py: 1.5,
                                                    minHeight: 48,
                                                    borderRadius:
                                                        "var(--radius-md)",
                                                    "&:hover": {
                                                        bgcolor: "var(--green-600)",
                                                        transform:
                                                            "translateY(-2px)",
                                                        boxShadow:
                                                            "var(--shadow-lg)",
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
                                                    minHeight: 48,
                                                    borderRadius:
                                                        "var(--radius-md)",
                                                    "&:hover": {
                                                        bgcolor:
                                                            "rgba(255, 255, 255, 0.12)",
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
                                        background: "rgba(255, 255, 255, 0.08)",
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
                                    <Logo
                                        variant="icon"
                                        white
                                        height={160}
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Box sx={{ py: 6, bgcolor: "var(--slate-50)" }}>
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
                                    fontFamily: "var(--font-display)",
                                    fontSize: { xs: "2rem", md: "2.5rem" },
                                    fontWeight: 700,
                                    color: "var(--navy-900)",
                                    mb: 2,
                                }}
                            >
                                Outils de Vérification
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: "var(--slate-700)",
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
                                            bgcolor: "white",
                                            border: "1px solid var(--slate-200)",
                                            borderRadius: "var(--radius-lg)",
                                            boxShadow: "var(--shadow-sm)",
                                            transition:
                                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            "&:hover": {
                                                transform: "translateY(-8px)",
                                                boxShadow: "var(--shadow-lg)",
                                                borderColor: "var(--navy-200)",
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
                                                        borderRadius:
                                                            "var(--radius-md)",
                                                        mb: 1,
                                                    }}
                                                    variant="rounded"
                                                >
                                                    <feature.icon
                                                        sx={{ fontSize: 32 }}
                                                    />
                                                </Avatar>
                                                <Box>
                                                    <Typography
                                                        variant="h5"
                                                        sx={{
                                                            fontFamily:
                                                                "var(--font-display)",
                                                            fontWeight: 700,
                                                            color: "var(--navy-900)",
                                                            mb: 1,
                                                        }}
                                                    >
                                                        {feature.title}
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            color: "var(--slate-700)",
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
                                                            minHeight: 48,
                                                            borderRadius:
                                                                "var(--radius-md)",
                                                            alignSelf:
                                                                "flex-start",
                                                            "&:hover": {
                                                                bgcolor:
                                                                    feature.color,
                                                                filter: "brightness(0.92)",
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
            <Box sx={{ py: 6, bgcolor: "var(--slate-50)" }}>
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
                                    fontFamily: "var(--font-display)",
                                    fontSize: { xs: "2rem", md: "2.5rem" },
                                    fontWeight: 700,
                                    color: "var(--navy-900)",
                                    mb: 2,
                                }}
                            >
                                Avantages de l'Utilisation de Check-IA
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: "var(--slate-700)",
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
                                            bgcolor: "white",
                                            border: "1px solid var(--slate-200)",
                                            borderRadius: "var(--radius-lg)",
                                            boxShadow: "var(--shadow-sm)",
                                            transition:
                                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            "&:hover": {
                                                transform: "translateY(-8px)",
                                                boxShadow: "var(--shadow-lg)",
                                                borderColor: "var(--navy-200)",
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ p: 4 }}>
                                            <Stack spacing={3}>
                                                <Avatar
                                                    sx={{
                                                        width: 64,
                                                        height: 64,
                                                        bgcolor: "var(--navy-600)",
                                                        borderRadius:
                                                            "var(--radius-md)",
                                                        mb: 1,
                                                    }}
                                                    variant="rounded"
                                                >
                                                    <benefit.icon
                                                        sx={{ fontSize: 32 }}
                                                    />
                                                </Avatar>
                                                <Box>
                                                    <Typography
                                                        variant="h5"
                                                        sx={{
                                                            fontFamily:
                                                                "var(--font-display)",
                                                            fontWeight: 700,
                                                            color: "var(--navy-900)",
                                                            mb: 1,
                                                        }}
                                                    >
                                                        {benefit.title}
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            color: "var(--slate-700)",
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
            <Box sx={{ py: 8, bgcolor: "var(--slate-50)" }}>
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
                                        fontFamily: "var(--font-display)",
                                        fontSize: { xs: "2rem", md: "2.5rem" },
                                        fontWeight: 700,
                                        color: "var(--navy-900)",
                                    }}
                                >
                                    Pourquoi Check-IA ?
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        color: "var(--slate-700)",
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
                                                    color: "var(--green-500)",
                                                    fontSize: 24,
                                                }}
                                            />
                                            <Typography
                                                variant="body1"
                                                sx={{ color: "var(--slate-700)" }}
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
                                                bgcolor: "white",
                                                border: "1px solid var(--slate-200)",
                                                borderRadius:
                                                    "var(--radius-lg)",
                                                boxShadow: "var(--shadow-sm)",
                                            }}
                                        >
                                            <Speed
                                                sx={{
                                                    fontSize: 48,
                                                    color: "var(--navy-600)",
                                                    mb: 1,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontFamily:
                                                        "var(--font-display)",
                                                    fontWeight: 600,
                                                    color: "var(--navy-900)",
                                                }}
                                            >
                                                Rapide
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--slate-500)" }}
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
                                                bgcolor: "white",
                                                border: "1px solid var(--slate-200)",
                                                borderRadius:
                                                    "var(--radius-lg)",
                                                boxShadow: "var(--shadow-sm)",
                                            }}
                                        >
                                            <Security
                                                sx={{
                                                    fontSize: 48,
                                                    color: "var(--green-500)",
                                                    mb: 1,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontFamily:
                                                        "var(--font-display)",
                                                    fontWeight: 600,
                                                    color: "var(--navy-900)",
                                                }}
                                            >
                                                Sécurisé
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--slate-500)" }}
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
                                                bgcolor: "white",
                                                border: "1px solid var(--slate-200)",
                                                borderRadius:
                                                    "var(--radius-lg)",
                                                boxShadow: "var(--shadow-sm)",
                                                mt: 2,
                                            }}
                                        >
                                            <TrendingUp
                                                sx={{
                                                    fontSize: 48,
                                                    color: "var(--green-600)",
                                                    mb: 1,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontFamily:
                                                        "var(--font-display)",
                                                    fontWeight: 600,
                                                    color: "var(--navy-900)",
                                                }}
                                            >
                                                Fiable
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: "var(--slate-500)" }}
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
                    background: "var(--navy-600)",
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
                        <Logo white height={48} />
                        <Typography
                            variant="h2"
                            sx={{
                                fontFamily: "var(--font-display)",
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
                                bgcolor: "var(--green-500)",
                                color: "white",
                                fontWeight: 600,
                                px: 4,
                                py: 1.5,
                                minHeight: 48,
                                fontSize: "1.1rem",
                                borderRadius: "var(--radius-md)",
                                "&:hover": {
                                    bgcolor: "var(--green-600)",
                                    transform: "translateY(-2px)",
                                    boxShadow: "var(--shadow-lg)",
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
