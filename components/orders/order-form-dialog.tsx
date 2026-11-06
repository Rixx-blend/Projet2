"use client";

import {
  ArrowRight, Check, ChevronDown, Clock3, Layers3, Plus,
  Rocket, Search, Sparkles, UserRound, Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  createOrderAction,
  updateOrderAction,
  type OrderFormState,
} from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
} from "@/lib/constants";
import { cn, toDatetimeLocal } from "@/lib/utils";
import type { Client, Order } from "@/types/database";

const initialState: OrderFormState = { status: "idle" };

const SERVICE_PRESETS = [
  { label: "Miniature YouTube", icon: "play", hint: "Visuel vidéo" },
  { label: "Bannière", icon: "image", hint: "Réseaux sociaux" },
  { label: "Pack graphique", icon: "layers", hint: "Assets & identité" },
  { label: "Rendu 3D", icon: "box", hint: "Blender / 3D" },
  { label: "Autre", icon: "more", hint: "Prestation libre" },
] as const;

function SectionTitle({ icon: Icon, title, hint }: {
  icon: typeof UserRound;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/15 text-accent-strong">
        <Icon className="size-[17px]" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="text-[11px] text-muted">{hint}</p>
      </div>
    </div>
  );
}

export function FormFields({
  clients,
  order,
  state,
  pending,
  onCancel,
}: {
  clients: Client[];
  order?: Order;
  state: OrderFormState;
  pending: boolean;
  onCancel: () => void;
}) {
  const [newClient, setNewClient] = useState(clients.length === 0 && !order);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedService, setSelectedService] = useState(order?.service_type ?? SERVICE_TYPES[0]);
  const [title, setTitle] = useState(order?.title ?? "");
  const errors = state.fieldErrors ?? {};
  const hasDetailErrors = [
    "total_price", "deposit", "payment_status", "priority", "deadline", "tags",
    "revisions_included", "revisions_used", "time_spent_minutes",
  ].some((field) => Boolean((errors as Record<string, unknown>)[field]));
  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.email ?? ""} ${client.discord ?? ""}`
      .toLowerCase().includes(clientSearch.toLowerCase()),
  );

  function choosePreset(service: string) {
    setSelectedService(service);
    if (!title.trim()) setTitle(service === "Autre" ? "" : service);
  }

  return (
    <div className="space-y-4">
      {order ? <input type="hidden" name="id" value={order.id} /> : null}
      <input type="hidden" name="service_type" value={selectedService} />

      <section className="rounded-2xl border border-line bg-panel-2/35 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle icon={UserRound} title="Client" hint="Associe cette commande à un client." />
          <button
            type="button"
            onClick={() => setNewClient((value) => !value)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/10 px-3 text-xs font-semibold text-accent-strong transition hover:bg-accent/20"
          >
            <Plus className="size-3.5" /> {newClient ? "Client existant" : "Nouveau client"}
          </button>
        </div>

        {newClient ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="new_client_name">Nom / pseudo *</Label>
              <Input id="new_client_name" name="new_client_name" placeholder="Ex. Studio Lumen" maxLength={120} required={!order?.client_id} />
              <FieldError>{errors.new_client_name}</FieldError>
            </div>
            <div>
              <Label htmlFor="new_client_email">E-mail</Label>
              <Input id="new_client_email" name="new_client_email" type="email" placeholder="client@studio.fr" />
              <FieldError>{errors.new_client_email}</FieldError>
            </div>
            <div>
              <Label htmlFor="new_client_discord">Discord</Label>
              <Input id="new_client_discord" name="new_client_discord" placeholder="Pseudo Discord" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input aria-label="Rechercher un client" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Rechercher un client..." className="h-11 pl-9" />
            </div>
            <Select id="client_id" name="client_id" defaultValue={order?.client_id ?? ""}>
              <option value="">— Choisir un client —</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}{client.email ? ` · ${client.email}` : ""}
                </option>
              ))}
            </Select>
            {filteredClients.length === 0 ? <p className="text-xs text-muted">Aucun client ne correspond à cette recherche.</p> : null}
            <FieldError>{errors.client_id}</FieldError>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-panel-2/35 p-4">
        <SectionTitle icon={Rocket} title="Prestation" hint="Choisis un modèle pour préremplir ta commande." />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SERVICE_PRESETS.map((preset) => {
            const active = selectedService === preset.label ||
              (preset.label === "Pack graphique" && selectedService === "Pack 3D") ||
              (preset.label === "Rendu 3D" && selectedService === "Skin / Texturing 3D");
            const Icon = preset.icon === "play" ? Rocket : preset.icon === "layers" ? Layers3 : preset.icon === "box" ? Layers3 : preset.icon === "image" ? Sparkles : Plus;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => choosePreset(preset.label === "Pack graphique" ? "Pack 3D" : preset.label === "Rendu 3D" ? "Skin / Texturing 3D" : preset.label)}
                className={cn(
                  "flex min-h-[82px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-all",
                  active
                    ? "border-accent/70 bg-accent/15 shadow-[0_0_22px_rgba(120,87,255,0.13)]"
                    : "border-line bg-surface/70 hover:border-line-strong hover:bg-panel-2",
                )}
              >
                <span className={cn("grid size-7 place-items-center rounded-lg", active ? "bg-accent/25 text-accent-strong" : "bg-panel-2 text-muted")}>
                  <Icon className="size-4" />
                </span>
                <span className="mt-2 text-[11px] font-semibold leading-tight text-ink">{preset.label}</span>
                <span className="text-[9px] text-muted">{preset.hint}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Label htmlFor="title">Titre de la commande *</Label>
          <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Miniature pour la vidéo Fortnite..." maxLength={160} required className="h-11" />
          <FieldError>{errors.title}</FieldError>
        </div>
        <div className="mt-3">
          <Label htmlFor="description">Description / brief</Label>
          <Textarea id="description" name="description" defaultValue={order?.description ?? ""} placeholder="Décris la demande, les livrables, les références et les contraintes..." maxLength={5000} className="min-h-28 resize-y" />
          <div className="mt-1 flex justify-between gap-2">
            <FieldError>{errors.description}</FieldError>
            <FieldHint>Tu pourras compléter ce brief plus tard.</FieldHint>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-panel-2/35 p-4">
        <SectionTitle icon={Wallet} title="Tarification & livraison" hint="Les informations peuvent être ajoutées maintenant ou plus tard." />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="total_price">Prix total (€)</Label>
            <Input id="total_price" name="total_price" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={order?.total_price ?? 0} />
            <FieldError>{errors.total_price}</FieldError>
          </div>
          <div>
            <Label htmlFor="deposit">Acompte (€)</Label>
            <Input id="deposit" name="deposit" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={order?.deposit ?? 0} />
            <FieldError>{errors.deposit}</FieldError>
          </div>
          <div>
            <Label htmlFor="deadline">Date limite</Label>
            <Input id="deadline" name="deadline" type="datetime-local" defaultValue={toDatetimeLocal(order?.deadline)} />
            <FieldError>{errors.deadline}</FieldError>
          </div>
        </div>
        <details key={hasDetailErrors ? "open" : "closed"} open={Boolean(order) || hasDetailErrors} className="group mt-4 border-t border-line pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-muted transition hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2"><ChevronDown className="size-4 transition-transform group-open:rotate-180" /> Options avancées <span className="font-normal text-muted/70">· paiement, priorité et suivi</span></span>
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="status">Statut initial</Label><Select id="status" name="status" defaultValue={order?.status ?? "brief"}>{ORDER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</Select></div>
            <div><Label htmlFor="payment_status">Paiement</Label><Select id="payment_status" name="payment_status" defaultValue={order?.payment_status ?? "non_paye"}>{PAYMENT_STATUSES.map((payment) => <option key={payment.value} value={payment.value}>{payment.label}</option>)}</Select></div>
            <div><Label htmlFor="priority">Priorité</Label><Select id="priority" name="priority" defaultValue={order?.priority ?? "normale"}>{ORDER_PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</Select></div>
            <div><Label htmlFor="tags">Tags</Label><Input id="tags" name="tags" defaultValue={order?.tags?.join(", ") ?? ""} placeholder="logo, urgent, 3d" /><FieldHint>Séparés par des virgules.</FieldHint><FieldError>{errors.tags}</FieldError></div>
            <div><Label htmlFor="revisions_included">Révisions incluses</Label><Input id="revisions_included" name="revisions_included" type="number" min="0" max="99" defaultValue={order?.revisions_included ?? 2} /><FieldError>{errors.revisions_included}</FieldError></div>
            <div><Label htmlFor="revisions_used">Révisions utilisées</Label><Input id="revisions_used" name="revisions_used" type="number" min="0" max="99" defaultValue={order?.revisions_used ?? 0} /><FieldError>{errors.revisions_used}</FieldError></div>
            <div><Label htmlFor="time_spent_minutes">Temps passé (minutes)</Label><Input id="time_spent_minutes" name="time_spent_minutes" type="number" min="0" step="15" defaultValue={order?.time_spent_minutes ?? 0} /></div>
          </div>
        </details>
      </section>

      {state.status === "error" && state.message ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">{state.message}</p>
      ) : null}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-line bg-panel px-1 pb-1 pt-4">
        <p className="hidden text-[11px] text-muted sm:block">Les détails restent modifiables après création.</p>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>Annuler</Button>
          <Button type="submit" disabled={pending} className={cn("min-w-40", pending && "opacity-80")}>
            {pending ? <Spinner /> : order ? <Check className="size-4" /> : <Plus className="size-4" />}
            {pending ? "Enregistrement…" : order ? "Enregistrer" : "Créer la commande"}
            {!pending ? <ArrowRight className="size-4" /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OrderFormDialog({
  open,
  onOpenChange,
  clients,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  order?: Order;
}) {
  const router = useRouter();
  const action = order ? updateOrderAction : createOrderAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const handledState = useRef<OrderFormState | null>(null);

  useEffect(() => {
    if (state.status !== "success" || handledState.current === state) return;
    handledState.current = state;
    onOpenChange(false);
    router.refresh();
    if (!order && state.orderId) router.push(`/orders/${state.orderId}`);
  }, [state, order, onOpenChange, router]);

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={order ? "Modifier la commande" : "Créer une commande"}
      description={order ? "Mets à jour les informations de cette commande." : "Renseigne l'essentiel. Le reste pourra être complété depuis la fiche commande."}
      className="max-w-5xl overflow-hidden border-accent/20 shadow-[0_24px_100px_rgba(0,0,0,0.7),0_0_50px_rgba(120,87,255,0.12)]"
    >
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="hidden rounded-xl border border-accent/15 bg-gradient-to-b from-accent/15 via-panel-2/70 to-panel-2/30 p-4 lg:flex lg:flex-col">
          <div className="grid size-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
            <Sparkles className="size-5" />
          </div>
          <p className="mt-4 text-lg font-semibold tracking-tight text-ink">Rixx Studio</p>
          <p className="mt-1 text-xs leading-5 text-muted">Une nouvelle commande, un espace de travail prêt à démarrer.</p>
          <div className="my-5 h-px bg-line" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-strong">En quelques étapes</p>
          <div className="mt-4 space-y-4 text-xs text-ink-soft">
            <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-lg bg-accent/15 text-accent-strong"><UserRound className="size-3.5" /></span> Client</div>
            <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-lg bg-accent/15 text-accent-strong"><Layers3 className="size-3.5" /></span> Prestation</div>
            <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-lg bg-accent/15 text-accent-strong"><Wallet className="size-3.5" /></span> Tarification</div>
          </div>
          <div className="mt-auto rounded-xl border border-line bg-surface/60 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-ink"><Clock3 className="size-3.5 text-accent-strong" /> Pas besoin de tout remplir</div>
            <p className="mt-1.5 text-[10px] leading-4 text-muted">Les prix, échéances et options peuvent être ajoutés plus tard.</p>
          </div>
        </aside>
        <form action={formAction} className="min-w-0">
          <FormFields clients={clients} order={order} state={state} pending={pending} onCancel={() => onOpenChange(false)} />
        </form>
      </div>
    </Dialog>
  );
}
