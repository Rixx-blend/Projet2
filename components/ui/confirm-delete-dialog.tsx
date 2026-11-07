"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ConfirmDeleteDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Supprimer définitivement",
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  error?: string | null;
  onConfirm: () => Promise<boolean>;
}) {
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (pending) return;
    setPending(true);
    try {
      if (await onConfirm()) onClose();
    } catch (cause) {
      console.error("[OrderBoard] Suppression impossible", cause);
    } finally {
      setPending(false);
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <Dialog open={open} onClose={() => { if (!pending) onClose(); }} title="Confirmer la suppression" className="max-w-md">
      <div className="space-y-4">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-danger/25 bg-danger/10 text-danger">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
          </div>
        </div>
        {error ? (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>Annuler</Button>
          <Button type="button" variant="danger" disabled={pending} onClick={() => void confirm()}>
            <Trash2 className="size-3.5" /> {pending ? "Suppression…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>,
    document.body,
  );
}
