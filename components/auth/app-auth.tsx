"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { LIVE_BOARD_BASE } from "@/lib/live-board";

export type GoogleProfile = {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
  cursorColor?: string;
  cursorStyle?: "arrow" | "dot" | "ring" | "diamond";
};

type AuthContextValue = { profile: GoogleProfile; updateProfile: (patch: Partial<Pick<GoogleProfile, "name" | "picture" | "cursorColor" | "cursorStyle">>) => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAppAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAppAuth doit être utilisé dans AppAuthGate");
  return value;
}

async function getProfile(token: string | null): Promise<GoogleProfile | null> {
  const response = await fetch(`${LIVE_BOARD_BASE}/auth/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: token ? "omit" : "include",
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as GoogleProfile;
}

export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<GoogleProfile | null>(null);
  const [status, setStatus] = useState<"checking" | "signed-out" | "signing-in" | "ready">("checking");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const token = window.rixxLive ? await window.rixxLive.token() : null;
      const user = await getProfile(token);
      if (user) {
        let preferences: Partial<GoogleProfile> = {};
        try { preferences = JSON.parse(localStorage.getItem(`rixx.profile.${user.sub}`) || "{}"); } catch { /* Préférences locales illisibles. */ }
        let durable: Partial<GoogleProfile> = {};
        try { durable = await window.rixxLive?.loadProfile?.(user.sub) || {}; } catch { /* La copie locale reste disponible. */ }
        setProfile({ ...user, ...preferences, ...durable, email: user.email, sub: user.sub });
      } else setProfile(null);
      setStatus(user ? "ready" : "signed-out");
    } catch {
      setProfile(null);
      setStatus("signed-out");
      setError("Impossible de vérifier la connexion. Vérifie ta connexion Internet.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connectGoogle() {
    setError("");
    setStatus("signing-in");
    try {
      if (!window.rixxLive) {
        setError("La connexion Google doit être effectuée depuis l'application de bureau Rixx Studio.");
        setStatus("signed-out");
        return;
      }
      const result = await window.rixxLive.login("/");
      if (!result.ok || !result.token) {
        setError("La connexion Google a été annulée ou a expiré. Réessaie.");
        setStatus("signed-out");
        return;
      }
      const user = await getProfile(result.token);
      if (!user) {
        setError("Google a répondu, mais la session n'a pas pu être validée. Réessaie.");
        setStatus("signed-out");
        return;
      }
      let preferences: Partial<GoogleProfile> = {};
      try { preferences = JSON.parse(localStorage.getItem(`rixx.profile.${user.sub}`) || "{}"); } catch { /* Préférences locales illisibles. */ }
      let durable: Partial<GoogleProfile> = {};
      try { durable = await window.rixxLive?.loadProfile?.(user.sub) || {}; } catch { /* La copie locale reste disponible. */ }
      setProfile({ ...user, ...preferences, ...durable, email: user.email, sub: user.sub });
      setStatus("ready");
    } catch {
      setError("La connexion Google a échoué. Vérifie ta connexion Internet puis réessaie.");
      setStatus("signed-out");
    }
  }

  const updateProfile = useCallback((patch: Partial<Pick<GoogleProfile, "name" | "picture" | "cursorColor" | "cursorStyle">>) => {
    setProfile((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      try {
        const preferences = { name: next.name, picture: next.picture, cursorColor: next.cursorColor, cursorStyle: next.cursorStyle };
        localStorage.setItem(`rixx.profile.${current.sub}`, JSON.stringify(preferences));
        void window.rixxLive?.saveProfile?.(current.sub, preferences);
      } catch { /* Le profil reste modifié en mémoire pour cette session. */ }
      return next;
    });
  }, []);

  if (status !== "ready" || !profile) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-5 py-10">
        <section className="w-full max-w-[420px] rounded-[28px] border border-line bg-surface p-8 shadow-2xl shadow-black/20">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-xl font-bold text-accent-ink">R</div>
          <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Rixx Studio</p>
          <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-ink">Connexion requise</h1>
          <p className="mx-auto mt-3 max-w-[310px] text-center text-sm leading-6 text-ink-soft">
            Connecte ton compte Google pour déverrouiller l’application et utiliser les planches coopératives.
          </p>
          <div className="mt-7 flex items-center gap-3 rounded-2xl border border-line bg-panel-2 px-4 py-3">
            <ShieldCheck className="size-5 shrink-0 text-accent-strong" />
            <p className="text-xs leading-5 text-muted">Tes commandes, fichiers et données restent enregistrés localement sur cet ordinateur.</p>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-300">{error}</p> : null}
          <button
            type="button"
            onClick={() => void connectGoogle()}
            disabled={status === "checking" || status === "signing-in"}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {status === "checking" || status === "signing-in" ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
            {status === "checking" ? "Vérification…" : status === "signing-in" ? "Ouverture de Google…" : "Se connecter avec Google"}
          </button>
          <p className="mt-4 text-center text-[10px] text-muted">Une connexion est nécessaire pour accéder à Rixx Studio.</p>
        </section>
      </main>
    );
  }

  return <AuthContext.Provider value={{ profile, updateProfile }}>{children}</AuthContext.Provider>;
}
