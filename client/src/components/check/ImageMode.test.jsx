import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import Composer from "./Composer";
import { AuthContext } from "../../auth/AuthContext";
import { createImageCheck, createTextCheck } from "../../lib/checks";
import { compressImage } from "../../lib/image";
import { ApiError } from "../../lib/api";

vi.mock("../../lib/checks", () => ({
    createTextCheck: vi.fn(),
    createImageCheck: vi.fn(),
}));

vi.mock("../../lib/image", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, compressImage: vi.fn() };
});

vi.mock("../../lib/api", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, apiFetch: vi.fn(() => Promise.resolve(null)) };
});

const authValue = {
    user: null,
    isLoggedIn: false,
    loading: false,
    getAccessToken: () => null,
};

function CheckStub() {
    const { id } = useParams();
    return <p>Page de la vérification {id}</p>;
}

const renderComposer = () =>
    render(
        <AuthContext.Provider value={authValue}>
            <MemoryRouter>
                <Routes>
                    <Route path="/" element={<Composer />} />
                    <Route path="/v/:id" element={<CheckStub />} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>
    );

const imageFile = (name = "photo.jpg", type = "image/jpeg", size) => {
    const file = new File(["fake-image-bytes"], name, { type });
    if (size) Object.defineProperty(file, "size", { value: size });
    return file;
};

const openImageMode = async (user) => {
    await user.click(screen.getByRole("tab", { name: "Image" }));
    return screen.getByLabelText("Choisir l'image à vérifier");
};

const pick = (input, file) => fireEvent.change(input, { target: { files: [file] } });
const submitButton = () => screen.getByRole("button", { name: "Vérifier" });

beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:apercu");
    URL.revokeObjectURL = vi.fn();
    compressImage.mockImplementation((file) => Promise.resolve(file));
});

afterEach(() => {
    vi.clearAllMocks();
});

test("the file picker is labelled for this page and accepts JPEG, PNG and WebP", async () => {
    const user = userEvent.setup();
    renderComposer();
    const input = await openImageMode(user);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(submitButton()).toBeDisabled();
});

test("a wrong file type shows its message and does not upload", async () => {
    const user = userEvent.setup();
    renderComposer();
    const input = await openImageMode(user);
    pick(input, new File(["%PDF"], "doc.pdf", { type: "application/pdf" }));

    expect(
        screen.getByText("Ce fichier n'est pas une image prise en charge. Choisissez une image JPEG, PNG ou WebP.")
    ).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    await user.click(submitButton());
    expect(compressImage).not.toHaveBeenCalled();
    expect(createImageCheck).not.toHaveBeenCalled();
});

test("an image over 10 Mo shows its message and does not upload", async () => {
    const user = userEvent.setup();
    renderComposer();
    const input = await openImageMode(user);
    pick(input, imageFile("grande.png", "image/png", 11 * 1024 * 1024));

    expect(screen.getByText(/cette image dépasse 10 mo/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(createImageCheck).not.toHaveBeenCalled();
});

test("a valid image shows a preview made with createObjectURL, which is revoked on removal", async () => {
    const user = userEvent.setup();
    renderComposer();
    const input = await openImageMode(user);
    const file = imageFile();
    pick(input, file);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByRole("img", { name: "Aperçu de l'image choisie" })).toHaveAttribute("src", "blob:apercu");
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Retirer l'image" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:apercu");
    expect(screen.queryByRole("img", { name: "Aperçu de l'image choisie" })).not.toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
});

test("offers the two image checks as a radio choice, content first", async () => {
    const user = userEvent.setup();
    renderComposer();
    await openImageMode(user);
    const group = screen.getByRole("radiogroup", { name: /que voulez-vous vérifier/i });
    expect(within(group).getByRole("radio", { name: /vérifier le contenu/i })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /détecter une image générée par ia/i })).not.toBeChecked();
});

test("content check: compresses, then uploads with the optional claim and shows progress", async () => {
    const user = userEvent.setup();
    const compressed = imageFile("photo.jpg", "image/jpeg");
    compressImage.mockResolvedValue(compressed);
    let finish;
    let progress;
    createImageCheck.mockImplementation(({ onProgress }) => {
        progress = onProgress;
        return new Promise((resolve) => (finish = resolve));
    });
    renderComposer();
    const input = await openImageMode(user);
    const original = imageFile("original.png", "image/png");
    pick(input, original);
    await user.type(screen.getByLabelText(/texte reçu avec l'image/i), "Inondation à Ségou");
    await user.click(submitButton());

    expect(compressImage).toHaveBeenCalledWith(original);
    expect(createImageCheck).toHaveBeenCalledWith(
        expect.objectContaining({ file: compressed, kind: "image_content", claimText: "Inondation à Ségou" })
    );

    act(() => progress(0.45));
    const bar = screen.getByRole("progressbar", { name: /envoi de l'image/i });
    expect(bar).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByText(/45\s%/)).toBeInTheDocument();

    await act(async () => finish({ id: "img001" }));
    expect(await screen.findByText("Page de la vérification img001")).toBeInTheDocument();
});

test("AI detection: sends kind image_ai and no claim (the server ignores it)", async () => {
    const user = userEvent.setup();
    createImageCheck.mockResolvedValue({ id: "ia0001" });
    renderComposer();
    const input = await openImageMode(user);
    pick(input, imageFile());
    await user.click(screen.getByRole("radio", { name: /détecter une image générée par ia/i }));
    expect(screen.queryByLabelText(/texte reçu avec l'image/i)).not.toBeInTheDocument();
    await user.click(submitButton());

    expect(createImageCheck).toHaveBeenCalledWith(expect.objectContaining({ kind: "image_ai", claimText: "" }));
    expect(await screen.findByText("Page de la vérification ia0001")).toBeInTheDocument();
});

test("Ctrl+Enter submits the image from the claim field", async () => {
    const user = userEvent.setup();
    createImageCheck.mockResolvedValue({ id: "kbdimg" });
    renderComposer();
    const input = await openImageMode(user);
    pick(input, imageFile());
    await user.click(screen.getByLabelText(/texte reçu avec l'image/i));
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(await screen.findByText("Page de la vérification kbdimg")).toBeInTheDocument();
});

test("dropping an image on the composer switches to the Image mode", () => {
    renderComposer();
    const form = screen.getByRole("form", { name: /vérifier une information/i });
    const file = imageFile("drop.webp", "image/webp");
    fireEvent.dragOver(form, { dataTransfer: { types: ["Files"], files: [file] } });
    fireEvent.drop(form, { dataTransfer: { types: ["Files"], files: [file] } });

    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("drop.webp")).toBeInTheDocument();
});

test("pasting an image switches to the Image mode; pasting text does not", () => {
    renderComposer();
    const box = screen.getByRole("textbox", { name: "Affirmation à vérifier" });
    fireEvent.paste(box, { clipboardData: { files: [], getData: () => "du texte" } });
    expect(screen.getByRole("tab", { name: "Texte" })).toHaveAttribute("aria-selected", "true");

    const file = imageFile("capture.png", "image/png");
    fireEvent.paste(box, { clipboardData: { files: [file], getData: () => "" } });
    expect(screen.getByRole("tab", { name: "Image" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("capture.png")).toBeInTheDocument();
});

test("a dropped file of the wrong type shows the type message", () => {
    renderComposer();
    const form = screen.getByRole("form", { name: /vérifier une information/i });
    const file = new File(["x"], "clip.gif", { type: "image/gif" });
    fireEvent.drop(form, { dataTransfer: { types: ["Files"], files: [file] } });
    expect(screen.getByText(/ce fichier n'est pas une image prise en charge/i)).toBeInTheDocument();
    expect(createTextCheck).not.toHaveBeenCalled();
});

test("an upload error keeps the image and shows a French message", async () => {
    const user = userEvent.setup();
    createImageCheck.mockRejectedValue(new ApiError(0, "network"));
    renderComposer();
    const input = await openImageMode(user);
    pick(input, imageFile());
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/connexion impossible/i);
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
