"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SyncStatus = "checking" | "synced" | "uploaded" | "downloaded" | "error" | "conflict";

export function CloudAccountSync() {
  const [status, setStatus] = useState<SyncStatus>("checking");
  const [message, setMessage] = useState("");
  const running = useRef(false);
  const visible = useRef(false);

  const synchronize = useCallback(async () => {
    if (running.current || !window.rixxLive) return;
    running.current = true;
    try {
      const token = await window.rixxLive.token();
      if (!token) {
        visible.current = false;
        setMessage("");
        return;
      }
      visible.current = true;
      setStatus("checking");
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json() as { ok?: boolean; status?: string; error?: string };
      if (!response.ok || !result.ok) {
        setStatus(response.status === 409 || result.status === "conflict" ? "conflict" : "error");
        setMessage(result.error || "Synchronisation impossible.");
        return;
      }
      if (result.status === "uploaded") {
        setStatus("uploaded");
        setMessage("Données envoyées sur le cloud");
      } else if (result.status === "downloaded") {
        setStatus("downloaded");
        setMessage("Données récupérées depuis le cloud");
        // Le serveur Next relit les données à chaque requête. Un rechargement
        // permet aux écrans déjà ouverts d'afficher le nouvel état.
        window.setTimeout(() => window.location.reload(), 700);
      } else {
        setStatus("synced");
        setMessage(result.status === "empty" ? "Synchronisation cloud prête" : "Données synchronisées");
      }
    } catch {
      setStatus("error");
      setMessage("Cloud indisponible. Les données locales restent intactes.");
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void synchronize();
    const interval = window.setInterval(() => void synchronize(), 30_000);
    const onFocus = () => void synchronize();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [synchronize]);

  if (!visible.current && !message) return null;

  const tone = status === "error" || status === "conflict"
    ? "border-red-400/20 bg-red-400/10 text-red-200"
    : "border-white/10 bg-[#222423]/95 text-ink-soft";

  return (
    <div
      role="status"
      aria-live="polite"
      title={message}
      className={`fixed bottom-4 right-4 z-[80] flex max-w-[min(92vw,360px)] items-center gap-2 rounded-xl border px-3 py-2 text-[11px] shadow-xl backdrop-blur-xl ${tone}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status === "error" || status === "conflict" ? "bg-red-300" : "bg-emerald-300"}`} />
      <span className="truncate">{message || "Synchronisation du compte…"}</span>
    </div>
  );
}
