"use client";

import "@excalidraw/excalidraw/index.css";
import "./excalidraw-skin.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useState } from "react";

import { WorkboardToolbar } from "@/components/workboards/excalidraw-toolbar";
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
  const [tool, setTool] = useState("selection");

  return (
    <div className="wb-canvas absolute inset-0">
      <Excalidraw
        theme="dark"
        excalidrawAPI={(instance) => setApi(instance)}
        initialData={{
          elements: (initial?.elements ?? []) as never,
          appState: { viewBackgroundColor: "transparent", gridModeEnabled: false, ...(initial?.appState ?? {}), collaborators: new Map() } as never,
          files: (initial?.files ?? {}) as never,
        }}
        viewModeEnabled={readOnly}
        onChange={(elements, appState, files) => {
          setTool((appState as unknown as { activeTool: { type: string } }).activeTool.type);
          if (readOnly) return;
          onChange({ kind: "excalidraw", elements: [...elements], appState: keepAppState(appState as unknown as Record<string, unknown>), files: files as unknown as Record<string, unknown> });
        }}
      />
      {!readOnly ? <WorkboardToolbar active={tool} onPick={(type) => api?.setActiveTool({ type: type as never })} /> : null}
    </div>
  );
}
