"use client";

import "@excalidraw/excalidraw/index.css";
import "./excalidraw-skin.css";
import { useCallback, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { keepAppState, type ExcalidrawSnapshot } from "@/lib/excalidraw-scene";
import { StylePanel } from "@/components/workboards/style-panel";

function viewKey(appState: Record<string, unknown>, elements: { id: string; type: string; [k: string]: unknown }[]) {
  const selected = Object.keys((appState.selectedElementIds as Record<string, boolean>) ?? {}).filter((id) => (appState.selectedElementIds as Record<string, boolean>)[id]);
  const picked = elements.filter((e) => selected.includes(e.id)).map((e) => [e.id, e.strokeColor, e.backgroundColor, e.fillStyle, e.strokeWidth, e.strokeStyle, e.roughness, e.opacity, e.fontSize, e.fontFamily, e.textAlign]);
  const tool = (appState.activeTool as { type?: string } | undefined)?.type;
  const current = ["StrokeColor", "BackgroundColor", "FillStyle", "StrokeWidth", "StrokeStyle", "Roughness", "Opacity", "FontSize", "FontFamily", "TextAlign"].map((k) => appState[`currentItem${k}`]);
  return JSON.stringify([tool, picked, current]);
}

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
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const viewKeyRef = useRef("");
  const [view, setView] = useState<{ appState: Record<string, unknown>; elements: readonly unknown[] } | null>(null);
  // Appelée une seule fois : une référence stable évite une boucle de rendu.
  const onApiRef = useRef(onApi);
  onApiRef.current = onApi;
  const setInstance = useCallback((instance: ExcalidrawImperativeAPI) => {
    setApi(instance);
    setView({ appState: instance.getAppState() as unknown as Record<string, unknown>, elements: instance.getSceneElements() });
    onApiRef.current?.(instance);
  }, []);

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
          // Le panneau ne se redessine que si ce qu'il affiche change (sinon boucle de rendu).
          const key = viewKey(appState as unknown as Record<string, unknown>, elements as never);
          if (key !== viewKeyRef.current) {
            viewKeyRef.current = key;
            setView({ appState: appState as unknown as Record<string, unknown>, elements });
          }
          if (readOnly) return;
          onChange({ kind: "excalidraw", elements: [...elements], appState: keepAppState(appState as unknown as Record<string, unknown>), files: files as unknown as Record<string, unknown> });
        }}
      />
      {!readOnly && view ? <StylePanel api={api} appState={view.appState} elements={view.elements as never} /> : null}
    </div>
  );
}
