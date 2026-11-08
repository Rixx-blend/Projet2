"use client";

import "@excalidraw/excalidraw/index.css";
import "./excalidraw-skin.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { keepAppState, type ExcalidrawSnapshot } from "@/lib/excalidraw-scene";

export default function ExcalidrawCanvas({
  initial,
  readOnly,
  onChange,
  onApi,
  onPointer,
}: {
  initial: ExcalidrawSnapshot | null;
  readOnly: boolean;
  onChange: (snapshot: ExcalidrawSnapshot) => void;
  onApi?: (api: ExcalidrawImperativeAPI | null) => void;
  onPointer?: (x: number, y: number) => void;
}) {
  const setInstance = (instance: ExcalidrawImperativeAPI) => onApi?.(instance);

  return (
    <div className="wb-canvas absolute inset-0">
      <Excalidraw
        theme="dark"
        excalidrawAPI={setInstance}
        onPointerUpdate={(payload) => onPointer?.(payload.pointer.x, payload.pointer.y)}
        initialData={{
          elements: (initial?.elements ?? []) as never,
          appState: { viewBackgroundColor: "transparent", gridModeEnabled: false, ...(initial?.appState ?? {}), collaborators: new Map() } as never,
          files: (initial?.files ?? {}) as never,
        }}
        viewModeEnabled={readOnly}
        onChange={(elements, appState, files) => {
          if (readOnly) return;
          onChange({ kind: "excalidraw", elements: [...elements], appState: keepAppState(appState as unknown as Record<string, unknown>), files: files as unknown as Record<string, unknown> });
        }}
      />
    </div>
  );
}
