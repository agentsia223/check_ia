import React from "react";
import { Container, Typography, Divider, Link, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import OutcomeBar from "./OutcomeBar";
import { fiabilite, pctEn } from "../data/fiabilite";

function Reliability() {
    const {
        version,
        dateEn,
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
        { key: "correct", value: correct, color: "success.main", label: pctEn(correct) },
        { key: "prudence", value: prudence, color: "warning.main", label: pctEn(prudence) },
        { key: "wrong", value: wrong, color: "error.main", label: pctEn(wrong) },
    ];

    const barLabel =
        `Outcome split: ${pctEn(correct)} correct verdict, ` +
        `${pctEn(prudence)} caution, ${pctEn(wrong)} wrong verdict.`;

    return (
        <Container maxWidth={false} sx={{ maxWidth: 720, py: { xs: 4, md: 6 } }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/fiabilite">
                    Version française
                </Link>
            </Typography>

            <Typography variant="h4" component="h1" gutterBottom>
                Check-IA Reliability
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Check-IA is evaluated regularly against real-world verifications. This page
                presents the results of the most recent evaluation, run on the system as
                deployed in production.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, fontWeight: 700 }}>
                Evaluation {version} — {dateEn} · {n} real claims · ground truth established
                from verifications published by independent fact-checkers
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                How to read these numbers
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                When Check-IA is not sure, it prefers not to rule rather than guess. Results
                therefore distinguish three outcomes: correct verdict, caution (no verdict),
                and wrong verdict.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                Results
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Across {nPrimary} claims with an established true/false reference verdict:
            </Typography>

            <OutcomeBar segments={segments} ariaLabel={barLabel} />

            <Box component="ul" sx={{ pl: 3, m: 0, mb: 3 }}>
                <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
                    <strong>{pctEn(correct)}</strong> — correct verdict
                </Typography>
                <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
                    <strong>{pctEn(prudence)}</strong> — caution: Check-IA chose not to rule
                </Typography>
                <Typography component="li" variant="body1" sx={{ lineHeight: 1.8 }}>
                    <strong>{pctEn(wrong)}</strong> — wrong verdict
                </Typography>
            </Box>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                When Check-IA does rule, its verdict is correct <strong>{pctEn(decisive)}</strong>{" "}
                of the time.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                False claims wrongly validated as true: <strong>{pctEn(falseValidated)}</strong>.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Median response time: about <strong>{medianSeconds} seconds</strong>.
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                Methodology in brief
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                The evaluation covers verification of French-language text. {n} claims were
                built from verifications published by independent Malian fact-checking
                organizations (Benbere and Voix de Mopti), rephrased the way a user would
                submit them. Ground truth was re-checked against events through {dateEn}, then
                every claim was submitted to the production system. {nPrimary} claims have a
                strictly true-or-false reference verdict; the remaining {n - nPrimary} belong
                to nuanced categories (misleading, out of context) and are reported separately
                in the methodology note.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                The fact-checkers named above are the authors of the original verifications;
                they did not supervise or endorse this evaluation.
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                <Link href="/methodology-checkia-v1-en.pdf">
                    Download the methodology note (PDF)
                </Link>
            </Typography>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h5" component="h2" gutterBottom>
                Limitations
            </Typography>

            <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                The corpus is mostly made up of false claims, reflecting what fact-checkers
                publish. Claims about images or videos have limitations of their own, detailed
                in the methodology note. These results are as of {dateEn}; subsequent
                evaluations will be published on this page (v2, v3, …).
            </Typography>
        </Container>
    );
}

export default Reliability;
