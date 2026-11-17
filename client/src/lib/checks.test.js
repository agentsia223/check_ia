afterEach(() => {
    vi.doUnmock("./upload");
    vi.resetModules();
});

test("createImageCheck sends the multipart form through the on-demand upload module", async () => {
    const apiUpload = vi.fn(() => Promise.resolve({ id: "img001" }));
    vi.doMock("./upload", () => ({ apiUpload }));
    const { createImageCheck } = await import("./checks");
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const onProgress = vi.fn();

    await expect(createImageCheck({ file, kind: "image_ai", onProgress })).resolves.toEqual({ id: "img001" });

    const [path, formData, progress] = apiUpload.mock.calls[0];
    expect(path).toBe("checks/");
    expect(formData.get("kind")).toBe("image_ai");
    expect(formData.get("image")).toBeInstanceOf(File);
    expect(formData.get("claim_text")).toBe("");
    expect(progress).toBe(onProgress);
});

test("createImageCheck reports a failed download of the upload code as a network failure", async () => {
    vi.doMock("./upload", () => {
        throw new Error("Failed to fetch dynamically imported module");
    });
    const { createImageCheck } = await import("./checks");
    const { ApiError } = await import("./api");
    const error = await createImageCheck({ file: new File(["x"], "p.jpg"), kind: "image_content" }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe("network");
});
