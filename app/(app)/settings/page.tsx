import type { Metadata } from "next";
import { SettingsForm } from "@/components/settings/settings-form";
import { UpdatesPanel } from "@/components/settings/updates-panel";
import { PageHeader } from "@/components/ui/page-header";
import { dataDir, getSettings } from "@/lib/local/db";

export const metadata: Metadata = { title: "Paramètres — Rixx Studio" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "mises-a-jour", label: "Mises à jour" },
  { id: "finances", label: "Préférences financières" },
  { id: "notifications", label: "Notifications" },
  { id: "email", label: "Rappels par e-mail" },
];

export default async function SettingsPage() {
  const settings = await getSettings();
  const hasEmailKey = Boolean(
    settings.email_api_key.trim() || process.env.RESEND_API_KEY?.trim(),
  );

  // La clé ne quitte jamais le serveur : on ne transmet que son existence.
  const safeSettings = { ...settings, email_api_key: "" };

  return (
    <main className="mx-auto h-full w-full max-w-[1200px] animate-fade-up overflow-y-auto scroll-smooth px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow="Réglages"
        title="Paramètres"
        subtitle="Rappels, e-mail et objectif de revenus. Tout est enregistré sur cet ordinateur."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Sections des paramètres" className="lg:sticky lg:top-0 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-visible">
            {SECTIONS.map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  className="block rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-white/5 hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-4">
          <UpdatesPanel />
          <SettingsForm settings={safeSettings} hasEmailKey={hasEmailKey} />
        </div>
      </div>

      <p className="mt-2 break-all text-[10px] text-muted">
        Dossier de données : {dataDir()}
      </p>
    </main>
  );
}
