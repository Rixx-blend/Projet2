"use client";

import { useCallback, useState } from "react";
import { Tldraw, loadSnapshot, type Editor } from "tldraw";

export function WorkboardPreview({ id }: { id: string }) {
  const [loaded, setLoaded] = useState(false);

  // Tldraw's onMount callback must return void, not Promise<void>.
  // Run the asynchronous preview fetch in a detached task.
  const mount = useCallback((editor: Editor) => {
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    editor.updateInstanceState({ isReadonly: true });
    void (async () => {
      try {
        const response = await fetch(`/api/workboards/${id}`);
        if (response.ok) {
          const data = await response.json();
          const snapshot = data.workboard?.snapshot;
          if (snapshot && typeof snapshot === "object") {
            const value = snapshot as Record<string, unknown>;
            const document = value.document ?? (value.store && value.schema ? value : null);
            if (document) loadSnapshot(editor.store, { document } as never);
            // Sans ce cadrage, la caméra reste à l'origine et l'aperçu paraît vide.
            if (editor.getCurrentPageShapeIds().size > 0) {
              editor.zoomToFit({ animation: { duration: 0 } });
            }
          }
        }
      } catch {
        // Une vignette indisponible ne bloque jamais la bibliothèque.
      } finally {
        setLoaded(true);
      }
    })();
  }, [id]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-90" aria-label="Aperçu du canvas">
      <Tldraw hideUi onMount={mount} />
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#282A28] via-[#1D1F1D] to-[#252825]" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
    </div>
  );
}
