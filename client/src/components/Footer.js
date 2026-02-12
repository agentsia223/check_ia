import React from "react";
import { Box, Typography, Link, Grid, IconButton, Container } from "@mui/material";
import {
    Facebook,
    Twitter,
    Instagram,
    LinkedIn,
    GitHub,
} from "@mui/icons-material";

function Footer() {
    const socialLinks = [
        { icon: Facebook, href: "#" },
        { icon: Twitter, href: "#" },
        { icon: Instagram, href: "#" },
        { icon: LinkedIn, href: "#" },
        { icon: GitHub, href: "#" },
    ];

    return (
        <Box
            component="footer"
            sx={{
                bgcolor: "white",
                borderTop: "1px solid #e2e8f0",
                py: 6,
                mt: "auto",
            }}
        >
            <Container
                maxWidth="xl"
                sx={{
                    px: { xs: 2, sm: 3 },
                    mx: "auto",
                }}
            >
                <Grid container spacing={4}>
                    {/* About Section */}
                    <Grid item xs={12} sm={4}>
                        <Box sx={{ mb: 4 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    mb: 2,
                                }}
                            >
                                À propos de Check-IA
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "#64748b",
                                    lineHeight: 1.6,
                                }}
                            >
                                Check-IA est une plateforme de vérification des
                                faits conçue pour les francophones d'Afrique de
                                l'Ouest. Nous nous engageons à fournir des
                                informations vérifiées et fiables pour combattre
                                la désinformation.
                            </Typography>
                        </Box>
                    </Grid>

                    {/* Quick Links Section */}
                    <Grid item xs={12} sm={4}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                color: "#0f172a",
                                mb: 2,
                            }}
                        >
                            Liens Rapides
                        </Typography>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                            }}
                        >
                            <Link
                                component={Link}
                                to="/library"
                                color="inherit"
                                sx={{
                                    textDecoration: "none",
                                    "&:hover": {
                                        color: "#2563eb",
                                    },
                                }}
                            >
                                Bibliothèque
                            </Link>
                            <Link
                                component={Link}
                                to="/submit"
                                color="inherit"
                                sx={{
                                    textDecoration: "none",
                                    "&:hover": {
                                        color: "#2563eb",
                                    },
                                }}
                            >
                                Vérifier du Texte
                            </Link>
                            <Link
                                component={Link}
                                to="/verify-image"
                                color="inherit"
                                sx={{
                                    textDecoration: "none",
                                    "&:hover": {
                                        color: "#2563eb",
                                    },
                                }}
                            >
                                Vérifier des Images
                            </Link>
                            <Link
                                component={Link}
                                to="/detect-ai-image"
                                color="inherit"
                                sx={{
                                    textDecoration: "none",
                                    "&:hover": {
                                        color: "#2563eb",
                                    },
                                }}
                            >
                                Détection IA
                            </Link>
                        </Box>
                    </Grid>

                    {/* Contact Section
                    <Grid item xs={12} sm={4}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            Contact
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Language sx={{ color: '#64748b' }} />
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    checkia.org
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Mail sx={{ color: '#64748b' }} />
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    contact@checkia.org
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone sx={{ color: '#64748b' }} />
                                <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    +224 555 1234
                                </Typography>
                            </Box>
                        </Box>
                    </Grid> */}
                </Grid>

                {/* Social Links */}
                <Box
                    sx={{
                        mt: 6,
                        display: "flex",
                        justifyContent: "center",
                        gap: 2,
                        flexWrap: "wrap",
                    }}
                >
                    {socialLinks.map((link, index) => (
                        <IconButton
                            key={index}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            sx={{
                                color: "#64748b",
                                "&:hover": {
                                    color: "#2563eb",
                                    transform: "scale(1.1)",
                                    transition: "transform 0.2s ease-in-out",
                                },
                            }}
                        >
                            <link.icon />
                        </IconButton>
                    ))}
                </Box>

                {/* Copyright */}
                <Box
                    sx={{
                        mt: 4,
                        borderTop: "1px solid #e2e8f0",
                        pt: 2,
                        textAlign: "center",
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                        }}
                    >
                        {new Date().getFullYear()} Check-IA. Tous droits
                        réservés.
                        <Link
                            href="/terms"
                            color="inherit"
                            sx={{
                                textDecoration: "none",
                                "&:hover": {
                                    color: "#2563eb",
                                },
                            }}
                        >
                            Conditions d'utilisation
                        </Link>
                        <Link
                            href="/privacy"
                            color="inherit"
                            sx={{
                                textDecoration: "none",
                                "&:hover": {
                                    color: "#2563eb",
                                },
                            }}
                        >
                            Politique de confidentialité
                        </Link>
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}

export default Footer;
