"use client";

import { ChevronDown, Plus, Save } from "lucide-react";
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

function FormFields({
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
  const [newClient, setNewClient] = useState(clients.length === 0);
  const errors = state.fieldErrors ?? {};
  const hasDetailErrors = [
    "total_price",
    "deposit",
    "payment_status",
    "priority",
    "deadline",
    "tags",
    "revisions_included",
    "revisions_used",
    "time_spent_minutes",
  ].some((field) => Boolean((errors as Record<string, unknown>)[field]));

  return (
    <div className="space-y-5">
      {order ? <input type="hidden" name="id" value={order.id} /> : null}

      {/* Client ------------------------------------------------------------ */}
      <section className="rounded-xl border border-line bg-panel-2/50 p-3.5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Client
          </h3>
          <button
            type="button"
            onClick={() => setNewClient((value) => !value)}
            className="text-[11px] font-medium text-accent-strong hover:underline"
          >
            {newClient ? "Choisir un client existant" : "+ Nouveau client"}
          </button>
        </div>

        {newClient ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="new_client_name">Nom / pseudo</Label>
              <Input
                id="new_client_name"
                name="new_client_name"
                placeholder="Studio Lumen"
                maxLength={120}
              />
              <FieldError>{errors.new_client_name}</FieldError>
            </div>
            <div>
              <Label htmlFor="new_client_email">E-mail</Label>
              <Input
                id="new_client_email"
                name="new_client_email"
                type="email"
                placeholder="client@studio.fr"
              />
              <FieldError>{errors.new_client_email}</FieldError>
            </div>
            <div>
              <Label htmlFor="new_client_discord">Discord</Label>
              <Input
                id="new_client_discord"
                name="new_client_discord"
                placeholder="pseudo#0000"
              />
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="client_id">Client existant</Label>
            <Select
              id="client_id"
              name="client_id"
              defaultValue={order?.client_id ?? ""}
            >
              <option value="">— Choisir un client —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.email ? ` (${client.email})` : ""}
                </option>
              ))}
            </Select>
            <FieldError>{errors.client_id}</FieldError>
          </div>
        )}
      </section>

      {/* Commande ---------------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Titre de la commande</Label>
          <Input
            id="title"
            name="title"
            defaultValue={order?.title}
            placeholder="Logo pour Studio Lumen"
            maxLength={160}
            required
          />
          <FieldError>{errors.title}</FieldError>
        </div>

        <div>
          <Label htmlFor="service_type">Type de prestation</Label>
          <Select
            id="service_type"
            name="service_type"
            defaultValue={order?.service_type ?? SERVICE_TYPES[0]}
          >
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <FieldError>{errors.service_type}</FieldError>
        </div>

        <div>
          <Label htmlFor="status">Statut</Label>
          <Select id="status" name="status" defaultValue={order?.status ?? "demande"}>
            {ORDER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description / brief</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={order?.description ?? ""}
            placeholder="Contexte, livrables attendus, contraintes…"
            maxLength={5000}
          />
          <FieldError>{errors.description}</FieldError>
        </div>
      </div>

      {/* Détails facultatifs : repliés à la création pour une saisie rapide. */}
      <details
        key={hasDetailErrors ? "open" : "closed"}
        open={Boolean(order) || hasDetailErrors}
        className="group rounded-xl border border-line bg-surface/50"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          <span>
            Prix, paiement, deadline et suivi
            <span className="ml-2 text-[11px] font-normal text-muted">facultatif · à compléter plus tard</span>
          </span>
          <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-line px-4 py-4">
      {/* Argent ------------------------------------------------------------ */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="total_price">Prix total (€)</Label>
          <Input
            id="total_price"
            name="total_price"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={order?.total_price ?? 0}
          />
          <FieldError>{errors.total_price}</FieldError>
        </div>

        <div>
          <Label htmlFor="deposit">Acompte versé (€)</Label>
          <Input
            id="deposit"
            name="deposit"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={order?.deposit ?? 0}
          />
          <FieldError>{errors.deposit}</FieldError>
        </div>

        <div>
          <Label htmlFor="payment_status">Statut de paiement</Label>
          <Select
            id="payment_status"
            name="payment_status"
            defaultValue={order?.payment_status ?? "non_paye"}
          >
            {PAYMENT_STATUSES.map((payment) => (
              <option key={payment.value} value={payment.value}>
                {payment.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priorité</Label>
          <Select id="priority" name="priority" defaultValue={order?.priority ?? "normale"}>
            {ORDER_PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Planning ---------------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="deadline">Deadline</Label>
          <Input
            id="deadline"
            name="deadline"
            type="datetime-local"
            defaultValue={toDatetimeLocal(order?.deadline)}
          />
          <FieldError>{errors.deadline}</FieldError>
        </div>

        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={order?.tags?.join(", ") ?? ""}
            placeholder="logo, urgent, 3d"
          />
          <FieldHint>Séparés par des virgules (12 maximum).</FieldHint>
          <FieldError>{errors.tags}</FieldError>
        </div>

        <div>
          <Label htmlFor="revisions_included">Révisions incluses</Label>
          <Input
            id="revisions_included"
            name="revisions_included"
            type="number"
            min="0"
            max="99"
            step="1"
            defaultValue={order?.revisions_included ?? 2}
          />
          <FieldError>{errors.revisions_included}</FieldError>
        </div>

        <div>
          <Label htmlFor="revisions_used">Révisions utilisées</Label>
          <Input
            id="revisions_used"
            name="revisions_used"
            type="number"
            min="0"
            max="99"
            step="1"
            defaultValue={order?.revisions_used ?? 0}
          />
          <FieldError>{errors.revisions_used}</FieldError>
        </div>

        <div>
          <Label htmlFor="time_spent_minutes">Temps passé (minutes)</Label>
          <Input
            id="time_spent_minutes"
            name="time_spent_minutes"
            type="number"
            min="0"
            step="15"
            defaultValue={order?.time_spent_minutes ?? 0}
          />
          <FieldHint>Le chronomètre arrive en phase 4.</FieldHint>
          <FieldError>{errors.time_spent_minutes}</FieldError>
        </div>
      </div>

        </div>
      </details>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending} className={cn(pending && "opacity-80")}>
          {pending ? <Spinner /> : order ? <Save className="size-4" /> : <Plus className="size-4" />}
          {pending ? "Enregistrement…" : order ? "Enregistrer" : "Créer la commande"}
        </Button>
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
    if (!order && state.orderId) {
      router.push(`/orders/${state.orderId}`);
    }
  }, [state, order, onOpenChange, router]);

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={order ? "Modifier la commande" : "Nouvelle commande"}
      description={
        order
          ? "Mets à jour les informations de la commande."
          : "Un board tldraw et une checklist de suivi sont créés automatiquement."
      }
    >
      <form action={formAction}>
        <FormFields
          clients={clients}
          order={order}
          state={state}
          pending={pending}
          onCancel={() => onOpenChange(false)}
        />
      </form>
    </Dialog>
  );
}
