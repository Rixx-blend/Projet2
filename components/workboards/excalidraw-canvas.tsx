"use client";

import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";

import { keepAppState, type ExcalidrawSnapshot } from "@/lib/excalidraw-scene";

export default function ExcalidrawCanvas({
  initial,
  readOnly,
  onChange,
}: {
  initial: ExcalidrawSnapshot | null;
  readOnly: boolean;
  onChange: (snapshot: ExcalidrawSnapshot) => void;
}) {
  return (
    <div className="absolute inset-0">
      <Excalidraw
        initialData={{
          elements: (initial?.elements ?? []) as never,
          // Même fond et même grille que la version bureau de l'application.
          appState: { viewBackgroundColor: "#1C1D1C", gridModeEnabled: true, gridSize: 20, ...(initial?.appState ?? {}), collaborators: new Map() } as never,
          files: (initial?.files ?? {}) as never,
        }}
        theme="dark"
        viewModeEnabled={readOnly}
        onChange={(elements, appState, files) => {
          if (readOnly) return;
          onChange({ kind: "excalidraw", elements: [...elements], appState: keepAppState(appState as unknown as Record<string, unknown>), files: files as unknown as Record<string, unknown> });
        }}
      />
    </div>
  );
}
