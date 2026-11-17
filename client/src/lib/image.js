// Client-side image checks. Compression before upload is in compressImage.js (loaded on demand).

export const ACCEPTED_IMAGE_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Messages for `validateImage` results. */
export const IMAGE_ERRORS = Object.freeze({
    type: "Ce fichier n'est pas une image prise en charge. Choisissez une image JPEG, PNG ou WebP.",
    size: "Cette image dépasse 10 Mo. Choisissez une image plus légère, ou envoyez une capture d'écran.",
});

/**
 * @param {File | null | undefined} file
 * @returns {null | "type" | "size"} null when the file can be sent.
 */
export function validateImage(file) {
    if (!file || !ACCEPTED_IMAGE_TYPES.includes(file.type)) return "type";
    if (file.size > MAX_IMAGE_BYTES) return "size";
    return null;
}
