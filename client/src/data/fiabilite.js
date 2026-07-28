// Résultats de l'évaluation de fiabilité de Check-IA.
// Publier une nouvelle évaluation (v2, v3, …) = modifier ce seul fichier.
export const fiabilite = {
    version: "v1",
    date: "juillet 2026",
    dateEn: "July 2026",
    n: 396,
    nPrimary: 371,
    correct: 72.8,
    prudence: 24.3,
    wrong: 3.0,
    decisive: 96.1,
    falseValidated: 1.7,
    medianSeconds: 30,
};

// 72.8 -> "72,8 %"  (décimale française, espace avant le %)
export const pctFr = (value) => `${value.toFixed(1).replace(".", ",")} %`;

// 72.8 -> "72.8%"
export const pctEn = (value) => `${value.toFixed(1)}%`;

export default fiabilite;
