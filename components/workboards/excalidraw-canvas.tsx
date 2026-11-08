"use client";

import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useState } from "react";

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
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  void api;
  return (
    <div className="absolute inset-0">
      <Excalidraw
        excalidrawAPI={(instance) => setApi(instance)}
        initialData={initial ? { elements: initial.elements as never, appState: { ...initial.appState, collaborators: new Map() } as never, files: initial.files as never } : undefined}
        viewModeEnabled={readOnly}
        onChange={(elements, appState, files) => {
          if (readOnly) return;
          onChange({ kind: "excalidraw", elements: [...elements], appState: keepAppState(appState as unknown as Record<string, unknown>), files: files as unknown as Record<string, unknown> });
        }}
      />
    </div>
  );
}
