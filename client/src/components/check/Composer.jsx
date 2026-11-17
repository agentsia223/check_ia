import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import { Tab, TabList, TabPanel, Tabs } from "../ui/Tabs";
import TextMode, { TEXT_MAX_CHARS } from "./TextMode";
import ImageMode, { IMAGE_ERRORS } from "./ImageMode";
import CreateFailureNotice from "./CreateFailureNotice";
import { useAuth } from "../../auth/AuthContext";
import { createImageCheck, createTextCheck } from "../../lib/checks";
import { compressImage, validateImage } from "../../lib/image";
import { FAILURE_MESSAGES, describeCreateFailure } from "../../lib/createFailure";
import styles from "./Composer.module.css";

// The voice recorder (and its dictation hook) loads only when its tab is opened.
const VoiceMode = lazy(() => import("./VoiceMode"));

export { FAILURE_MESSAGES };

export const EXAMPLE_CLAIM = "Le prix du carburant va doubler la semaine prochaine";

/** `?mode=` values accepted on `/` (old /verify-image and /detect-ai-image links can use `image`). */
const MODE_PARAM = Object.freeze({ texte: "text", text: "text", image: "image", voix: "voice", voice: "voice" });

/** First file of a DataTransfer (drop or paste), or null. */
function fileFrom(transfer) {
    if (!transfer) return null;
    const files = Array.from(transfer.files ?? []);
    if (files.length) return files[0];
    const item = Array.from(transfer.items ?? []).find((entry) => entry.kind === "file");
    return item?.getAsFile?.() ?? null;
}

const hasFiles = (transfer) => Array.from(transfer?.types ?? []).includes("Files");

const isMac = () =>
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

// Space on a control inside the composer activates that control; it must not reach the
// dictation hook's document-level Space shortcut. The mode tabs are left out on purpose:
// as before the rewrite, Space right after choosing "Voix bambara" starts recording.
const SPACE_OWNERS = "button:not([role='tab']), a, input, textarea, select";

/**
 * The check composer (home page): one card with three modes, Texte / Image / Voix bambara.
 * Submitting creates the check and navigates to /v/<id> as soon as the create call
 * returns. Errors keep what was typed or picked. Paste or drop an image anywhere on the
 * card (or paste anywhere on the page) to switch to the Image mode.
 */
export default function Composer() {
    const { isLoggedIn, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [mode, setModeState] = useState(() => MODE_PARAM[searchParams.get("mode")] ?? "text");
    const [text, setText] = useState("");
    const [translated, setTranslated] = useState(false);
    const [image, setImage] = useState({ file: null, error: "" });
    const [kind, setKind] = useState("image_content");
    const [claimText, setClaimText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [progress, setProgress] = useState(null);
    const [failure, setFailure] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [focusRequest, setFocusRequest] = useState(null);

    const examplesId = `examples${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const textRef = useRef(null);
    const fileRef = useRef(null);
    const rootRef = useRef(null);
    const submittingRef = useRef(false);

    // Editing what will be sent clears an old failure, except the sign-up prompt, which
    // stays until the mode changes or the visitor signs in.
    const clearFailure = useCallback(() => {
        setFailure((current) => (current && current.code !== "anon_quota" ? null : current));
    }, []);

    const modeRef = useRef(mode);
    modeRef.current = mode;
    const setMode = useCallback((next) => {
        if (modeRef.current === next) return;
        modeRef.current = next;
        setModeState(next);
        setFailure(null);
    }, []);

    useEffect(() => {
        if (isLoggedIn) setFailure((current) => (current?.code === "anon_quota" ? null : current));
    }, [isLoggedIn]);

    useEffect(() => {
        if (!focusRequest) return;
        const target = focusRequest.target === "file" ? fileRef.current : textRef.current;
        target?.focus();
    }, [focusRequest]);

    const textReady = text.trim().length > 0 && text.length <= TEXT_MAX_CHARS;
    let canSubmit;
    if (mode === "image") canSubmit = Boolean(image.file);
    else if (mode === "voice") canSubmit = isLoggedIn && textReady;
    else canSubmit = textReady;
    canSubmit = canSubmit && !submitting;

    const acceptFile = useCallback(
        (file) => {
            const problem = validateImage(file);
            setMode("image");
            clearFailure();
            setImage(problem ? { file: null, error: IMAGE_ERRORS[problem] } : { file, error: "" });
        },
        [setMode, clearFailure]
    );

    // Paste a screenshot anywhere on the page. Text pastes (which may also carry an
    // image rendering, e.g. from a word processor) keep their normal behaviour.
    useEffect(() => {
        const onPaste = (event) => {
            if (submittingRef.current) return;
            // A paste into a field elsewhere on the page (search box, sign-in form…) is
            // left alone.
            const target = event.target;
            const inField = target instanceof Element && target.closest("input, textarea, select, [contenteditable]");
            if (inField && !rootRef.current?.contains(target)) return;
            const data = event.clipboardData;
            if (data?.getData?.("text/plain")) return;
            const file = fileFrom(data);
            if (!file) return;
            event.preventDefault();
            acceptFile(file);
        };
        document.addEventListener("paste", onPaste);
        return () => document.removeEventListener("paste", onPaste);
    }, [acceptFile]);

    const changeText = (value) => {
        setText(value);
        clearFailure();
        if (!value.trim()) setTranslated(false);
    };

    const onDictated = useCallback((value) => {
        setText(value);
        setTranslated(true);
    }, []);

    const submit = async () => {
        if (!canSubmit || submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setFailure(null);
        try {
            let check;
            if (mode === "image") {
                setProgress({ stage: "prepare", fraction: 0 });
                const prepared = await compressImage(image.file);
                setProgress({ stage: "upload", fraction: 0 });
                check = await createImageCheck({
                    file: prepared,
                    kind,
                    claimText: kind === "image_content" ? claimText.trim() : "",
                    onProgress: (fraction) => setProgress({ stage: "upload", fraction }),
                });
            } else {
                check = await createTextCheck(text.trim());
            }
            navigate(`/v/${check.id}`);
        } catch (error) {
            submittingRef.current = false;
            setSubmitting(false);
            setProgress(null);
            setFailure(describeCreateFailure(error));
        }
    };

    const onSubmit = (event) => {
        event.preventDefault();
        submit();
    };

    const onKeyDown = (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            submit();
            return;
        }
        if (event.key === " " && event.target.closest?.(SPACE_OWNERS)) {
            event.stopPropagation();
        }
    };

    const onDragOver = (event) => {
        if (!hasFiles(event.dataTransfer) || submitting) return;
        event.preventDefault();
        setDragging(true);
    };

    const onDragLeave = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
    };

    const onDrop = (event) => {
        const file = fileFrom(event.dataTransfer);
        setDragging(false);
        if (!file || submitting) return;
        event.preventDefault();
        acceptFile(file);
    };

    const applyExample = () => {
        setMode("text");
        clearFailure();
        setText(EXAMPLE_CLAIM);
        setTranslated(false);
        setFocusRequest({ target: "text" });
    };

    const applyPhotoExample = () => {
        setMode("image");
        setFocusRequest({ target: "file" });
    };

    const modifier = isMac() ? "Cmd" : "Ctrl";

    return (
        <div className={styles.composer} ref={rootRef}>
            <Tabs value={mode} onValueChange={setMode}>
                <form
                    aria-label="Vérifier une information"
                    className={[styles.card, dragging ? styles.dragging : ""].filter(Boolean).join(" ")}
                    onSubmit={onSubmit}
                    onKeyDown={onKeyDown}
                    onDragOver={onDragOver}
                    onDragEnter={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    noValidate
                >
                    <TabPanel value="text" tabIndex={-1} className={styles.panel}>
                        <TextMode ref={textRef} value={text} onChange={changeText} readOnly={submitting} />
                    </TabPanel>
                    <TabPanel value="image" tabIndex={-1} className={styles.panel}>
                        <ImageMode
                            ref={fileRef}
                            file={image.file}
                            error={image.error}
                            kind={kind}
                            onKindChange={setKind}
                            claimText={claimText}
                            onClaimChange={(value) => {
                                setClaimText(value);
                                clearFailure();
                            }}
                            onSelectFile={acceptFile}
                            onRemove={() => {
                                setImage({ file: null, error: "" });
                                clearFailure();
                            }}
                            progress={progress}
                            busy={submitting}
                        />
                    </TabPanel>
                    <TabPanel value="voice" tabIndex={-1} className={styles.panel}>
                        <Suspense
                            fallback={
                                <p role="status" className={styles.voiceLoading}>
                                    Chargement…
                                </p>
                            }
                        >
                            <VoiceMode
                            ref={textRef}
                            isLoggedIn={isLoggedIn}
                            authLoading={authLoading}
                            value={text}
                            onChange={changeText}
                            onDictated={onDictated}
                            translated={translated}
                            busy={submitting}
                            />
                        </Suspense>
                    </TabPanel>

                    {dragging && (
                        <p className={styles.dropOverlay} aria-hidden="true">
                            Déposez l'image pour la vérifier
                        </p>
                    )}

                    <div className={styles.bar}>
                        <TabList aria-label="Type de vérification" className={styles.tabs}>
                            <Tab value="text" className={styles.tab}>
                                <Icon name="text" className={styles.tabIcon} />
                                Texte
                            </Tab>
                            <Tab value="image" className={styles.tab}>
                                <Icon name="img" className={styles.tabIcon} />
                                Image
                            </Tab>
                            <Tab value="voice" className={styles.tab}>
                                <Icon name="mic" className={styles.tabIcon} />
                                Voix bambara
                            </Tab>
                        </TabList>
                        <span className={styles.shortcut} aria-hidden="true">
                            <kbd>{modifier}</kbd> <kbd>Entrée</kbd>
                        </span>
                        <Button
                            type="submit"
                            className={styles.submit}
                            disabled={!canSubmit}
                            loading={submitting}
                            aria-keyshortcuts="Control+Enter Meta+Enter"
                        >
                            Vérifier
                        </Button>
                    </div>
                </form>
            </Tabs>

            {failure && (
                <CreateFailureNotice
                    failure={failure}
                    isLoggedIn={isLoggedIn}
                    onRetry={submit}
                    className={styles.notice}
                />
            )}

            <div className={styles.examples}>
                <span id={examplesId}>Essayez :</span>
                <button type="button" className={styles.chip} onClick={applyExample} aria-describedby={examplesId}>
                    {`« ${EXAMPLE_CLAIM} »`}
                </button>
                <button
                    type="button"
                    className={styles.chip}
                    onClick={applyPhotoExample}
                    aria-describedby={examplesId}
                >
                    Une photo reçue sur WhatsApp
                </button>
            </div>
        </div>
    );
}
