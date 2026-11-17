import { verdictInfo, LISTABLE_VERDICTS, SCALE, stateLabel, kindLabel } from "./verdict";

describe("verdictInfo", () => {
    test.each([
        ["vrai", { label: "VRAI", tone: "green" }],
        ["faux", { label: "FAUX", tone: "red" }],
        ["incertain", { label: "INCERTAIN", tone: "amber" }],
        ["ia_detectee", { label: "GÉNÉRÉE PAR IA", tone: "red" }],
        ["ia_non_detectee", { label: "PAS D'IA DÉTECTÉE", tone: "navy" }],
    ])("%s maps to its stamp", (verdict, expected) => {
        expect(verdictInfo(verdict)).toEqual(expected);
    });

    test.each([["analyse"], [null], [undefined], [""], ["trompeur"]])(
        "%s has no stamp",
        (verdict) => {
            expect(verdictInfo(verdict)).toBeNull();
        }
    );
});

test("listable verdicts are the five stamped ones", () => {
    expect([...LISTABLE_VERDICTS].sort()).toEqual(
        ["faux", "ia_detectee", "ia_non_detectee", "incertain", "vrai"].sort()
    );
    expect(LISTABLE_VERDICTS).not.toContain("analyse");
});

test("the rating scale only lists verdicts the system produces today", () => {
    expect(SCALE).toEqual(["faux", "incertain", "vrai"]);
});

test("state and kind labels are French", () => {
    expect(stateLabel("running")).toBe("En cours");
    expect(stateLabel("cancelled")).toBe("Annulée");
    expect(stateLabel("error")).toBe("Erreur");
    expect(stateLabel("done")).toBe("Terminée");
    expect(stateLabel("unknown")).toBe("");
    expect(kindLabel("text")).toBe("Texte");
    expect(kindLabel("image_content")).toBe("Image");
    expect(kindLabel("image_ai")).toBe("Détection d'image IA");
    expect(kindLabel("other")).toBe("");
});
