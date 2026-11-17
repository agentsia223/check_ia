import { Link } from "react-router-dom";
import OutcomeBar from "../components/check/OutcomeBar";
import { usePageTitle } from "../hooks/usePageTitle";
import { fiabilite, pctEn } from "../data/fiabilite";
import styles from "./Prose.module.css";

/** Reliability page (English version of /fiabilite). Every number comes from data/fiabilite.js. */
export default function Reliability() {
    usePageTitle("Reliability");
    const { version, dateEn, n, nPrimary, correct, prudence, wrong, decisive, falseValidated, medianSeconds } =
        fiabilite;

    const segments = [
        { key: "correct", value: correct, color: "var(--green-700)", label: pctEn(correct) },
        { key: "prudence", value: prudence, color: "var(--navy-500)", label: pctEn(prudence) },
        { key: "wrong", value: wrong, color: "var(--red-700)", label: pctEn(wrong) },
    ];

    const barLabel =
        `Outcome split: ${pctEn(correct)} correct verdict, ` +
        `${pctEn(prudence)} caution, ${pctEn(wrong)} wrong verdict.`;

    return (
        <article className={styles.page} lang="en">
            <Link to="/fiabilite" className={styles.langSwitch} lang="fr" hrefLang="fr">
                Version française
            </Link>

            <h1>Check-IA Reliability</h1>

            <p className={styles.lead}>
                Check-IA is evaluated regularly against real-world verifications. This page presents the
                results of the most recent evaluation, run on the system as deployed in production.
            </p>

            <p className={styles.facts}>
                Evaluation {version} — {dateEn} · {n} real claims · ground truth established from verifications
                published by independent fact-checkers
            </p>

            <h2>How to read these numbers</h2>
            <p>
                When Check-IA is not sure, it prefers not to rule rather than guess. Results therefore
                distinguish three outcomes: correct verdict, caution (no verdict), and wrong verdict.
            </p>

            <h2>Results</h2>
            <p>Across {nPrimary} claims with an established true/false reference verdict:</p>

            <OutcomeBar segments={segments} ariaLabel={barLabel} />

            <ul>
                <li>
                    <strong>{pctEn(correct)}</strong> — correct verdict
                </li>
                <li>
                    <strong>{pctEn(prudence)}</strong> — caution: Check-IA chose not to rule
                </li>
                <li>
                    <strong>{pctEn(wrong)}</strong> — wrong verdict
                </li>
            </ul>

            <p>
                When Check-IA does rule, its verdict is correct <strong>{pctEn(decisive)}</strong> of the time.
            </p>
            <p>
                False claims wrongly validated as true: <strong>{pctEn(falseValidated)}</strong>.
            </p>
            <p>
                Median response time: about <strong>{medianSeconds} seconds</strong>.
            </p>

            <h2>Methodology in brief</h2>
            <p>
                The evaluation covers verification of French-language text. {n} claims were built from
                verifications published by independent Malian fact-checking organizations (Benbere and Voix de
                Mopti), rephrased the way a user would submit them. Ground truth was re-checked against events
                through {dateEn}, then every claim was submitted to the production system. {nPrimary} claims have
                a strictly true-or-false reference verdict; the remaining {n - nPrimary} belong to nuanced
                categories (misleading, out of context) and are reported separately in the methodology note.
            </p>
            <p>
                The fact-checkers named above are the authors of the original verifications; they did not
                supervise or endorse this evaluation.
            </p>
            <p>
                <a href="/methodology-checkia-v1-en.pdf">Download the methodology note (PDF)</a>
            </p>

            <h2>Limitations</h2>
            <p>
                The corpus is mostly made up of false claims, reflecting what fact-checkers publish. Claims
                about images or videos have limitations of their own, detailed in the methodology note. These
                results are as of {dateEn}; subsequent evaluations will be published on this page (v2, v3, …).
            </p>
        </article>
    );
}
