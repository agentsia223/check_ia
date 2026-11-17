import { boldSegments } from "./explanation";

const plain = (text) => ({ text, strong: false });
const bold = (text) => ({ text, strong: true });

test("turns **markers** into bold segments", () => {
    expect(boldSegments("1. **Texte et inscriptions** : lisible")).toEqual([
        plain("1. "),
        bold("Texte et inscriptions"),
        plain(" : lisible"),
    ]);
});

test("handles several bold runs and a bold start", () => {
    expect(boldSegments("**Vrai** ou **faux** ?")).toEqual([bold("Vrai"), plain(" ou "), bold("faux"), plain(" ?")]);
});

test("leaves text without markers untouched", () => {
    expect(boldSegments("Une phrase simple.")).toEqual([plain("Une phrase simple.")]);
});

test("drops an unmatched marker but keeps every word", () => {
    expect(boldSegments("Un **marqueur orphelin")).toEqual([plain("Un marqueur orphelin")]);
});

test("keeps single asterisks, which may be real characters", () => {
    expect(boldSegments("2 * 3 = 6 et *note*")).toEqual([plain("2 * 3 = 6 et *note*")]);
});

test("never returns an empty list", () => {
    expect(boldSegments("")).toEqual([plain("")]);
    expect(boldSegments(undefined)).toEqual([plain("")]);
});
