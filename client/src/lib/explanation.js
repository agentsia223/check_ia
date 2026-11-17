// The analysis models write their explanation with light Markdown ("**Texte** : ...").
// The page shows it as plain paragraphs, so the markers must become real emphasis
// instead of literal asterisks. Never render the text as HTML: it is model output.

/**
 * @typedef {{text: string, strong: boolean}} Segment
 */

/**
 * Split one paragraph of an explanation into plain and bold runs.
 * "1. **Texte** : lisible" -> [{text: "1. ", strong: false}, {text: "Texte", strong: true}, {text: " : lisible", strong: false}]
 * @param {string} text
 * @returns {Segment[]} never empty for non-empty text; joining the `text` fields must lose no words
 */
export function boldSegments(text) {
    // split() with a capture group alternates plain, bold, plain, bold...
    const parts = String(text ?? "").split(/\*\*(\S(?:.*?\S)?)\*\*/);
    const segments = [];
    parts.forEach((part, index) => {
        // A stray, unmatched "**" is noise from the model: drop the marker, keep the words.
        const clean = index % 2 === 1 ? part : part.replaceAll("**", "");
        if (clean) segments.push({ text: clean, strong: index % 2 === 1 });
    });
    return segments.length > 0 ? segments : [{ text: "", strong: false }];
}
