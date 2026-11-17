import { forwardRef, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import Notice from "../ui/Notice";
import TextMode from "./TextMode";
import { apiFetch } from "../../lib/api";
import { useVoiceDictation } from "../../hooks/useVoiceDictation";
import styles from "./VoiceMode.module.css";

const TRANSLATED_HINT = "Traduit du bambara. Corrigez le texte si besoin avant de vérifier.";

function SignInInvitation() {
    const location = useLocation();
    return (
        <div className={styles.invite}>
            <Icon name="mic" size={28} className={styles.inviteIcon} />
            <p className={styles.inviteTitle}>La dictée en bambara demande un compte.</p>
            <p className={styles.inviteText}>
                Connectez-vous pour dicter votre affirmation en bambara. Elle est traduite en français, et vous la
                relisez avant de lancer la vérification. Sans compte, vous pouvez l'écrire dans l'onglet Texte.
            </p>
            <div className={styles.inviteActions}>
                <Button to="/connexion" state={{ from: location }}>
                    Se connecter
                </Button>
                <Button to="/inscription" state={{ from: location }} variant="secondary">
                    Créer un compte
                </Button>
            </div>
        </div>
    );
}

const Recorder = forwardRef(function Recorder({ value, onChange, onDictated, translated, busy }, ref) {
    // Wake the sleeping voice service while the person gets ready to speak. Failures don't matter.
    const warmed = useRef(false);
    useEffect(() => {
        if (warmed.current) return;
        warmed.current = true;
        Promise.resolve(apiFetch("bambara/warm/", { method: "POST" })).catch(() => {});
    }, []);

    const voice = useVoiceDictation({
        isLoggedIn: true,
        language: "bm",
        onText: onDictated,
        enabled: !busy,
    });
    const { phase, transcript, isTouch, notice } = voice;
    const isRecording = phase === "recording";
    const isTranscribing = phase === "transcribing";
    const disabled = isTranscribing || busy;

    // Touch: press and hold (plus Enter/Space for a keyboard). Pointer devices: click or Space.
    const pressHandlers = isTouch
        ? {
              onPointerDown: voice.start,
              onPointerUp: voice.stop,
              onPointerLeave: voice.stop,
              onPointerCancel: voice.stop,
              onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      voice.toggle();
                  }
              },
          }
        : { onClick: voice.toggle };

    const subtitle = isTouch
        ? "Maintenez le micro pour parler."
        : "Appuyez sur le micro ou utilisez la touche Espace pour parler.";

    let actionLabel;
    if (isTranscribing) actionLabel = "Transcription en cours…";
    else if (isRecording) actionLabel = isTouch ? "Relâchez pour arrêter" : "Cliquez ou appuyez sur Espace pour arrêter";
    else actionLabel = isTouch ? "Maintenez pour parler" : "Appuyez pour parler";

    let statusText = "Prêt à écouter";
    if (isRecording) statusText = "Écoute en cours…";
    else if (isTranscribing) statusText = "Transcription et traduction…";

    return (
        <div className={styles.voice}>
            <div className={styles.recorder} data-phase={phase}>
                <p className={styles.title}>Dicter en bambara</p>
                <p className={styles.subtitle}>{subtitle}</p>

                <div className={styles.micWrap}>
                    {!disabled && <span className={styles.ring} aria-hidden="true" />}
                    <button
                        type="button"
                        className={styles.mic}
                        aria-label={isRecording ? "Arrêter l'enregistrement" : "Enregistrer en bambara"}
                        disabled={disabled}
                        {...pressHandlers}
                    >
                        <Icon name="mic" size={34} />
                    </button>
                </div>

                <p className={styles.action}>{actionLabel}</p>
                <p className={styles.status} aria-live="polite">
                    <span className={styles.dot} aria-hidden="true" />
                    {statusText}
                </p>
                {transcript && <p className={styles.transcript}>{`Transcription bambara : ${transcript}`}</p>}
            </div>

            {notice && (
                <Notice tone={notice.tone} className={styles.notice}>
                    {notice.message}
                </Notice>
            )}

            <TextMode
                ref={ref}
                value={value}
                onChange={onChange}
                label="Affirmation à vérifier (en français)"
                visibleLabel
                hint={translated ? TRANSLATED_HINT : undefined}
                placeholder="Le texte dicté s'affiche ici. Vous pouvez aussi l'écrire."
                readOnly={busy}
            />
        </div>
    );
});

/**
 * "Voix bambara" mode of the composer. Signed-out visitors get a sign-in invitation
 * (voice needs an account, spec 6.1). Signed-in users get the dictation flow: the
 * French translation lands in the field below for review; nothing is submitted here.
 * Opening the mode warms the voice service (POST bambara/warm/, failures ignored).
 * @param {{isLoggedIn: boolean, authLoading?: boolean, value: string,
 *   onChange: (value: string) => void, onDictated: (text: string) => void,
 *   translated?: boolean, busy?: boolean}} props the ref goes to the <textarea>.
 */
const VoiceMode = forwardRef(function VoiceMode(
    { isLoggedIn, authLoading = false, value, onChange, onDictated, translated = false, busy = false },
    ref
) {
    if (authLoading) {
        return (
            <p className={styles.loading} role="status">
                Chargement…
            </p>
        );
    }
    if (!isLoggedIn) return <SignInInvitation />;
    return (
        <Recorder
            ref={ref}
            value={value}
            onChange={onChange}
            onDictated={onDictated}
            translated={translated}
            busy={busy}
        />
    );
});

export default VoiceMode;
