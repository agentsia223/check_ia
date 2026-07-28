import React from "react";
import { Container, Typography, Divider, Link, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import OutcomeBar from "./OutcomeBar";
import { fiabilite, pctFr } from "../data/fiabilite";

function Fiabilite() {
    const {
        version,
        date,
        n,
        nPrimary,
        correct,
        prudence,
        wrong,
        decisive,
        falseValidated,
        medianSeconds,
    } = fiabilite;

    const segments = [
        { key: "correct", value: correct, color: "success.main", label: pctFr(correct) },
        { key: "prudence", value: prudence, color: "warning.main", label: pctFr(prudence) },
        { key: "wrong", value: wrong, color: "error.main", label: pctFr(wrong) },
    ];

    const barLabel =
        `Répartition des issues : ${pctFr(correct)} verdict correct, ` +
        `${pctFr(prudence)} prudence, ${pctFr(wrong)} verdict erroné.`;

    return (
        <Container maxWidth={false} sx={{ maxWidth: 720, py: { xs: 4, md: 6 } }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/reliability">
                    English version
                </Link>
            </Typography>

            <Typography variant="h4" component="h1" gutterBottom>
                Fiabilité de Check-IA
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Check-IA est évalué régulièrement sur des vérifications réelles. Cette page
                présente les résultats de l'évaluation la plus récente, menée sur le système
                tel qu'il est en production.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, fontWeight: 700 }}>
                Évaluation {version} — {date} · {n} affirmations réelles · vérité de référence
                établie à partir de vérifications publiées par des fact-checkeurs indépendants
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                Comment lire ces chiffres
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Quand Check-IA n'est pas sûr, il préfère ne pas trancher plutôt que deviner.
                Les résultats distinguent donc trois issues : verdict correct, prudence (pas de
                verdict), verdict erroné.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                Résultats
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Sur {nPrimary} affirmations au verdict de référence établi (vrai ou faux) :
            </Typography>

            <OutcomeBar segments={segments} ariaLabel={barLabel} />

            <Box component="ul" sx={{ pl: 3, m: 0, mb: 3 }}>
                <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
                    <strong>{pctFr(correct)}</strong> — verdict correct
                </Typography>
                <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
                    <strong>{pctFr(prudence)}</strong> — prudence : Check-IA a préféré ne pas
                    trancher
                </Typography>
                <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
                    <strong>{pctFr(wrong)}</strong> — verdict erroné
                </Typography>
            </Box>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Quand Check-IA tranche, son verdict est exact dans <strong>{pctFr(decisive)}</strong>{" "}
                des cas.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Fausses informations validées à tort comme vraies :{" "}
                <strong>{pctFr(falseValidated)}</strong>.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Temps de réponse médian : environ <strong>{medianSeconds} secondes</strong>.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                Méthodologie en bref
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                L'évaluation porte sur la vérification de textes en français. {n} affirmations
                ont été constituées à partir de vérifications publiées par des fact-checkeurs
                maliens indépendants (Benbere et Voix de Mopti), reformulées telles qu'un
                utilisateur les soumettrait. La vérité de référence a été ré-actualisée au
                regard des événements survenus jusqu'en {date}, puis chaque affirmation a été
                soumise au système en production. {nPrimary} affirmations ont un verdict de
                référence strictement vrai ou faux ; les {n - nPrimary} restantes relèvent de
                catégories nuancées (trompeur, hors contexte) et sont traitées à part dans la
                note méthodologique.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Les fact-checkeurs cités sont les auteurs des vérifications d'origine ; ils
                n'ont ni supervisé ni approuvé cette évaluation.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                <Link href="/methodologie-checkia-v1.pdf">
                    Télécharger la note méthodologique (PDF)
                </Link>
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                Limites
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Le corpus est majoritairement composé d'affirmations fausses, à l'image des
                vérifications publiées par les fact-checkeurs. Les affirmations portant sur des
                images ou des vidéos ont des limites propres, détaillées dans la note
                méthodologique. Ces résultats datent de {date} ; les évaluations suivantes
                seront publiées sur cette page (v2, v3, …).
            </Typography>
        </Container>
    );
}

export default Fiabilite;
