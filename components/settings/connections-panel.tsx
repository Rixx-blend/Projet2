"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  rotateBotSecretAction,
  saveDiscordSettingsAction,
  type ConnectionState,
} from "@/actions/connections";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const initialState: ConnectionState = { status: "idle" };

const INVITE_PERMISSIONS = "2147601408";

export type DiscordView = {
  applicationId: string;
  guildId: string;
  publicUrl: string;
  secret: string;
  secretFromEnv: boolean;
  lastSeenAt: string | null;
  lastAuthor: string | null;
  lastError: string | null;
};

function lastSeenLabel(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function ConnectionsPanel({
  discord,
  localOrigin,
}: {
  discord: DiscordView;
  localOrigin: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveDiscordSettingsAction,
    initialState,
  );
  const [revealed, setRevealed] = useState(false);
  const [rotating, startRotate] = useTransition();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const inviteUrl = discord.applicationId
    ? `https://discord.com/api/oauth2/authorize?client_id=${discord.applicationId}&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands`
    : "";

  const lastSeen = lastSeenLabel(discord.lastSeenAt);
  const recentlySeen =
    discord.lastSeenAt !== null &&
    Date.now() - new Date(discord.lastSeenAt).getTime() < 24 * 60 * 60 * 1000;
  const status = !discord.applicationId
    ? { label: "non configuré", tone: "muted" as const }
    : recentlySeen
      ? { label: "bot connecté", tone: "ok" as const }
      : { label: "en attente du bot", tone: "wait" as const };

  return (
    <section id="integrations" className="scroll-mt-6 space-y-3 pb-4">
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">Connexions aux réseaux</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Uniquement des API officielles. Aucun mot de passe, aucun jeton personnel,
          aucun self-bot.
        </p>
      </div>

      <div className="surface-card scroll-mt-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-[#5865F2]/15 text-[#aab4ff]">
            <ShieldCheck className="size-3.5" />
          </span>
          <div className="flex-1">
            <h3 className="text-[14px] font-medium text-ink">Bot Discord</h3>
            <p className="text-[11px] text-muted">
              Commande <code className="rounded bg-white/5 px-1">/commande</code> et
              messages privés envoyés au bot.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
              status.tone === "ok" &&
                "border-success/30 bg-success/10 text-success",
              status.tone === "wait" &&
                "border-warning/30 bg-warning/10 text-warning",
              status.tone === "muted" && "border-line text-muted",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                status.tone === "ok"
                  ? "bg-success"
                  : status.tone === "wait"
                    ? "bg-warning"
                    : "bg-muted",
              )}
            />
            {status.label}
          </span>
        </div>

        <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="application_id">Application ID</Label>
            <Input
              id="application_id"
              name="application_id"
              defaultValue={discord.applicationId}
              placeholder="123456789012345678"
              inputMode="numeric"
            />
            <FieldError>{state.fieldErrors?.application_id}</FieldError>
          </div>
          <div>
            <Label htmlFor="guild_id">ID de ton serveur Discord</Label>
            <Input
              id="guild_id"
              name="guild_id"
              defaultValue={discord.guildId}
              placeholder="123456789012345678"
              inputMode="numeric"
            />
            <FieldError>{state.fieldErrors?.guild_id}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="public_url">URL publique de Rixx Studio (tunnel)</Label>
            <Input
              id="public_url"
              name="public_url"
              defaultValue={discord.publicUrl}
              placeholder="https://mon-orderboard.trycloudflare.com"
            />
            <FieldHint>
              Ton app tourne sur cet ordinateur ({localOrigin}) : pour que le bot
              (hébergé ailleurs) puisse la joindre, expose-la avec un tunnel
              Cloudflare ou ngrok. Cette URL est donnée au bot dans son fichier
              <code className="mx-1 rounded bg-white/5 px-1">.env</code>.
            </FieldHint>
            <FieldError>{state.fieldErrors?.public_url}</FieldError>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Enregistrer Discord
            </Button>
            {state.status === "success" ? (
              <p role="status" className="text-[11px] text-success">
                {state.message}
              </p>
            ) : null}
            {state.status === "error" && state.message ? (
              <p role="alert" className="text-[11px] text-danger">
                {state.message}
              </p>
            ) : null}
          </div>
        </form>

        <div className="mt-4 grid gap-3 border-t border-line/70 pt-3 sm:grid-cols-2">
          <div>
            <Label>Secret du bot</Label>
            <div className="flex items-center gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Input
                  readOnly
                  value={discord.secret}
                  type={revealed ? "text" : "password"}
                  aria-label="Secret du bot Discord"
                  className="pr-8 font-mono text-[11px]"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() => setRevealed((value) => !value)}
                  aria-label={revealed ? "Masquer le secret" : "Afficher le secret"}
                  className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink"
                >
                  {revealed ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
              </div>
              <CopyButton value={discord.secret} label="Copier le secret" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={rotating || discord.secretFromEnv}
                title={
                  discord.secretFromEnv
                    ? "Défini par ORDERBOARD_INBOX_SECRET"
                    : "Générer un nouveau secret"
                }
                onClick={() => {
                  setNotice(null);
                  startRotate(async () => {
                    const result = await rotateBotSecretAction();
                    setNotice(
                      result.ok
                        ? { tone: "ok", text: "Nouveau secret généré." }
                        : { tone: "error", text: result.error ?? "Échec." },
                    );
                    if (result.ok) router.refresh();
                  });
                }}
              >
                {rotating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
              </Button>
            </div>
            <FieldHint>
              {discord.secretFromEnv
                ? "Fourni par la variable d’environnement ORDERBOARD_INBOX_SECRET."
                : "À coller dans le fichier .env du bot (ORDERBOARD_INBOX_SECRET)."}
            </FieldHint>
          </div>

          <div>
            <Label>Inviter le bot sur ton serveur</Label>
            {inviteUrl ? (
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={inviteUrl}
                  aria-label="Lien d’invitation du bot"
                  className="min-w-0 flex-1 text-[11px]"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <CopyButton value={inviteUrl} label="Copier le lien d’invitation" />
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Ouvrir le lien d’invitation"
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-[11px] text-muted">
                Renseigne l’Application ID pour générer le lien.
              </p>
            )}
            <FieldHint>
              Dis à tes clients d’utiliser <code className="rounded bg-white/5 px-1">/commande</code>{" "}
              sur ton serveur — ou de t’écrire en message privé au bot.
            </FieldHint>
          </div>
        </div>

        {lastSeen ? (
          <p className="mt-3 text-[11px] text-muted">
            Dernière demande reçue : {lastSeen}
            {discord.lastAuthor ? ` · ${discord.lastAuthor}` : ""}
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-muted">
            Aucune demande Discord reçue pour l’instant.
          </p>
        )}

        {discord.lastError ? (
          <p className="mt-2 rounded-md border border-danger/30 bg-danger/10 px-2 py-1 text-[11px] text-danger">
            Dernière erreur du bot : {discord.lastError}
          </p>
        ) : null}

        {notice ? (
          <p
            role="status"
            className={cn(
              "mt-2 rounded-md border px-2 py-1 text-[11px]",
              notice.tone === "ok"
                ? "border-success/30 bg-success/10 text-success"
                : "border-danger/30 bg-danger/10 text-danger",
            )}
          >
            {notice.text}
          </p>
        ) : null}

        <div className="mt-3 flex gap-2 rounded-lg border border-line/80 bg-panel-2/40 px-3 py-2">
          <Info className="mt-0.5 size-3.5 shrink-0 text-muted" />
          <p className="text-[11px] leading-relaxed text-muted">
            <strong className="text-ink-soft">Limite de Discord :</strong> les messages
            privés de <em>ton compte personnel</em> ne peuvent pas être lus par une
            application. Seuls les messages envoyés <strong>au bot</strong> et les
            commandes <code className="rounded bg-white/5 px-1">/commande</code> arrivent
            ici. Le bot doit rester en ligne sur un hébergeur (Railway, Render, Fly.io) —
            guide complet dans <code className="rounded bg-white/5 px-1">discord-bot/README.md</code>.
          </p>
        </div>
      </div>
    </section>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={!value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Presse-papiers indisponible : l'utilisateur peut sélectionner le champ.
        }
      }}
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}
