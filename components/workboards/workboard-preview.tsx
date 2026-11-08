"use client";

import { useEffect, useRef, useState } from "react";

import { isExcalidrawSnapshot } from "@/lib/excalidraw-scene";

// Aperçu statique (SVG) : léger, sans canvas interactif dans chaque carte.
export function WorkboardPreview({ id }: { id: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "empty" | "old" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/workboards/${id}`);
        const data = await response.json();
        const snapshot = data.workboard?.snapshot;
        if (!isExcalidrawSnapshot(snapshot) || snapshot.elements.length === 0) {
          if (!cancelled) setState(snapshot ? "old" : "empty");
          return;
        }
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({
          elements: snapshot.elements as never,
          appState: { ...snapshot.appState, exportBackground: true, exportWithDarkMode: true } as never,
          files: snapshot.files as never,
        });
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.style.width = "100%";
        svg.style.height = "100%";
        if (!cancelled && container.current) {
          container.current.replaceChildren(svg);
          setState("ready");
        }
      } catch {
        if (!cancelled) setState("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-label="Aperçu de la planche">
      <div ref={container} className="absolute inset-0" />
      {state !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center text-[11px] text-white/35">
          {state === "loading" ? "" : state === "old" ? "Ancienne planche" : "Planche vierge"}
        </div>
      ) : null}
    </div>
  );
}
