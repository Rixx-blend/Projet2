"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OrderBoard]", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Erreur</p>
        <h1 className="mt-2 text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted">
          {error.message || "Impossible de charger cette page."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-strong"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
