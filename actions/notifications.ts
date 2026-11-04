"use server";

import { revalidatePath } from "next/cache";

import { buildDigestEmail, emailConfigured, resolveEmailConfig, sendEmail } from "@/lib/email";
import { getSettings, listOrdersWithClients, updateSettings } from "@/lib/local/db";
import { buildNotifications } from "@/lib/notifications";

export type NotificationActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

/** Enregistre les notifications lues (et oublie celles qui n'existent plus). */
export async function markNotificationsReadAction(
  ids: string[],
): Promise<NotificationActionResult> {
  try {
    const [settings, orders] = await Promise.all([
      getSettings(),
      listOrdersWithClients(),
    ]);
    const current = buildNotifications(orders, settings);
    const currentIds = new Set(current.map((item) => item.id));
    const read: Record<string, string> = {};
    const stamp = new Date().toISOString();

    for (const item of current) {
      if (item.read && currentIds.has(item.id)) {
        read[item.id] = settings.read_notifications[item.id] ?? stamp;
      }
    }
    for (const id of ids) {
      if (currentIds.has(id)) read[id] = stamp;
    }

    await updateSettings({ read_notifications: read });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Envoie un e-mail récapitulatif avec les rappels en cours. */
export async function sendReminderEmailAction(
  ids?: string[],
): Promise<NotificationActionResult> {
  const [settings, orders] = await Promise.all([
    getSettings(),
    listOrdersWithClients(),
  ]);

  const config = resolveEmailConfig(settings);
  if (!settings.notification_email) {
    return {
      ok: false,
      error: "Renseigne une adresse de réception dans Paramètres → Notifications.",
    };
  }
  if (!config.apiKey) {
    return {
      ok: false,
      error: "Ajoute ta clé API e-mail dans Paramètres → Notifications.",
    };
  }

  const all = buildNotifications(orders, settings);
  const selected = ids?.length
    ? all.filter((item) => ids.includes(item.id))
    : all.filter((item) => !item.read);

  if (selected.length === 0) {
    return { ok: false, error: "Aucun rappel à envoyer pour l’instant." };
  }

  const digest = buildDigestEmail(selected);
  const result = await sendEmail(
    { apiKey: config.apiKey, from: config.from },
    { to: config.to, ...digest },
  );

  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    message: `E-mail envoyé à ${config.to} (${selected.length} rappel${
      selected.length > 1 ? "s" : ""
    }).`,
  };
}

/** Vérifie la configuration e-mail en envoyant un message de test. */
export async function sendTestEmailAction(): Promise<NotificationActionResult> {
  const settings = await getSettings();
  const config = resolveEmailConfig(settings);

  if (!emailConfigured(settings)) {
    return {
      ok: false,
      error:
        "Configuration incomplète : il faut une clé API, un expéditeur et une adresse de réception.",
    };
  }

  const result = await sendEmail(
    { apiKey: config.apiKey, from: config.from },
    {
      to: config.to,
      subject: "OrderBoard — e-mail de test",
      text: "Si tu lis ce message, l'envoi d'e-mails depuis OrderBoard fonctionne.",
      html: `<p style="font-family:system-ui,sans-serif;font-size:14px;color:#111827">
        Si tu lis ce message, l'envoi d'e-mails depuis <strong>OrderBoard</strong> fonctionne.
      </p>`,
    },
  );

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, message: `E-mail de test envoyé à ${config.to}.` };
}
