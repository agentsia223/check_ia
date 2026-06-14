import React from "react";
import { Box, Typography, Link, Grid, IconButton, Container } from "@mui/material";
import {
    Facebook,
    Twitter,
    Instagram,
    LinkedIn,
    GitHub,
} from "@mui/icons-material";
import Logo from "./brand/Logo";

function Footer() {
    const socialLinks = [
        { icon: Facebook, href: "#" },
        { icon: Twitter, href: "#" },
        { icon: Instagram, href: "#" },
        { icon: LinkedIn, href: "#" },
        { icon: GitHub, href: "#" },
    ];

    const linkSx = {
        textDecoration: "none",
        color: "rgba(255, 255, 255, 0.78)",
        fontFamily: "var(--font-body)",
        transition: "color 0.2s ease-in-out",
        "&:hover": {
            color: "var(--green-300, #86e08a)",
        },
    };

    return (
        <Box
            component="footer"
            sx={{
                bgcolor: "var(--navy-600)",
                color: "rgba(255, 255, 255, 0.78)",
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
                            <Box sx={{ mb: 2 }}>
                                <Logo white height={36} />
                            </Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontFamily: "var(--font-display)",
                                    fontWeight: 700,
                                    color: "#ffffff",
                                    mb: 2,
                                }}
                            >
                                À propos de Check-IA
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: "rgba(255, 255, 255, 0.78)",
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
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                                color: "#ffffff",
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
                                sx={linkSx}
                            >
                                Bibliothèque
                            </Link>
                            <Link
                                component={Link}
                                to="/submit"
                                color="inherit"
                                sx={linkSx}
                            >
                                Vérifier du Texte
                            </Link>
                            <Link
                                component={Link}
                                to="/verify-image"
                                color="inherit"
                                sx={linkSx}
                            >
                                Vérifier des Images
                            </Link>
                            <Link
                                component={Link}
                                to="/detect-ai-image"
                                color="inherit"
                                sx={linkSx}
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
                                color: "rgba(255, 255, 255, 0.78)",
                                width: 48,
                                height: 48,
                                "&:hover": {
                                    color: "#ffffff",
                                    bgcolor: "rgba(255, 255, 255, 0.12)",
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
                        borderTop: "1px solid rgba(255, 255, 255, 0.18)",
                        pt: 2,
                        textAlign: "center",
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: "rgba(255, 255, 255, 0.78)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        {new Date().getFullYear()} Check-IA. Tous droits
                        réservés.
                        <Link
                            href="/terms"
                            color="inherit"
                            sx={linkSx}
                        >
                            Conditions d'utilisation
                        </Link>
                        <Link
                            href="/privacy"
                            color="inherit"
                            sx={linkSx}
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
