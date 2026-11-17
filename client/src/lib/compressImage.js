// Image compression before upload. Loaded on demand, when an image check is sent.

const canvasToBlob = (canvas, quality) =>
    new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    });

const jpegName = (name) => `${(name || "image").replace(/\.[^.]+$/, "")}.jpg`;

/**
 * Resize to `maxSide` and re-encode as JPEG.
 * @param {File} file
 * @param {{maxSide?: number, quality?: number}} [options]
 * @returns {Promise<File>} the compressed JPEG, or the original file when it is already
 *   smaller or the browser cannot decode or encode it.
 */
export async function compressImage(file, { maxSide = 1600, quality = 0.8 } = {}) {
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        // JPEG has no alpha: paint white first so transparent PNG areas do not turn black.
        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);

        const blob = await canvasToBlob(canvas, quality);
        if (!blob) return file;
        if (scale === 1 && blob.size >= file.size) return file;
        return new File([blob], jpegName(file.name), { type: "image/jpeg" });
    } catch {
        return file;
    } finally {
        bitmap?.close?.();
    }
}
