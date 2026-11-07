"use client";

import { ArrowLeft, ClipboardPlus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { createOrderAction, type OrderFormState } from "@/actions/orders";
import { FormFields } from "@/components/orders/order-form-dialog";
import { TabLink } from "@/components/layout/tabs-context";
import type { Client } from "@/types/database";
import { uploadOrderFiles } from "@/lib/storage";

const initialState: OrderFormState = { status: "idle" };

export function NewOrderPage({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createOrderAction, initialState);
  const handledState = useRef<OrderFormState | null>(null);
  // Les fichiers vivent dans l'état React : un <input type="file"> non contrôlé est vidé
  // par React à la fin de l'action du formulaire, avant que l'envoi ne commence.
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const filesRef = useRef<File[]>([]);
  filesRef.current = files;

  useEffect(() => {
    if (state.status !== "success" || handledState.current === state) return;
    handledState.current = state;
    const finish = async () => {
      if (state.orderId) {
        const toUpload = filesRef.current;
        if (toUpload.length > 0) {
          setUploading(true);
          const failures = await uploadOrderFiles(toUpload, state.orderId);
          setUploading(false);
          if (failures.length > 0) {
            window.alert(`La commande est créée, mais ${failures.length > 1 ? "ces fichiers n'ont" : "ce fichier n'a"} pas pu être envoyé :\n${failures.join("\n")}`);
          }
        }
        router.refresh();
        router.replace(`/orders/${state.orderId}`);
      } else {
        router.replace("/dashboard");
      }
    };
    void finish();
  }, [state, router]);

  return (
    <main className="h-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-9">
        <TabLink href="/dashboard" title="Retour aux commandes" className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-4" /> Retour aux commandes
        </TabLink>

        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
              <Sparkles className="size-3.5" /> Rixx Studio · Espace de travail
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-[38px]">Nouvelle commande</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">Centralise la demande, les informations du client et les conditions de livraison au même endroit.</p>
          </div>
          <div className="hidden size-14 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-accent-strong sm:grid">
            <ClipboardPlus className="size-7" strokeWidth={1.6} />
          </div>
        </div>

        <form action={formAction} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0 rounded-2xl border border-line bg-panel p-4 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
              <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-strong"><ClipboardPlus className="size-[18px]" /></span>
              <div><h2 className="text-sm font-semibold text-ink">Détails de la commande</h2><p className="mt-0.5 text-xs text-muted">Les informations essentielles pour démarrer</p></div>
            </div>
            <FormFields clients={clients} state={state} pending={pending || uploading} onCancel={() => router.push("/dashboard")} files={files} onFilesChange={setFiles} />
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">À savoir</p>
              <h2 className="mt-2 text-base font-semibold text-ink">Un espace prêt à travailler</h2>
              <p className="mt-2 text-xs leading-5 text-muted">Après création, OrderBoard prépare automatiquement la fiche de commande, son board de travail et sa checklist de suivi.</p>
              <div className="mt-4 space-y-3 border-t border-line pt-4 text-xs text-ink-soft">
                <p className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" /> Client et coordonnées</p>
                <p className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" /> Prestation et brief</p>
                <p className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent" /> Prix, acompte et échéance</p>
              </div>
            </div>
            <div className="rounded-2xl border border-accent/20 bg-accent/[0.07] p-4">
              <p className="text-xs font-semibold text-accent-strong">Conseil</p>
              <p className="mt-1 text-xs leading-5 text-muted">Tu peux créer la commande avec les informations essentielles, puis compléter les détails facultatifs depuis sa fiche.</p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
