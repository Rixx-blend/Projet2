"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getBotSecret,
  saveXClientId,
  saveXClientSecret,
  saveXTokens,
  updateConnections,
} from "@/lib/local/connections";
import { updateSettings } from "@/lib/local/db";
import { syncX } from "@/lib/x-sync";

export type ConnectionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const snowflake = z
  .string()
  .trim()
  .max(25)
  .refine((value) => value === "" || /^\d{5,25}$/.test(value), {
    message: "Identifiant Discord invalide (chiffres uniquement).",
  });

const discordSchema = z.object({
  application_id: snowflake,
  guild_id: snowflake,
  public_url: z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => value === "" || /^https?:\/\/[^\s]+$/.test(value),
      "URL invalide (commence par https://).",
    ),
});

export async function saveDiscordSettingsAction(
  _previous: ConnectionState,
  formData: FormData,
): Promise<ConnectionState> {
  const parsed = discordSchema.safeParse({
    application_id: formData.get("application_id") ?? "",
    guild_id: formData.get("guild_id") ?? "",
    public_url: formData.get("public_url") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return { status: "error", message: "Vérifie les identifiants.", fieldErrors };
  }

  try {
    await updateConnections((connections) => {
      connections.discord.application_id = parsed.data.application_id;
      connections.discord.guild_id = parsed.data.guild_id;
      connections.discord.public_url = parsed.data.public_url.replace(/\/+$/, "");
    });
  } catch (error) {
    return {
      status: "error",
      message: `Enregistrement impossible : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }`,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/demands");
  return { status: "success", message: "Réglages Discord enregistrés." };
}

/** Génère un nouveau secret partagé (à recopier dans le bot). */
export async function rotateBotSecretAction(): Promise<{
  ok: boolean;
  secret?: string;
  error?: string;
}> {
  if (process.env.ORDERBOARD_INBOX_SECRET?.trim()) {
    return {
      ok: false,
      error:
        "Le secret vient de la variable d'environnement ORDERBOARD_INBOX_SECRET : modifie-la puis relance l'application.",
    };
  }

  try {
    await updateConnections((connections) => {
      connections.discord.secret_enc = null;
    });
    const secret = await getBotSecret();
    revalidatePath("/settings");
    return { ok: true, secret };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* X (Twitter)                                                                */
/* -------------------------------------------------------------------------- */

const xSchema = z.object({
  client_id: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || /^[A-Za-z0-9_-]{10,200}$/.test(value), {
      message: "Identifiant client X invalide.",
    }),
  x_sync_interval_minutes: z
    .number({ message: "Intervalle invalide" })
    .int("Nombre entier attendu")
    .min(15, "Minimum 15 minutes")
    .max(1440, "Maximum 1440 minutes (24 h)"),
  x_monthly_call_limit: z
    .number({ message: "Plafond invalide" })
    .int("Nombre entier attendu")
    .min(0, "Minimum 0")
    .max(100_000, "Maximum 100 000 appels"),
  x_call_cost_estimate: z
    .number({ message: "Coût invalide" })
    .min(0, "Le coût ne peut pas être négatif")
    .max(100, "Montant trop élevé"),
});

export async function saveXSettingsAction(
  _previous: ConnectionState,
  formData: FormData,
): Promise<ConnectionState> {
  const clientSecret = String(formData.get("client_secret") ?? "").trim();
  const parsed = xSchema.safeParse({
    client_id: String(formData.get("client_id") ?? "").trim(),
    x_sync_interval_minutes: Number(
      String(formData.get("x_sync_interval_minutes") ?? "20").replace(",", "."),
    ),
    x_monthly_call_limit: Number(
      String(formData.get("x_monthly_call_limit") ?? "0").replace(",", "."),
    ),
    x_call_cost_estimate: Number(
      String(formData.get("x_call_cost_estimate") ?? "0,01").replace(",", "."),
    ),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return { status: "error", message: "Vérifie les réglages X.", fieldErrors };
  }

  try {
    await saveXClientId(parsed.data.client_id);
    if (clientSecret) await saveXClientSecret(clientSecret);
    await updateSettings({
      x_sync_enabled: formData.get("x_sync_enabled") === "on",
      x_sync_interval_minutes: parsed.data.x_sync_interval_minutes,
      x_monthly_call_limit: parsed.data.x_monthly_call_limit,
      x_call_cost_estimate: parsed.data.x_call_cost_estimate,
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
  return { status: "success", message: "Réglages X enregistrés." };
}

/** Déconnecte le compte X (les jetons sont effacés du disque). */
export async function disconnectXAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    await saveXTokens({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userId: null,
      username: null,
      avatarUrl: null,
    });
    await updateConnections((connections) => {
      connections.x.last_sync_at = null;
      connections.x.last_event_at = null;
      connections.x.last_error = null;
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }
  revalidatePath("/settings");
  return { ok: true };
}

/** Lance une synchronisation immédiate des messages privés X. */
export async function syncXNowAction(): Promise<Awaited<ReturnType<typeof syncX>>> {
  const result = await syncX();
  revalidatePath("/settings");
  revalidatePath("/demands");
  revalidatePath("/", "layout");
  return result;
}

/** Enregistre un incident côté bot (visible dans Paramètres). */
export async function recordBotErrorAction(message: string): Promise<void> {
  await updateConnections((connections) => {
    connections.discord.last_error = message.slice(0, 500);
  });
  revalidatePath("/settings");
}
