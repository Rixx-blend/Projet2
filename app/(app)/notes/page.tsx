import type { Metadata } from "next";

import { NotesView } from "@/components/notes/notes-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Notes — Rixx Studio" };

export default function NotesPage() {
  return (
    <main className="mx-auto h-full w-full max-w-[1500px] animate-fade-up overflow-y-auto px-4 py-6 sm:px-8">
      <PageHeader
        eyebrow="Espace créatif"
        title="Notes"
        subtitle="Briefs, idées et listes de production. Coche une étape et regarde-la se barrer."
      />
      <div className="mt-6">
        <NotesView />
      </div>
    </main>
  );
}
