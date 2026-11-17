// The composer's lazy parts (Image mode, failure notice, image compression) when they
// have not been preloaded yet. Each test imports a fresh Composer module.
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../lib/checks", () => ({
    createTextCheck: vi.fn(),
    createImageCheck: vi.fn(),
}));

vi.mock("../../lib/compressImage", () => ({ compressImage: vi.fn((file) => Promise.resolve(file)) }));

const authValue = { user: null, isLoggedIn: false, loading: false, getAccessToken: () => null };

async function renderFreshComposer() {
    vi.resetModules();
    const { MemoryRouter, Route, Routes } = await import("react-router-dom");
    const { AuthContext } = await import("../../auth/AuthContext");
    const { default: Composer, preloadComposerParts } = await import("./Composer");
    const checks = await import("../../lib/checks");
    const { ApiError } = await import("../../lib/api");
    const { compressImage } = await import("../../lib/compressImage");
    render(
        <AuthContext.Provider value={authValue}>
            <MemoryRouter>
                <Routes>
                    <Route path="/" element={<Composer />} />
                    <Route path="/v/:id" element={<p>Page de la vérification</p>} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );
    return { preloadComposerParts, checks, ApiError, compressImage };
}

beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:apercu");
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.clearAllMocks();
});

test("the Image mode shows a loading line until it has loaded", async () => {
    await renderFreshComposer();
    fireEvent.click(screen.getByRole("tab", { name: "Image" }));
    expect(screen.getByRole("status")).toHaveTextContent("Chargement…");
    expect(await screen.findByLabelText("Choisir l'image à vérifier")).toBeInTheDocument();
});

test("once preloaded (focus in the composer), the Image mode opens at once", async () => {
    const { preloadComposerParts } = await renderFreshComposer();
    fireEvent.focusIn(screen.getByRole("textbox", { name: "Affirmation à vérifier" }));
    await act(() => preloadComposerParts());
    fireEvent.click(screen.getByRole("tab", { name: "Image" }));
    expect(screen.queryByText("Chargement…")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Choisir l'image à vérifier")).toBeInTheDocument();
});

test("the photo example focuses the file picker once the Image mode has loaded", async () => {
    await renderFreshComposer();
    fireEvent.click(screen.getByRole("button", { name: "Une photo reçue sur WhatsApp" }));
    expect(await screen.findByLabelText("Choisir l'image à vérifier")).toHaveFocus();
});

test("leaving the Image mode while it loads cancels the pending focus", async () => {
    const { preloadComposerParts } = await renderFreshComposer();
    fireEvent.click(screen.getByRole("button", { name: "Une photo reçue sur WhatsApp" }));
    fireEvent.click(screen.getByRole("tab", { name: "Texte" }));
    await act(() => preloadComposerParts());
    fireEvent.click(screen.getByRole("tab", { name: "Image" }));
    expect(screen.getByLabelText("Choisir l'image à vérifier")).not.toHaveFocus();
});

test("a failure notice that has not been preloaded still appears", async () => {
    const user = userEvent.setup();
    const { checks, ApiError } = await renderFreshComposer();
    checks.createTextCheck.mockRejectedValue(new ApiError(0, "network"));
    await user.type(screen.getByRole("textbox", { name: "Affirmation à vérifier" }), "Une affirmation");
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/connexion impossible/i);
    expect(screen.getByRole("textbox", { name: "Affirmation à vérifier" })).toHaveValue("Une affirmation");
});

test("an image is compressed with the on-demand module before upload", async () => {
    const user = userEvent.setup();
    const { checks, compressImage } = await renderFreshComposer();
    checks.createImageCheck.mockResolvedValue({ id: "img001" });
    const file = new File(["fake-image-bytes"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.click(screen.getByRole("tab", { name: "Image" }));
    fireEvent.change(await screen.findByLabelText("Choisir l'image à vérifier"), { target: { files: [file] } });
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(await screen.findByText("Page de la vérification")).toBeInTheDocument();
    expect(compressImage).toHaveBeenCalledWith(file);
    expect(checks.createImageCheck).toHaveBeenCalledWith(expect.objectContaining({ file, kind: "image_content" }));
});
