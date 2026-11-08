// Format enregistré pour les planches Excalidraw.
// Les anciennes planches tldraw ont un autre format : elles ne sont jamais réécrites.
export type ExcalidrawSnapshot = {
  kind: "excalidraw";
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export function isExcalidrawSnapshot(value: unknown): value is ExcalidrawSnapshot {
  return !!value && typeof value === "object" && (value as { kind?: unknown }).kind === "excalidraw" && Array.isArray((value as { elements?: unknown }).elements);
}

// On ne garde que les réglages utiles de l'état d'affichage (pas la sélection ni l'outil actif).
export function keepAppState(appState: Record<string, unknown>) {
  return {
    viewBackgroundColor: appState.viewBackgroundColor,
    gridSize: appState.gridSize,
    gridModeEnabled: appState.gridModeEnabled,
  };
}
