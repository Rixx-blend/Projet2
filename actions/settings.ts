"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { updateSettings } from "@/lib/local/db";
import { field } from "@/lib/validations";

export type SettingsState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function toFieldErrors(issues: { path: (string | number | symbol)[]; message: string }[]) {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return errors;
}

function parseReminderDays(raw: string | null): number[] {
  if (!raw) return [];
  return [...new Set(
    raw
      .split(/[,\s;]+/)
      .map((value) => Number(value.replace(",", ".")))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 365)
      .map((value) => Math.round(value)),
  )].sort((a, b) => b - a);
}

const emailRule = z
  .string()
  .trim()
  .max(160)
  .refine(
    (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
    "E-mail invalide",
  );

const settingsSchema = z.object({
  monthly_goal: z
    .number({ message: "Objectif invalide" })
    .min(0, "L'objectif ne peut pas être négatif")
    .max(10_000_000, "Montant trop élevé"),
  notification_email: emailRule,
  email_from: emailRule,
  reminder_quote_days: z
    .number({ message: "Délai invalide" })
    .int("Nombre entier attendu")
    .min(0, "Minimum 0")
    .max(60, "Maximum 60 jours"),
});

export async function saveSettingsAction(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const goalRaw = String(formData.get("monthly_goal") ?? "0").replace(",", ".").trim();
  const quoteRaw = String(formData.get("reminder_quote_days") ?? "0").trim();
  const apiKey = String(formData.get("email_api_key") ?? "").trim();

  const parsed = settingsSchema.safeParse({
    monthly_goal: Number(goalRaw || 0),
    notification_email: String(formData.get("notification_email") ?? "").trim(),
    email_from: String(formData.get("email_from") ?? "").trim(),
    reminder_quote_days: Number(quoteRaw || 0),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs du formulaire.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateSettings({
      monthly_goal: parsed.data.monthly_goal,
      notification_email: parsed.data.notification_email,
      email_from: parsed.data.email_from,
      // Une clé vide ne remplace pas celle déjà enregistrée.
      ...(apiKey ? { email_api_key: apiKey } : {}),
      reminder_quote_days: parsed.data.reminder_quote_days,
      reminder_days: parseReminderDays(field(formData, "reminder_days")),
      reminder_overdue: formData.get("reminder_overdue") === "on",
      messenger_links: {
        discord: String(formData.get("link_discord") ?? "").trim(),
        twitter: String(formData.get("link_twitter") ?? "").trim(),
        instagram: String(formData.get("link_instagram") ?? "").trim(),
        email: String(formData.get("link_email") ?? "").trim(),
      },
    });
  } catch (error) {
    return {
      status: "error",
      message: `Enregistrement impossible : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`,
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/revenue");
  return { status: "success", message: "Réglages enregistrés." };
}

/** Met à jour uniquement l'objectif mensuel (jauge du panneau latéral). */
export async function setMonthlyGoalAction(
  goal: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isFinite(goal) || goal < 0) {
    return { ok: false, error: "Objectif invalide." };
  }

  try {
    await updateSettings({ monthly_goal: Math.round(goal * 100) / 100 });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/revenue");
  return { ok: true };
}

/** Oublie la clé API e-mail enregistrée. */
export async function clearEmailKeyAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateSettings({ email_api_key: "" });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { ok: true };
}
