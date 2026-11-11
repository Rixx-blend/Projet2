"use client";

import { Cloud, LogOut, Loader2, UserRound } from "lucide-react";
import { useState } from "react";

import { useAppAuth } from "@/components/auth/app-auth";
import { Button } from "@/components/ui/button";

type Feedback = { tone: "ok" | "error"; text: string } | null;

export function GoogleAccountPanel() {
  const { profile } = useAppAuth();
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const available = typeof window !== "undefined" && Boolean(window.rixxLive);

  async function saveToThisAccount() {
    const confirmed = window.confirm(
      `Les données de cet ordinateur vont remplacer la sauvegarde du compte ${profile.email ?? profile.name}. Continuer ?`,
    );
    if (!confirmed || !window.rixxLive) return;
    setSaving(true);
    setFeedback(null);
    try {
      const token = await window.rixxLive.token();
      if (!token) throw new Error("Connexion Google requise.");
      const response = await fetch("/api/sync?mode=replace", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Sauvegarde impossible.");
      setFeedback({ tone: "ok", text: "Données sauvegardées sur ce compte Google." });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Sauvegarde impossible.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const confirmed = window.confirm(
      "Te déconnecter de ce compte Google ? Les données restent sur cet ordinateur.",
    );
    if (!confirmed || !window.rixxLive?.logout) return;
    setSigningOut(true);
    try {
      await window.rixxLive.logout();
      window.location.reload();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <section id="compte-google" className="surface-card scroll-mt-6 p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-accent/12 text-accent">
          <UserRound className="size-3.5" />
        </span>
        <div className="flex-1">
          <h2 className="text-[16px] font-semibold tracking-tight text-ink">Compte Google</h2>
          <p className="text-[11px] text-muted">
            {profile.email ?? profile.name}
          </p>
        </div>
      </div>

      {!available ? (
        <p className="mt-4 text-[12px] text-muted">
          La gestion du compte est disponible dans l’application de bureau.
        </p>
      ) : (
        <>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Sauvegarde les commandes, clients, planches, réglages et ton profil sur ce compte Google.
            Les fichiers importés restent sur cet ordinateur.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={saveToThisAccount}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Cloud className="size-3.5" />}
              Sauvegarder mes données sur ce compte
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={signingOut} onClick={signOut}>
              {signingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
              Se déconnecter
            </Button>
          </div>
          {feedback ? (
            <p
              role="status"
              className={
                feedback.tone === "ok"
                  ? "mt-3 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] text-success"
                  : "mt-3 rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] text-danger"
              }
            >
              {feedback.text}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
