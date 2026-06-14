import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import Logo from "./brand/Logo";

function Terms() {

    const sectionHeadingSx = {
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        color: 'var(--navy-900)',
        mb: 2
    };

    const bodyTextSx = {
        color: 'var(--slate-700)',
        lineHeight: 1.8
    };

    const dividerSx = { my: 4, borderColor: 'var(--border-subtle)' };

    return (
        <Container maxWidth="xl" sx={{ py: 6 }}>
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    bgcolor: 'white',
                    boxShadow: 'var(--shadow-sm)',
                    overflow: 'hidden'
                }}
            >
                {/* Solid navy hero band */}
                <Box
                    sx={{
                        bgcolor: 'var(--navy-600)',
                        px: { xs: 3, sm: 5 },
                        py: { xs: 4, sm: 5 }
                    }}
                >
                    <Logo white height={40} style={{ marginBottom: 20 }} />
                    <Typography
                        variant="h3"
                        gutterBottom
                        sx={{
                            fontWeight: 800,
                            fontFamily: 'var(--font-display)',
                            color: 'white',
                            mb: 0
                        }}
                    >
                        Conditions d'Utilisation
                    </Typography>
                </Box>

                <Box sx={{ width: '100%', p: { xs: 3, sm: 5 } }}>
                    <Typography
                        variant="body1"
                        paragraph
                        sx={{
                            color: 'var(--slate-700)',
                            lineHeight: 1.8,
                            mt: 1
                        }}
                    >
                        Bienvenue sur Check-IA, une plateforme de fact-checking
                        conçue pour les francophones d'Afrique de l'Ouest. En utilisant
                        notre plateforme, vous acceptez de respecter les présentes
                        conditions d'utilisation.
                    </Typography>

                    <Divider sx={dividerSx} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={sectionHeadingSx}
                        >
                            1. Utilisation de la Plateforme
                        </Typography>
                        <Typography
                            variant="body1"
                            paragraph
                            sx={bodyTextSx}
                        >
                            Notre plateforme est destinée à aider les utilisateurs à
                            soumettre, vérifier, et consulter des informations
                            factuelles. Vous vous engagez à utiliser les services de
                            manière responsable, à des fins légales, et en
                            respectant les autres utilisateurs. Toute utilisation
                            abusive, telle que la diffusion de fausses informations
                            intentionnelles, entraînera la suspension de votre
                            compte.
                        </Typography>
                    </Box>

                    <Divider sx={dividerSx} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={sectionHeadingSx}
                        >
                            2. Soumission de Contenu
                        </Typography>
                        <Typography
                            variant="body1"
                            paragraph
                            sx={bodyTextSx}
                        >
                            En soumettant un fait à vérifier, vous reconnaissez que
                            vous êtes le propriétaire ou que vous avez les droits de
                            diffuser le contenu. Vous nous accordez une licence
                            non-exclusive pour l'utiliser aux fins de vérification
                            et de partage sur la plateforme. Nous nous réservons le
                            droit de rejeter ou de supprimer toute soumission
                            inappropriée ou non conforme à notre politique.
                        </Typography>
                    </Box>

                    <Divider sx={dividerSx} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={sectionHeadingSx}
                        >
                            3. Exactitude des Informations
                        </Typography>
                        <Typography
                            variant="body1"
                            paragraph
                            sx={bodyTextSx}
                        >
                            Nous nous efforçons de fournir des informations exactes
                            et à jour, mais nous ne garantissons pas la précision
                            complète des résultats de vérification. Nos analyses
                            sont basées sur des modèles d'intelligence artificielle
                            et des sources externes, et peuvent comporter des
                            erreurs. Vous reconnaissez que les informations fournies
                            sont à titre indicatif.
                        </Typography>
                    </Box>

                    <Divider sx={dividerSx} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={sectionHeadingSx}
                        >
                            4. Responsabilité de l'Utilisateur
                        </Typography>
                        <Typography
                            variant="body1"
                            paragraph
                            sx={bodyTextSx}
                        >
                            Vous êtes seul responsable de l'utilisation que vous
                            faites des informations obtenues sur notre plateforme.
                            Nous ne pouvons être tenus responsables des décisions
                            prises sur la base des informations fournies, notamment
                            en cas de perte ou de dommage.
                        </Typography>
                    </Box>

                    <Divider sx={dividerSx} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={sectionHeadingSx}
                        >
                            5. Protection des Données
                        </Typography>
                        <Typography
                            variant="body1"
                            paragraph
                            sx={bodyTextSx}
                        >
                            Nous respectons la vie privée de nos utilisateurs. Les
                            informations personnelles recueillies sont traitées
                            conformément à notre politique de confidentialité. Nous
                            prenons toutes les mesures nécessaires pour protéger vos
                            données contre toute utilisation non autorisée.
                        </Typography>
                    </Box>

                    <Divider sx={dividerSx} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={sectionHeadingSx}
                        >
                            6. Modifications des Conditions
                        </Typography>
                        <Typography
                            variant="body1"
                            paragraph
                            sx={bodyTextSx}
                        >
                            Nous nous réservons le droit de modifier ces conditions
                            d'utilisation à tout moment. Toute modification sera
                            publiée sur cette page, et l'utilisation continue de la
                            plateforme après publication vaut acceptation des
                            nouvelles conditions.
                        </Typography>
                    </Box>

                    <Divider sx={dividerSx} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={sectionHeadingSx}
                        >
                            7. Contact
                        </Typography>
                        <Typography
                            variant="body1"
                            paragraph
                            sx={bodyTextSx}
                        >
                            Si vous avez des questions concernant ces conditions
                            d'utilisation, veuillez nous contacter à l'adresse
                            suivante : contact@checkia.org.
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}

export default Terms;
