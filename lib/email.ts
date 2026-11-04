import type { AppNotification } from "@/lib/notifications";
import type { Settings } from "@/types/database";

/**
 * Envoi d'e-mails via l'API HTTP de Resend.
 *
 * Aucun SDK : un simple POST sur https://api.resend.com/emails avec la clé
 * enregistrée dans les paramètres (ou la variable d'environnement RESEND_API_KEY).
 * Sans connexion Internet, l'appel échoue proprement et l'interface affiche un
 * message clair : le reste de l'application continue de fonctionner hors ligne.
 */

const ENDPOINT = "https://api.resend.com/emails";

export function resolveEmailConfig(settings: Settings) {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || settings.email_api_key.trim(),
    from: settings.email_from.trim() || "onboarding@resend.dev",
    to: settings.notification_email.trim(),
  };
}

export function emailConfigured(settings: Settings) {
  const config = resolveEmailConfig(settings);
  return Boolean(config.apiKey && config.to && config.from);
}

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

export async function sendEmail(
  config: { apiKey: string; from: string },
  payload: { to: string; subject: string; html: string; text: string },
): Promise<SendResult> {
  if (!config.apiKey) {
    return { ok: false, error: "Aucune clé API e-mail enregistrée." };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const raw = await response.text();
    let parsed: { id?: string; message?: string; error?: string; name?: string } = {};
    try {
      parsed = raw ? (JSON.parse(raw) as typeof parsed) : {};
    } catch {
      // Réponse non JSON : on garde le texte brut pour le diagnostic.
    }

    if (!response.ok) {
      const detail =
        parsed.message ||
        parsed.error ||
        raw.slice(0, 180) ||
        `HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          error: `Clé API refusée par le service d'e-mail (${response.status}). Vérifie la clé dans les paramètres.`,
        };
      }
      return { ok: false, error: `Envoi refusé : ${detail}` };
    }

    return { ok: true, id: parsed.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/abort|timeout/i.test(message)) {
      return {
        ok: false,
        error: "Délai dépassé : pas de réponse du service d'e-mail.",
      };
    }
    return {
      ok: false,
      error: `Envoi impossible (${message}). Vérifie ta connexion Internet.`,
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TONE_COLOR = {
  danger: "#e11d48",
  warning: "#d97706",
  info: "#2563eb",
} as const;

/** Récapitulatif HTML sobre et lisible, compatible clients mail. */
export function buildDigestEmail(notifications: AppNotification[]) {
  const subject =
    notifications.length === 1
      ? `OrderBoard — ${notifications[0].title}`
      : `OrderBoard — ${notifications.length} rappels`;

  const rows = notifications
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;vertical-align:top">
          <span style="display:inline-block;width:6px;height:6px;border-radius:99px;background:${
            TONE_COLOR[item.tone]
          };margin-right:8px"></span>
          <strong style="color:#111827;font-size:14px">${escapeHtml(item.title)}</strong>
          <div style="color:#4b5563;font-size:13px;margin-top:3px">${escapeHtml(
            item.message,
          )}</div>
        </td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:ui-sans-serif,system-ui,'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:24px">
    <tr><td>
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af">OrderBoard</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827">Tes rappels du jour</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <p style="margin:18px 0 0;font-size:12px;color:#9ca3af">
        Envoyé automatiquement depuis OrderBoard. Modifie les délais dans Paramètres → Notifications.
      </p>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    "OrderBoard — tes rappels",
    "",
    ...notifications.map((item) => `• ${item.title} : ${item.message}`),
    "",
    "Modifie les délais dans Paramètres → Notifications.",
  ].join("\n");

  return { subject, html, text };
}
