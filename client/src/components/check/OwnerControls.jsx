import { useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import Notice from "../ui/Notice";
import { errorMessageFr } from "../../lib/api";
import { deleteCheck, setListed } from "../../lib/checks";
import { LISTABLE_VERDICTS } from "../../lib/verdict";
import { checkKeys, invalidateCheckLists } from "../../lib/queryKeys";
import styles from "./OwnerControls.module.css";

/**
 * Owner-only controls (spec 5.4, 6.2): the "Publier dans la bibliothèque" switch, shown
 * only for a listable verdict, and "Supprimer" with a confirmation dialog.
 * Render only for the signed-in owner (PATCH/DELETE return 401 when signed out).
 * Private to ResultView.
 * @param {{check: import("../../lib/checks").Check, onDeleted: () => void}} props
 */
export default function OwnerControls({ check, onDeleted }) {
    const queryClient = useQueryClient();
    const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const titleId = `owner${baseId}`;
    const hintId = `listed${baseId}`;
    const [saving, setSaving] = useState(false);
    const [listError, setListError] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const listable = check.state === "done" && LISTABLE_VERDICTS.includes(check.verdict);

    const toggleListed = async () => {
        setListError("");
        setSaving(true);
        try {
            const updated = await setListed(check.id, !check.listed);
            queryClient.setQueryData(checkKeys.detail(check.id), (old) =>
                updated && updated.id ? updated : old ? { ...old, listed: !check.listed } : old
            );
            // Library, home and history lists show the listed state.
            invalidateCheckLists(queryClient);
        } catch (error) {
            setListError(errorMessageFr(error));
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        setDeleteError("");
        setDeleting(true);
        try {
            await deleteCheck(check.id);
            invalidateCheckLists(queryClient);
            setConfirmOpen(false);
            onDeleted?.();
            queryClient.removeQueries({ queryKey: checkKeys.detail(check.id) });
        } catch (error) {
            setDeleteError(errorMessageFr(error));
            setDeleting(false);
        }
    };

    return (
        <section className={styles.owner} aria-labelledby={titleId}>
            <h2 id={titleId} className={styles.title}>
                Votre vérification
            </h2>

            {listable && (
                <div className={styles.listed}>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={check.listed}
                        aria-describedby={hintId}
                        className={styles.switch}
                        onClick={toggleListed}
                        disabled={saving}
                        aria-busy={saving || undefined}
                    >
                        <span className={styles.track} aria-hidden="true">
                            <span className={styles.thumb} />
                        </span>
                        <span className={styles.switchLabel}>Publier dans la bibliothèque</span>
                    </button>
                    <p id={hintId} className={styles.hint}>
                        {check.listed
                            ? "Visible dans la bibliothèque et par les moteurs de recherche."
                            : "Non publiée : seules les personnes qui ont le lien peuvent la voir."}
                    </p>
                    {listError && <Notice tone="error">{listError}</Notice>}
                </div>
            )}

            <Dialog.Root
                open={confirmOpen}
                onOpenChange={(open) => {
                    setConfirmOpen(open);
                    if (!open) setDeleteError("");
                }}
            >
                <Dialog.Trigger asChild>
                    <Button variant="ghost" size="sm" className={styles.delete}>
                        <Icon name="trash" />
                        Supprimer
                    </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className={styles.overlay} />
                    <Dialog.Content className={styles.dialog}>
                        <Dialog.Title className={styles.dialogTitle}>Supprimer cette vérification ?</Dialog.Title>
                        <Dialog.Description className={styles.dialogText}>
                            Le lien ne fonctionnera plus et la vérification disparaîtra de votre historique. Cette
                            action est définitive.
                        </Dialog.Description>
                        {deleteError && <Notice tone="error">{deleteError}</Notice>}
                        <div className={styles.dialogActions}>
                            <Dialog.Close asChild>
                                <Button variant="secondary">Annuler</Button>
                            </Dialog.Close>
                            <Button className={styles.danger} onClick={confirmDelete} loading={deleting}>
                                Supprimer définitivement
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </section>
    );
}
