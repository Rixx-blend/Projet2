"use client";

import { Check, Loader2, Mail, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { sendTestEmailAction } from "@/actions/notifications";
import {
  clearEmailKeyAction,
  saveSettingsAction,
  type SettingsState,
} from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types/database";

const initialState: SettingsState = { status: "idle" };

const PRESETS = [7, 3, 1, 0] as const;

function presetLabel(days: number) {
  if (days === 0) return "Jour même";
  return `${days} j avant`;
}

export function SettingsForm({
  settings,
  hasEmailKey,
}: {
  settings: Settings;
  hasEmailKey: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, initialState);
  const [days, setDays] = useState(settings.reminder_days.join(", "));
  const [testing, startTest] = useTransition();
  const [clearing, startClear] = useTransition();
  const [emailFeedback, setEmailFeedback] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [keyCleared, setKeyCleared] = useState(false);

  const selectedDays = new Set(
    days
      .split(/[,\s;]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0),
  );

  function toggleDay(day: number) {
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    setDays([...next].sort((a, b) => b - a).join(", "));
  }

  const keyPresent = hasEmailKey && !keyCleared;

  return (
    <form action={formAction} className="space-y-4 pb-10">
      <section id="finances" className="surface-card scroll-mt-6 p-5">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">Objectif de revenus</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Sert à la jauge du panneau latéral et à la page Finances.
        </p>
        <div className="mt-3 max-w-xs">
          <Label htmlFor="monthly_goal">Objectif mensuel (€)</Label>
          <Input
            id="monthly_goal"
            name="monthly_goal"
            inputMode="decimal"
            defaultValue={settings.monthly_goal > 0 ? String(settings.monthly_goal) : ""}
            placeholder="0 = pas d'objectif"
          />
          <FieldError>{state.fieldErrors?.monthly_goal}</FieldError>
        </div>
      </section>

      <section id="notifications" className="surface-card scroll-mt-6 p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent/12 text-accent">
            <Check className="size-3.5" />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-ink">Notifications</h2>
            <p className="text-[11px] text-muted">
              Cloche de l’application et rappels, selon ces délais.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="reminder_days">Rappels avant la deadline</Label>
            <Input
              id="reminder_days"
              name="reminder_days"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              placeholder="3, 1, 0"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => toggleDay(preset)}
                  aria-pressed={selectedDays.has(preset)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] transition-colors",
                    selectedDays.has(preset)
                      ? "border-accent/50 bg-accent/12 text-ink"
                      : "border-line text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {presetLabel(preset)}
                </button>
              ))}
            </div>
            <FieldHint>
              Nombres de jours séparés par des virgules. 0 = le jour même.
            </FieldHint>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2.5 rounded-lg border border-line bg-panel-2/40 px-3 py-2.5">
              <input
                type="checkbox"
                name="reminder_overdue"
                defaultChecked={settings.reminder_overdue}
                className="mt-0.5 size-3.5 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-[12px] text-ink-soft">
                  Me prévenir dès qu’une commande est en retard
                </span>
                <span className="block text-[11px] text-muted">
                  Rappel rouge dans la cloche, chaque jour de retard.
                </span>
              </span>
            </label>

            <div>
              <Label htmlFor="reminder_quote_days">
                Relance d’un devis sans réponse (jours)
              </Label>
              <Input
                id="reminder_quote_days"
                name="reminder_quote_days"
                type="number"
                min={0}
                max={60}
                defaultValue={settings.reminder_quote_days}
              />
              <FieldHint>0 pour désactiver cette relance.</FieldHint>
              <FieldError>{state.fieldErrors?.reminder_quote_days}</FieldError>
            </div>
          </div>
        </div>

        <p className="mt-3 rounded-lg border border-line/80 bg-panel-2/40 px-3 py-2 text-[11px] leading-relaxed text-muted">
          Le paiement en attente sur une commande livrée déclenche aussi un
          rappel. Les éléments déjà lus restent dans la cloche, en grisé.
        </p>
      </section>

      <section id="email" className="surface-card scroll-mt-6 p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-blue/12 text-blue">
            <Mail className="size-3.5" />
          </span>
          <div className="flex-1">
            <h2 className="text-[16px] font-semibold tracking-tight text-ink">Rappels par e-mail</h2>
            <p className="text-[11px] text-muted">
              Envoi via Resend (gratuit jusqu’à 3 000 e-mails/mois).
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px]",
              keyPresent
                ? "border-success/30 bg-success/10 text-success"
                : "border-line text-muted",
            )}
          >
            {keyPresent ? "configuré" : "non configuré"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="notification_email">Recevoir les rappels à</Label>
            <Input
              id="notification_email"
              name="notification_email"
              type="email"
              defaultValue={settings.notification_email}
              placeholder="toi@exemple.com"
              autoComplete="email"
            />
            <FieldError>{state.fieldErrors?.notification_email}</FieldError>
          </div>

          <div>
            <Label htmlFor="email_from">Adresse d’expédition</Label>
            <Input
              id="email_from"
              name="email_from"
              defaultValue={settings.email_from}
              placeholder="onboarding@resend.dev"
            />
            <FieldHint>
              Laisse la valeur par défaut tant que ton domaine n’est pas vérifié
              chez Resend.
            </FieldHint>
            <FieldError>{state.fieldErrors?.email_from}</FieldError>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="email_api_key">Clé API Resend</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="email_api_key"
                name="email_api_key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1"
                placeholder={keyPresent ? "Clé enregistrée — laisser vide pour la conserver" : "re_..."}
                onChange={() => setKeyCleared(false)}
              />
              {keyPresent ? (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled={clearing}
                  onClick={() => {
                    startClear(async () => {
                      const result = await clearEmailKeyAction();
                      if (result.ok) {
                        setKeyCleared(true);
                        setEmailFeedback({ tone: "ok", text: "Clé supprimée." });
                      } else {
                        setEmailFeedback({
                          tone: "error",
                          text: result.error ?? "Suppression impossible.",
                        });
                      }
                    });
                  }}
                >
                  {clearing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Supprimer
                </Button>
              ) : null}
            </div>
            <FieldHint>
              Crée une clé sur resend.com → API Keys, puis colle-la ici. Elle
              reste sur cet ordinateur et n’est jamais affichée.
            </FieldHint>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={testing || !keyPresent || !settings.notification_email}
            onClick={() => {
              setEmailFeedback(null);
              startTest(async () => {
                const result = await sendTestEmailAction();
                setEmailFeedback({
                  tone: result.ok ? "ok" : "error",
                  text: result.message ?? result.error ?? "Envoi impossible.",
                });
              });
            }}
          >
            {testing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            Envoyer un e-mail de test
          </Button>
          {emailFeedback ? (
            <p
              role="status"
              className={cn(
                "rounded-md border px-2 py-1 text-[11px]",
                emailFeedback.tone === "ok"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger",
              )}
            >
              {emailFeedback.text}
            </p>
          ) : null}
        </div>
      </section>

      <section id="liens" className="surface-card scroll-mt-6 p-5">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">Messageries</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Liens utilisés par la page Messages pour t’écrire rapidement.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="link_discord">Discord</Label>
            <Input
              id="link_discord"
              name="link_discord"
              defaultValue={settings.messenger_links.discord}
              placeholder="https://discord.com/users/…"
            />
          </div>
          <div>
            <Label htmlFor="link_twitter">Twitter / X</Label>
            <Input
              id="link_twitter"
              name="link_twitter"
              defaultValue={settings.messenger_links.twitter}
              placeholder="https://x.com/…"
            />
          </div>
          <div>
            <Label htmlFor="link_instagram">Instagram</Label>
            <Input
              id="link_instagram"
              name="link_instagram"
              defaultValue={settings.messenger_links.instagram}
              placeholder="https://instagram.com/…"
            />
          </div>
          <div>
            <Label htmlFor="link_email">E-mail de contact</Label>
            <Input
              id="link_email"
              name="link_email"
              defaultValue={settings.messenger_links.email}
              placeholder="moi@exemple.com"
            />
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 -mx-1 rounded-xl border border-line bg-panel/95 px-4 py-3 shadow-pop backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Enregistrer les réglages
        </Button>
        {state.status === "success" ? (
          <p role="status" className="text-xs text-success">
            {state.message}
          </p>
        ) : null}
        {state.status === "error" ? (
          <p role="alert" className="text-xs text-danger">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
