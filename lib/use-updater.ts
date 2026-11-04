"use client";

import { useEffect, useState } from "react";

export type UpdaterState = {
  status:
    | "idle"
    | "checking"
    | "available"
    | "none"
    | "downloading"
    | "ready"
    | "error"
    | "unsupported";
  current: string;
  version: string | null;
  progress: number;
  error: string | null;
  message: string | null;
};

type UpdaterBridge = {
  getState: () => Promise<UpdaterState>;
  check: () => Promise<UpdaterState>;
  download: () => Promise<UpdaterState>;
  install: () => Promise<void>;
  onState: (callback: (state: UpdaterState) => void) => () => void;
};

declare global {
  interface Window {
    orderboardUpdater?: UpdaterBridge;
  }
}

/** État des mises à jour. `null` hors de l'application de bureau (simple navigateur). */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const bridge = window.orderboardUpdater;
    if (!bridge) return;
    let active = true;
    bridge
      .getState()
      .then((initial) => {
        if (!active) return;
        setAvailable(true);
        setState(initial);
      })
      .catch(() => undefined);
    const off = bridge.onState((next) => {
      if (!active) return;
      setAvailable(true);
      setState(next);
    });
    return () => {
      active = false;
      off();
    };
  }, []);

  return {
    state,
    desktop: available,
    check: () => window.orderboardUpdater?.check(),
    download: () => window.orderboardUpdater?.download(),
    install: () => window.orderboardUpdater?.install(),
  };
}
