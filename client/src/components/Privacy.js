import React from "react";
import { Container, Typography, Box, Paper } from "@mui/material";

function Privacy() {
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
                <Box>
                    <Typography
                        variant="h4"
                        gutterBottom
                        sx={{ fontWeight: "bold" }}
                    >
                        Politique de Confidentialité
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Bienvenue sur notre plateforme de fact-checking. Nous
                        respectons votre vie privée et nous nous engageons à
                        protéger vos informations personnelles. Cette politique
                        de confidentialité explique comment nous collectons,
                        utilisons et protégeons vos données.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        1. Informations Collectées
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Nous collectons des informations que vous nous
                        fournissez directement, telles que votre nom, votre
                        adresse e-mail, et toute autre information que vous
                        soumettez lors de votre inscription ou de la soumission
                        de faits à vérifier. Nous pouvons également collecter
                        des informations automatiquement via des cookies et
                        d'autres technologies de suivi pour améliorer
                        l'expérience utilisateur.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        2. Utilisation des Informations
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Les informations collectées sont utilisées pour vous
                        fournir nos services, vérifier les faits soumis, et
                        améliorer la qualité de notre plateforme. Nous pouvons
                        utiliser vos données pour vous envoyer des mises à jour
                        sur notre plateforme ou répondre à vos questions. Aucune
                        information personnelle ne sera partagée sans votre
                        consentement, sauf en cas d'obligation légale.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        3. Partage des Informations
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Nous ne partageons vos informations personnelles qu'avec
                        des tiers de confiance nécessaires à la fourniture de
                        nos services (comme nos partenaires technologiques), et
                        uniquement dans le cadre de la protection de vos
                        données. Nous nous engageons à ne pas vendre vos
                        informations personnelles à des tiers.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        4. Sécurité des Données
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Nous mettons en œuvre des mesures de sécurité
                        appropriées pour protéger vos données contre tout accès
                        non autorisé, modification, divulgation ou destruction.
                        Cependant, nous ne pouvons garantir une sécurité
                        absolue, et vous reconnaissez que toute transmission de
                        données présente des risques.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        5. Vos Droits
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Vous avez le droit d'accéder, de corriger, de supprimer
                        ou de limiter l'utilisation de vos informations
                        personnelles. Vous pouvez nous contacter pour toute
                        demande relative à vos données personnelles, et nous
                        ferons de notre mieux pour répondre dans les meilleurs
                        délais.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        6. Utilisation des Cookies
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Notre plateforme utilise des cookies pour collecter des
                        informations sur la façon dont vous utilisez notre site.
                        Ces informations nous aident à améliorer nos services et
                        à vous offrir une meilleure expérience. Vous pouvez
                        configurer votre navigateur pour refuser les cookies,
                        mais certaines fonctionnalités pourraient être limitées.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        7. Modifications de la Politique de Confidentialité
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Nous pouvons mettre à jour cette politique de
                        confidentialité de temps à autre. Toute modification
                        sera publiée sur cette page et prendra effet
                        immédiatement après sa publication. Nous vous
                        encourageons à consulter régulièrement cette page pour
                        rester informé des modifications.
                    </Typography>

                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ marginTop: 3, fontWeight: "medium" }}
                    >
                        8. Contact
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Pour toute question concernant cette politique de
                        confidentialité, veuillez nous contacter à l'adresse
                        suivante : privacy@factcheck.com.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
}

export default Privacy;
