"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ExternalLink,
  Eye,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";

import {
  addManualInboxAction,
  convertInboxToOrderAction,
  setInboxStatusAction,
  type InboxActionResult,
} from "@/actions/inbox";
import { useTabs } from "@/components/layout/tabs-context";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import {
  INBOX_SOURCES,
  INBOX_STATUSES,
  excerpt,
  relativeTime,
  sourceMeta,
  statusMeta,
} from "@/lib/inbox";
import { cn, formatDateTime } from "@/lib/utils";
import type { InboxItem, InboxSource, InboxStatus } from "@/types/database";

const initialState: InboxActionResult = { ok: false };

export function InboxView({ items }: { items: InboxItem[] }) {
  const router = useRouter();
  const { openTab } = useTabs();
  const [source, setSource] = useState<InboxSource | "toutes">("toutes");
  const [status, setStatus] = useState<InboxStatus | "toutes">("toutes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [formState, formAction, formPending] = useActionState(
    addManualInboxAction,
    initialState,
  );

  const bySource = (value: InboxSource | "toutes") =>
    value === "toutes" ? items : items.filter((item) => item.source === value);
  const byStatus = (list: InboxItem[], value: InboxStatus | "toutes") =>
    value === "toutes" ? list : list.filter((item) => item.status === value);

  const filtered = byStatus(bySource(source), status);
  const newCount = items.filter((item) => item.status === "nouvelle").length;
  const selected = items.find((item) => item.id === selectedId) ?? null;

  function run(id: string, action: () => Promise<InboxActionResult>, success?: string) {
    setNotice(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.error ?? "Action impossible." });
        return;
      }
      if (success) setNotice({ tone: "ok", text: success });
      router.refresh();
    });
  }

  function convert(item: InboxItem) {
    setNotice(null);
    setPendingId(item.id);
    startTransition(async () => {
      const result = await convertInboxToOrderAction(item.id);
      setPendingId(null);
      if (!result.ok || !result.orderId) {
        setNotice({ tone: "error", text: result.error ?? "Conversion impossible." });
        return;
      }
      router.refresh();
      openTab(`/orders/${result.orderId}`, "Commande");
    });
  }

  return (
    <main className="mx-auto flex h-full w-full max-w-[1500px] animate-fade-up flex-col overflow-y-auto px-4 py-6 sm:px-8 lg:overflow-hidden">
      <PageHeader
        eyebrow="Boîte de réception"
        title="Messages"
        subtitle={
          items.length === 0
            ? "Les demandes de tes clients arriveront ici."
            : `${items.length} demande${items.length > 1 ? "s" : ""} · ${newCount} non lue${
                newCount > 1 ? "s" : ""
              }`
        }
        actions={
          <Button
            variant={showForm ? "outline" : "primary"}
            onClick={() => setShowForm((value) => !value)}
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Fermer" : "Ajouter une demande"}
          </Button>
        }
      />

      {showForm ? (
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
            setShowForm(false);
            router.refresh();
          }}
          className="surface-card mt-4 animate-pop p-4"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <Label htmlFor="author_name">Pseudo du client</Label>
              <Input
                id="author_name"
                name="author_name"
                placeholder="ex. lune.art"
                maxLength={120}
                required
              />
            </div>
            <div>
              <Label htmlFor="source">Origine</Label>
              <Select id="source" name="source" defaultValue="manuel">
                {INBOX_SOURCES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-3">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              required
              maxLength={8000}
              placeholder="« Salut ! Je cherche un logo pour ma chaîne, budget 150 €, pour la fin du mois… »"
              className="min-h-24"
            />
            <FieldError>{formState.error}</FieldError>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button type="submit" size="sm" disabled={formPending}>
              {formPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Ajouter la demande
            </Button>
            <p className="text-[11px] text-muted">
              Elle apparaîtra comme « nouvelle » et déclenchera une notification.
            </p>
          </div>
        </form>
      ) : null}

      {notice ? (
        <p
          role="status"
          className={cn(
            "mt-4 rounded-lg border px-3 py-2 text-xs",
            notice.tone === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        <FilterRow
          label="Statut"
          values={[
            { value: "toutes", label: "Tous", count: items.length },
            ...INBOX_STATUSES.map((entry) => ({
              value: entry.value,
              label: entry.label === "Nouvelle" ? "Non lues" : entry.label + "s",
              count: items.filter((item) => item.status === entry.value).length,
            })),
          ]}
          active={status}
          onSelect={(value) => setStatus(value as InboxStatus | "toutes")}
        />
        <FilterRow
          label="Source"
          values={[
            { value: "toutes", label: "Toutes", count: items.length },
            ...INBOX_SOURCES.map((entry) => ({
              value: entry.value,
              label: entry.short,
              count: items.filter((item) => item.source === entry.value).length,
            })),
          ]}
          active={source}
          onSelect={(value) => setSource(value as InboxSource | "toutes")}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Inbox}
          title="Aucun message pour l'instant"
          description="Ajoute une demande à la main, ou connecte Discord / X dans les paramètres pour les recevoir automatiquement."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="size-4" />
              Ajouter une demande
            </Button>
          }
        />
      ) : (
        <div className="mt-4 grid min-h-[420px] flex-1 gap-4 pb-4 lg:min-h-0 lg:grid-cols-[minmax(320px,400px)_1fr]">
          {/* Liste des conversations */}
          <div
            className={cn(
              "surface-card min-h-0 overflow-y-auto scrollbar-thin",
              selected ? "hidden lg:block" : "block",
            )}
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-12 text-center text-[13px] text-muted">
                Aucune demande ne correspond à ces filtres.
              </p>
            ) : (
              <ul className="divide-y divide-line/70">
                {filtered.map((item) => {
                  const meta = sourceMeta(item.source);
                  const state = statusMeta(item.status);
                  const isActive = item.id === selectedId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={cn(
                          "relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-panel-2/60",
                          isActive && "bg-accent/10",
                          item.status === "ignoree" && "opacity-65",
                        )}
                      >
                        {item.status === "nouvelle" ? (
                          <span
                            aria-label="Non lue"
                            className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent"
                          />
                        ) : null}
                        <span className="relative shrink-0">
                          <Avatar name={item.author_name} src={item.author_avatar} size={36} />
                          <span
                            title={meta.label}
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-panel",
                              meta.dot,
                            )}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span
                              className={cn(
                                "truncate text-[13px]",
                                item.status === "nouvelle" ? "font-semibold text-ink" : "font-medium text-ink-soft",
                              )}
                            >
                              {item.author_name}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted">
                              {relativeTime(item.received_at)}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted">
                            {excerpt(item.message, 140)}
                          </span>
                          <span
                            className={cn(
                              "mt-1.5 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                              state.badge,
                            )}
                          >
                            {state.label}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Conversation */}
          <div
            className={cn(
              "surface-card min-h-0 overflow-y-auto scrollbar-thin",
              selected ? "block" : "hidden lg:block",
            )}
          >
            {selected ? (
              <ConversationPane
                item={selected}
                pending={pendingId === selected.id}
                onBack={() => setSelectedId(null)}
                onStatus={(value, success) =>
                  run(selected.id, () => setInboxStatusAction(selected.id, value), success)
                }
                onConvert={() => convert(selected)}
                onOpenOrder={() =>
                  selected.order_id && openTab(`/orders/${selected.order_id}`, "Commande")
                }
              />
            ) : (
              <div className="grid h-full min-h-[280px] place-items-center p-8">
                <EmptyState
                  className="w-full max-w-md border-0 bg-transparent"
                  icon={MessageSquare}
                  title="Sélectionne une demande"
                  description="Le message complet, les informations du client et les actions apparaissent ici."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ConversationPane({
  item,
  pending,
  onBack,
  onStatus,
  onConvert,
  onOpenOrder,
}: {
  item: InboxItem;
  pending: boolean;
  onBack: () => void;
  onStatus: (status: InboxStatus, success: string) => void;
  onConvert: () => void;
  onOpenOrder: () => void;
}) {
  const meta = sourceMeta(item.source);
  const state = statusMeta(item.status);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour à la liste"
          className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-ink lg:hidden"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Avatar name={item.author_name} src={item.author_avatar} size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-semibold tracking-tight">
            {item.author_name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.badge)}>
              {meta.label}
            </span>
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", state.badge)}>
              {state.label}
            </span>
            <span>Reçue le {formatDateTime(item.received_at)}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 py-5">
        <div className="max-w-2xl rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3">
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
            {item.message}
          </p>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          L&apos;historique complet et la réponse se font dans la conversation d&apos;origine
          {item.conversation_url ? "" : " (lien indisponible pour cette demande)"}.
        </p>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
        {item.order_id ? (
          <Button variant="secondary" size="sm" onClick={onOpenOrder}>
            <ArrowUpRight className="size-3.5" />
            Ouvrir la commande
          </Button>
        ) : (
          <Button size="sm" disabled={pending} onClick={onConvert}>
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ShoppingBag className="size-3.5" />
            )}
            Transformer en commande
          </Button>
        )}

        {item.conversation_url ? (
          <a
            href={item.conversation_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink transition-colors hover:border-line-strong hover:bg-white/5"
          >
            <ExternalLink className="size-3.5" />
            Conversation
          </a>
        ) : null}

        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />

        {item.status !== "lue" && item.status !== "traitee" ? (
          <ItemButton
            icon={Eye}
            label="Marquer lue"
            disabled={pending}
            onClick={() => onStatus("lue", "Marquée comme lue.")}
          />
        ) : null}
        {item.status !== "traitee" ? (
          <ItemButton
            icon={Check}
            label="Traitée"
            disabled={pending}
            onClick={() => onStatus("traitee", "Demande traitée.")}
          />
        ) : null}
        {item.status !== "ignoree" ? (
          <ItemButton
            icon={X}
            label="Ignorer"
            disabled={pending}
            onClick={() => onStatus("ignoree", "Demande ignorée.")}
          />
        ) : null}
      </footer>
    </div>
  );
}

function FilterRow({
  label,
  values,
  active,
  onSelect,
}: {
  label: string;
  values: { value: string; label: string; count: number }[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-14 text-[11px] font-medium text-muted">
        {label}
      </span>
      {values.map((entry) => (
        <button
          key={entry.value}
          type="button"
          onClick={() => onSelect(entry.value)}
          aria-pressed={active === entry.value}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors",
            active === entry.value
              ? "border-accent/45 bg-accent/12 text-ink"
              : "border-line text-muted hover:border-line-strong hover:text-ink",
          )}
        >
          {entry.label}
          <span className="text-[10px] tabular-nums opacity-70">{entry.count}</span>
        </button>
      ))}
    </div>
  );
}

function ItemButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
