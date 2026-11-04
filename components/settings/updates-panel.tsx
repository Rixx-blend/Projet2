"use client";

import { CheckCircle2, Download, Loader2, RefreshCw, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUpdater } from "@/lib/use-updater";

/** Mises à jour : vérifier, télécharger, installer (application de bureau uniquement). */
export function UpdatesPanel() {
  const { state, desktop, check, download, install } = useUpdater();

  return (
    <section id="mises-a-jour" className="surface-card scroll-mt-6 p-5">
      <h2 className="text-[16px] font-semibold tracking-tight text-ink">Mises à jour</h2>
      <p className="mt-0.5 text-[12px] text-muted">
        Télécharge la dernière version en un clic. Tes commandes et tes réglages ne sont pas touchés.
      </p>

      {!desktop || !state ? (
        <p className="mt-4 rounded-lg border border-dashed border-line px-3 py-3 text-[13px] text-muted">
          Disponible uniquement dans l&apos;application Windows (pas dans le navigateur).
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] text-ink-soft">
            Version installée : <span className="font-medium text-ink">{state.current}</span>
          </p>

          {state.status === "unsupported" ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
              {state.message}
            </p>
          ) : null}

          {state.status === "none" ? (
            <p className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 className="size-4" /> Tu as la dernière version.
            </p>
          ) : null}

          {state.status === "available" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-ink">
                Nouvelle version <span className="font-semibold">{state.version}</span> disponible.
              </p>
              <Button size="sm" onClick={() => void download()}>
                <Download className="size-3.5" />
                Télécharger la mise à jour
              </Button>
            </div>
          ) : null}

          {state.status === "downloading" ? (
            <div>
              <p className="flex items-center gap-2 text-[13px] text-ink-soft">
                <Loader2 className="size-4 animate-spin" /> Téléchargement… {state.progress} %
              </p>
              <div
                className="mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={state.progress}
              >
                <div
                  className="h-full rounded-full bg-brand-gradient transition-all"
                  style={{ width: `${Math.max(2, state.progress)}%` }}
                />
              </div>
            </div>
          ) : null}

          {state.status === "ready" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-success">
                La version {state.version} est prête à être installée.
              </p>
              <Button size="sm" onClick={() => void install()}>
                <RotateCw className="size-3.5" />
                Redémarrer et installer
              </Button>
            </div>
          ) : null}

          {state.status === "error" ? (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              Mise à jour impossible : {state.error}
            </p>
          ) : null}

          {state.status !== "unsupported" &&
          state.status !== "downloading" &&
          state.status !== "ready" &&
          state.status !== "available" ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={state.status === "checking"}
              onClick={() => void check()}
            >
              {state.status === "checking" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Rechercher une mise à jour
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
