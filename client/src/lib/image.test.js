import { validateImage, compressImage, MAX_IMAGE_BYTES } from "./image";

const makeFile = (type = "image/png", size = 1000, name = "photo.png") => {
    const file = new File(["x"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
};

describe("validateImage", () => {
    test.each([["image/jpeg"], ["image/png"], ["image/webp"]])("accepts %s", (type) => {
        expect(validateImage(makeFile(type))).toBeNull();
    });

    test.each([["image/gif"], ["application/pdf"], [""]])("refuses %s as type", (type) => {
        expect(validateImage(makeFile(type))).toBe("type");
    });

    test("refuses files over 10 MB", () => {
        expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
        expect(validateImage(makeFile("image/jpeg", MAX_IMAGE_BYTES))).toBeNull();
        expect(validateImage(makeFile("image/jpeg", MAX_IMAGE_BYTES + 1))).toBe("size");
    });

    test("refuses a missing file as type", () => {
        expect(validateImage(null)).toBe("type");
    });
});

describe("compressImage", () => {
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    let drawImage;
    let context;

    const stubCanvas = ({ width, height, outSize }) => {
        globalThis.createImageBitmap = vi.fn(() =>
            Promise.resolve({ width, height, close: vi.fn() })
        );
        drawImage = vi.fn();
        context = { drawImage, fillRect: vi.fn(), fillStyle: "" };
        HTMLCanvasElement.prototype.getContext = vi.fn(() => context);
        HTMLCanvasElement.prototype.toBlob = function toBlob(cb, type) {
            const blob = new Blob(["y"], { type });
            Object.defineProperty(blob, "size", { value: outSize });
            cb(blob);
        };
    };

    afterEach(() => {
        globalThis.createImageBitmap = originalCreateImageBitmap;
        HTMLCanvasElement.prototype.getContext = originalGetContext;
        HTMLCanvasElement.prototype.toBlob = originalToBlob;
    });

    test("downscales a large image to a JPEG with the longest side at maxSide", async () => {
        stubCanvas({ width: 4000, height: 2000, outSize: 300_000 });
        const file = makeFile("image/png", 5_000_000, "grande.png");

        const out = await compressImage(file);

        expect(out).not.toBe(file);
        expect(out.type).toBe("image/jpeg");
        expect(out.name).toBe("grande.jpg");
        expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 800);
        // Transparent areas become white, not black, in the JPEG.
        expect(context.fillStyle).toBe("white");
        expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1600, 800);
        expect(context.fillRect.mock.invocationCallOrder[0]).toBeLessThan(drawImage.mock.invocationCallOrder[0]);
    });

    test("returns the original when re-encoding would not make it smaller", async () => {
        stubCanvas({ width: 800, height: 600, outSize: 2_000 });
        const file = makeFile("image/jpeg", 1_000, "petite.jpg");

        await expect(compressImage(file)).resolves.toBe(file);
    });

    test("returns the original when the browser cannot decode the image", async () => {
        globalThis.createImageBitmap = vi.fn(() => Promise.reject(new Error("decode")));
        const file = makeFile("image/jpeg", 1_000);

        await expect(compressImage(file)).resolves.toBe(file);
    });

    test("returns the original when canvas encoding is unavailable", async () => {
        stubCanvas({ width: 3000, height: 3000, outSize: 1 });
        HTMLCanvasElement.prototype.toBlob = function toBlob(cb) {
            cb(null);
        };
        const file = makeFile("image/jpeg", 9_000_000);

        await expect(compressImage(file, { maxSide: 1000, quality: 0.7 })).resolves.toBe(file);
    });
});
