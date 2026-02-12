import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";

function Terms() {

    return (
        <Container maxWidth="xl" sx={{ py: 6 }}>
            <Paper
                elevation={0}
                sx={{ 
                    width: '100%',
                    p: 4,
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    bgcolor: 'white'
                }}
            >
                <Box sx={{ width: '100%' }}>
                    <Typography
                        variant="h3"
                        gutterBottom
                        sx={{ 
                            fontWeight: 800,
                            color: '#0f172a',
                            mb: 4,
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        Conditions d'Utilisation
                    </Typography>
                    <Typography 
                        variant="body1" 
                        paragraph
                        sx={{ 
                            color: '#64748b',
                            lineHeight: 1.8
                        }}
                    >
                        Bienvenue sur Check-IA, une plateforme de fact-checking 
                        conçue pour les francophones d'Afrique de l'Ouest. En utilisant
                        notre plateforme, vous acceptez de respecter les présentes 
                        conditions d'utilisation.
                    </Typography>

                    <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            1. Utilisation de la Plateforme
                        </Typography>
                        <Typography 
                            variant="body1" 
                            paragraph
                            sx={{ 
                                color: '#64748b',
                                lineHeight: 1.8
                            }}
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

                    <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            2. Soumission de Contenu
                        </Typography>
                        <Typography 
                            variant="body1" 
                            paragraph
                            sx={{ 
                                color: '#64748b',
                                lineHeight: 1.8
                            }}
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

                    <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            3. Exactitude des Informations
                        </Typography>
                        <Typography 
                            variant="body1" 
                            paragraph
                            sx={{ 
                                color: '#64748b',
                                lineHeight: 1.8
                            }}
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

                    <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            4. Responsabilité de l'Utilisateur
                        </Typography>
                        <Typography 
                            variant="body1" 
                            paragraph
                            sx={{ 
                                color: '#64748b',
                                lineHeight: 1.8
                            }}
                        >
                            Vous êtes seul responsable de l'utilisation que vous
                            faites des informations obtenues sur notre plateforme.
                            Nous ne pouvons être tenus responsables des décisions
                            prises sur la base des informations fournies, notamment
                            en cas de perte ou de dommage.
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            5. Protection des Données
                        </Typography>
                        <Typography variant="body1" paragraph>
                            Nous respectons la vie privée de nos utilisateurs. Les
                            informations personnelles recueillies sont traitées
                            conformément à notre politique de confidentialité. Nous
                            prenons toutes les mesures nécessaires pour protéger vos
                            données contre toute utilisation non autorisée.
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            6. Modifications des Conditions
                        </Typography>
                        <Typography 
                            variant="body1" 
                            paragraph
                            sx={{ 
                                color: '#64748b',
                                lineHeight: 1.8
                            }}
                        >
                            Nous nous réservons le droit de modifier ces conditions
                            d'utilisation à tout moment. Toute modification sera
                            publiée sur cette page, et l'utilisation continue de la
                            plateforme après publication vaut acceptation des
                            nouvelles conditions.
                        </Typography>
                    </Box>

                    <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

                    <Box sx={{ mb: 6 }}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ 
                                fontWeight: 700,
                                color: '#0f172a',
                                mb: 2
                            }}
                        >
                            7. Contact
                        </Typography>
                        <Typography 
                            variant="body1" 
                            paragraph
                            sx={{ 
                                color: '#64748b',
                                lineHeight: 1.8
                            }}
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
