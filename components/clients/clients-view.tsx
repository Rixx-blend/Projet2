"use client";

import {
  ExternalLink, Mail, MessageCircle, Plus, Search, Users, Video, Pencil, Trash2, Download,
  AtSign, Globe, MoreHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveClientAction, deleteClientAction } from "@/actions/clients";
import { StatusBadge, PaymentBadge } from "@/components/orders/order-badges";
import { TabLink } from "@/components/layout/tabs-context";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea, Label } from "@/components/ui/field";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  discord: string | null;
  other: string | null;
  youtubeUrl: string | null;
  avatarUrl: string | null;
  subscribers: number | null;
  videosCount: number | null;
  notes: string | null;
  createdAt: string;
  firstOrderAt: string | null;
  lastActivity: string;
  billed: number;
  collected: number;
  orders: {
    id: string; title: string; status: OrderStatus; payment: PaymentStatus;
    price: number; createdAt: string;
  }[];
};

export function ClientsView({ rows }: { rows: ClientRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [sort, setSort] = useState<"recent" | "name" | "billed">("recent");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? rows.filter((row) =>
          [row.name, row.email, row.discord, row.other, row.notes, row.youtubeUrl]
            .filter(Boolean).some((value) => (value as string).toLowerCase().includes(needle)),
        )
      : [...rows];
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "fr");
      if (sort === "billed") return b.billed - a.billed;
      return b.lastActivity.localeCompare(a.lastActivity);
    });
  }, [rows, query, sort]);

  const selected = rows.find((row) => row.id === openId) ?? null;

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(row: ClientRow) {
    setOpenId(null);
    setEditing(row);
    setEditorOpen(true);
  }

  return (
    <>
      <div className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un client, un contact, une chaîne…" aria-label="Rechercher un client" className="pl-9" />
        </div>
        <Select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Trier les clients" className="sm:w-52">
          <option value="recent">Tri : activité récente</option>
          <option value="name">Tri : nom (A–Z)</option>
          <option value="billed">Tri : montant facturé</option>
        </Select>
        <Button onClick={openCreate}><Plus className="size-4" /> Nouveau client</Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState className="mt-4" icon={Users} title="Aucun client pour l'instant"
          description="Ajoute tes clients pour centraliser leur chaîne YouTube, leurs contacts et leur historique." />
      ) : filtered.length === 0 ? (
        <EmptyState className="mt-4" icon={Search} title="Aucun résultat"
          description={`Aucun client ne correspond à « ${query} ».`} />
      ) : (
        <>
          <ul className="mt-4 space-y-2 md:hidden">
            {filtered.map((row) => <li key={row.id} className="surface-card flex items-center gap-2 p-3">
              <button type="button" onClick={() => setOpenId(row.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="size-10 rounded-full object-cover" /> : <Avatar name={row.name} size={40} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{row.name}</span>
                  <span className="block text-[12px] text-muted">{row.subscribers !== null ? `${formatCount(row.subscribers)} abonnés · ` : ""}{row.videosCount !== null ? `${formatCount(row.videosCount)} vidéos · ` : ""}{row.orders.length} commande{row.orders.length > 1 ? "s" : ""}</span>
                </span>
                <span className="text-[12px] tabular-nums text-success">{formatCurrency(row.collected)}</span>
              </button>
              <ClientRowMenu row={row} onDeleted={() => router.refresh()} />
            </li>)}
          </ul>
          <Card className="mt-4 hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead><tr className="border-b border-line bg-surface/60 text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Client</th><th className="px-3 py-3 font-medium">YouTube / contacts</th>
                  <th className="px-3 py-3 text-right font-medium">Commandes</th><th className="px-3 py-3 text-right font-medium">Facturé</th>
                  <th className="px-3 py-3 text-right font-medium">Encaissé</th><th className="px-5 py-3 font-medium">Dernière activité</th><th className="px-3 py-3 text-right font-medium"></th>
                </tr></thead>
                <tbody>{filtered.map((row) => <tr key={row.id} onClick={() => setOpenId(row.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpenId(row.id); } }}
                  tabIndex={0} className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel-2/60 focus-visible:bg-panel-2/60">
                  <td className="px-5 py-3"><div className="flex items-center gap-3">
                    {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="size-9 rounded-full object-cover" /> : <Avatar name={row.name} size={34} />}
                    <span><span className="block font-medium text-ink">{row.name}</span>{row.subscribers !== null ? <span className="text-[11px] text-muted">{formatCount(row.subscribers)} abonnés</span> : null}</span>
                  </div></td>
                  <td className="max-w-[260px] px-3 py-3 text-ink-soft"><Contacts row={row} /></td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.orders.length}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(row.billed)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-success">{formatCurrency(row.collected)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(row.lastActivity)}</td>
                  <td className="px-3 py-2 text-right"><ClientRowMenu row={row} onDeleted={() => router.refresh()} /></td>
                </tr>)}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {selected ? <Dialog open onClose={() => setOpenId(null)} title={selected.name}
        description={`Client depuis le ${formatDate(selected.createdAt)}`}>
        <ClientDetail row={selected} onNavigate={() => setOpenId(null)} onEdit={() => openEdit(selected)} onDeleted={() => { setOpenId(null); router.refresh(); }} />
      </Dialog> : null}

      <ClientEditor open={editorOpen} row={editing} onClose={() => setEditorOpen(false)}
        onSaved={() => { setEditorOpen(false); setEditing(null); router.refresh(); }} />
    </>
  );
}

function ClientRowMenu({ row, onDeleted }: { row: ClientRow; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative shrink-0" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <button type="button" aria-label={`Actions pour ${row.name}`} aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-panel-2 hover:text-ink">
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Fermer le menu" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 min-w-40 rounded-lg border border-line bg-panel p-1 shadow-pop">
            <button type="button" disabled={pending}
              onClick={() => {
                if (!window.confirm(`Supprimer définitivement le client « ${row.name} » ? Ses commandes seront conservées sans client associé.`)) return;
                startTransition(async () => {
                  const result = await deleteClientAction(row.id);
                  if (!result.ok) {
                    window.alert(result.error || "Suppression impossible.");
                    return;
                  }
                  setOpen(false);
                  onDeleted();
                });
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50">
              <Trash2 className="size-3.5" /> {pending ? "Suppression…" : "Supprimer le client"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ClientEditor({ open, row, onClose, onSaved }: {
  open: boolean; row: ClientRow | null; onClose: () => void; onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState(row?.youtubeUrl ?? "");
  const [avatarUrl, setAvatarUrl] = useState(row?.avatarUrl ?? "");
  const [subscribers, setSubscribers] = useState(row?.subscribers?.toString() ?? "");
  const [videosCount, setVideosCount] = useState(row?.videosCount?.toString() ?? "");
  const [lookupPending, setLookupPending] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [name, setName] = useState(row?.name ?? "");
  const [email, setEmail] = useState(row?.email ?? "");
  const [discord, setDiscord] = useState(row?.discord ?? "");
  const [other, setOther] = useState(row?.other ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");

  useEffect(() => {
    if (!open) return;
    setYoutubeUrl(row?.youtubeUrl ?? "");
    setAvatarUrl(row?.avatarUrl ?? "");
    setSubscribers(row?.subscribers?.toString() ?? "");
    setVideosCount(row?.videosCount?.toString() ?? "");
    setLookupMessage("");
    setName(row?.name ?? "");
    setEmail(row?.email ?? "");
    setDiscord(row?.discord ?? "");
    setOther(row?.other ?? "");
    setNotes(row?.notes ?? "");
    setError("");
  }, [open, row]);


  async function lookupChannel() {
    if (!youtubeUrl.trim() || lookupPending) return;
    setLookupPending(true);
    setLookupMessage("");
    try {
      const response = await fetch("/api/youtube-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Profil YouTube introuvable.");
      setName(result.name || "");
      setAvatarUrl(result.avatarUrl || "");
      setSubscribers(result.subscribers == null ? "" : String(result.subscribers));
      setVideosCount(result.videosCount == null ? "" : String(result.videosCount));
      setLookupMessage("Profil YouTube récupéré.");
    } catch (cause) {
      setLookupMessage(cause instanceof Error ? cause.message : "Impossible de récupérer ce profil.");
    } finally {
      setLookupPending(false);
    }
  }

  function submit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await saveClientAction({ ok: false }, formData);
      if (!result.ok) {
        setError(result.error ?? "Enregistrement impossible.");
        return;
      }
      onSaved();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={row ? "Modifier le client" : "Ajouter un client"}
      description="Centralise le profil public et tous les moyens de contact."
      className="max-w-2xl"
    >
      <form action={submit} className="space-y-5">
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Video className="size-4" /> Profil YouTube
          </div>
          <Field label="Lien de la chaîne YouTube">
            <Input name="youtube_url" value={youtubeUrl} onChange={e => { setYoutubeUrl(e.target.value); setLookupMessage(""); }} onBlur={() => { if (youtubeUrl.trim()) void lookupChannel(); }} placeholder="Colle le lien de la chaîne (youtube.com/@…)" />
          </Field>
          <input type="hidden" name="name" value={name || "Chaîne YouTube"} />
          <input type="hidden" name="avatar_url" value={avatarUrl} />
          <input type="hidden" name="subscribers" value={subscribers} />
          <input type="hidden" name="videos_count" value={videosCount} />
          {lookupPending ? <p className="text-xs text-muted">Récupération du profil YouTube…</p> : null}
          {lookupMessage ? <p role="status" className="text-xs text-muted">{lookupMessage}</p> : null}
          {avatarUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
              <img src={avatarUrl} alt="Photo de profil YouTube" className="size-14 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="text-xs text-muted">{subscribers ? formatCount(Number(subscribers)) + " abonnés" : "Abonnés indisponibles"}{videosCount ? " · " + formatCount(Number(videosCount)) + " vidéos" : ""}</p>
              </div>
              <button type="button" className="ml-auto text-xs text-accent hover:underline" onClick={() => void lookupChannel()}>Actualiser</button>
            </div>
          ) : null}
          <p className="text-[11px] text-muted">Le profil est récupéré automatiquement quand tu quittes le champ du lien. Les statistiques affichées dépendent des informations publiques accessibles sur YouTube.</p>
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <AtSign className="size-4" /> Coordonnées
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pseudo Discord">
              <Input name="discord" value={discord} onChange={e => setDiscord(e.target.value)} placeholder="@pseudo" />
            </Field>
            <Field label="Adresse e-mail">
              <Input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@…" />
            </Field>
            <Field label="Autre lien / réseau">
              <Input name="other_contact" value={other} onChange={e => setOther(e.target.value)} placeholder="Twitter, Instagram, site…" />
            </Field>
          </div>
        </section>

        <section className="space-y-2 border-t border-line pt-4">
          <Field label="Notes internes">
            <Textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Préférences, consignes, tarifs habituels…" />
          </Field>
        </section>

        {error ? (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={pending || lookupPending}>
            {pending ? "Enregistrement…" : row ? "Enregistrer les modifications" : "Créer le client"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function Contacts({ row }: { row: ClientRow }) {
  const items = [
    row.youtubeUrl ? { icon: Video, text: "Chaîne YouTube", href: row.youtubeUrl } : null,
    row.email ? { icon: Mail, text: row.email } : null,
    row.discord ? { icon: MessageCircle, text: row.discord } : null,
    row.other ? { icon: ExternalLink, text: row.other } : null,
  ].filter(Boolean) as { icon: typeof Mail; text: string; href?: string }[];

  if (items.length === 0) return <span className="text-muted">—</span>;

  return (
    <ul className="space-y-0.5">
      {items.map(item => (
        <li key={item.text} className="flex items-center gap-1.5 truncate text-[12px]">
          <item.icon className="size-3 shrink-0 text-muted" />
          {item.href ? (
            <a href={item.href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="truncate text-accent hover:underline">
              {item.text}
            </a>
          ) : <span className="truncate">{item.text}</span>}
        </li>
      ))}
    </ul>
  );
}

type ChannelInsight = {
  subscribers: number | null;
  videosCount: number | null;
  averageViews: number | null;
  sampledVideos: number;
  shortsCount: number;
  socialLinks: { label: string; url: string; kind: string }[];
};

function ClientDetail({ row, onNavigate, onEdit, onDeleted }: { row: ClientRow; onNavigate: () => void; onEdit: () => void; onDeleted: () => void }) {
  const [insights, setInsights] = useState<ChannelInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!row.youtubeUrl) {
      setInsights(null);
      return;
    }
    const controller = new AbortController();
    setInsightsLoading(true);
    setInsightsError("");
    fetch("/api/youtube-channel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: row.youtubeUrl }),
      signal: controller.signal,
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Statistiques indisponibles.");
        setInsights(result as ChannelInsight);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setInsightsError(error instanceof Error ? error.message : "Impossible de charger les statistiques.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setInsightsLoading(false);
      });
    return () => controller.abort();
  }, [row.youtubeUrl]);

  // Do not fall back to saved values after a live lookup: they may be stale or belong to an older channel.
  const liveSubscribers = insights ? insights.subscribers : null;
  const liveVideosCount = insights ? insights.videosCount : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
        {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="size-14 rounded-full object-cover" /> : <Avatar name={row.name} size={56} />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{row.name}</p>
          {liveSubscribers !== null || liveVideosCount !== null ? <p className="text-xs text-muted">{liveSubscribers !== null ? formatCount(liveSubscribers!) + " abonnés" : ""}{liveSubscribers !== null && liveVideosCount !== null ? " · " : ""}{liveVideosCount !== null ? formatCount(liveVideosCount!) + " vidéos" : ""} YouTube</p> : <p className="text-xs text-muted">Profil créateur</p>}
        </div>
        {row.avatarUrl ? (
          <a href={`/api/youtube-avatar?url=${encodeURIComponent(row.avatarUrl)}`} className="rounded-lg border border-line p-2 text-muted hover:text-ink" aria-label="Télécharger la photo de profil YouTube" title="Télécharger la photo de profil">
            <Download className="size-4" />
          </a>
        ) : null}
        {row.youtubeUrl ? (
          <a href={row.youtubeUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line p-2 text-muted hover:text-ink" aria-label="Ouvrir la chaîne YouTube">
            <Video className="size-4" />
          </a>
        ) : null}
      </div>

      {row.youtubeUrl ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-ink-soft">Statistiques de la chaîne</h3>
            {insightsLoading ? <span className="text-[11px] text-muted">Actualisation…</span> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric label="Abonnés" value={liveSubscribers !== null ? formatCount(liveSubscribers!) : "—"} />
            <Metric label="Vidéos au total" value={liveVideosCount !== null ? formatCount(liveVideosCount!) : "—"} />
            <Metric label="Vues moyennes / vidéo" value={insights?.averageViews !== null && insights?.averageViews !== undefined ? formatCount(insights.averageViews) : "—"} />
            <Metric label="Shorts détectés" value={insights ? String(insights.shortsCount) : "—"} />
          </div>
          {insights?.sampledVideos ? <p className="text-[11px] text-muted">Moyenne calculée sur {insights.sampledVideos} vidéos récentes accessibles, pas sur toute la chaîne.</p> : null}
          {insightsLoading && !insights ? <p className="text-xs text-muted">Récupération des statistiques et des liens publics…</p> : null}
          {insightsError ? <p className="text-xs text-muted">{insightsError}</p> : null}
        </section>
      ) : null}

      {insights?.socialLinks?.length ? (
        <section>
          <h3 className="text-[13px] font-medium text-ink-soft">Réseaux et liens de la chaîne</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {insights.socialLinks.map(link => {
              const brand = link.kind === "instagram" ? "instagram"
                : link.kind === "tiktok" ? "tiktok"
                : link.kind === "discord" ? "discord"
                : link.kind === "x" ? "x"
                : link.kind === "twitch" ? "twitch"
                : link.kind === "telegram" ? "telegram"
                : link.kind === "website" ? "" : "";
              const label = link.kind === "instagram" ? "Instagram"
                : link.kind === "discord" ? "Discord"
                : link.kind === "tiktok" ? "TikTok"
                : link.kind === "x" ? "X"
                : link.kind === "twitch" ? "Twitch"
                : link.kind === "telegram" ? "Telegram" : link.label;
              return (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
                  title={label} aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface transition-colors hover:border-line-strong hover:bg-panel-2">
                  {brand ? <img src={`https://cdn.simpleicons.org/${brand}`} alt="" width={18} height={18} className="size-[18px] brightness-0 invert" loading="lazy" /> : <Globe className="size-[18px] text-muted" />}
                </a>
              );
            })}
          </div>
        </section>
      ) : insights && !insightsLoading ? (
        <p className="text-xs text-muted">Aucun lien externe public détecté dans les informations de la chaîne.</p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Facturé" value={formatCurrency(row.billed)} />
        <Metric label="Encaissé" value={formatCurrency(row.collected)} tone="success" />
        <Metric label="Première commande" value={row.firstOrderAt ? formatDate(row.firstOrderAt) : "—"} />
      </div>

      <section>
        <h3 className="text-[13px] font-medium text-ink-soft">Contacts</h3>
        <div className="mt-2"><Contacts row={row} /></div>
      </section>
      <section>
        <h3 className="text-[13px] font-medium text-ink-soft">Notes</h3>
        <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{row.notes || <span className="text-muted">Aucune note.</span>}</p>
      </section>
      <section>
        <h3 className="text-[13px] font-medium text-ink-soft">Commandes ({row.orders.length})</h3>
        {row.orders.length === 0 ? <p className="mt-2 text-[13px] text-muted">Aucune commande pour ce client.</p> : (
          <ul className="mt-2 space-y-1.5">
            {row.orders.map(order => (
              <li key={order.id}>
                <TabLink href={"/orders/" + order.id} onNavigate={onNavigate}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 transition-colors hover:border-line-strong">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{order.title}</span>
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.payment} />
                  <span className="text-[13px] tabular-nums text-ink-soft">{formatCurrency(order.price)}</span>
                </TabLink>
              </li>
            ))}
          </ul>
        )}
      </section>
      {deleteError ? <p role="alert" className="text-xs text-danger">{deleteError}</p> : null}
      <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-3">
        <Button type="button" variant="ghost" disabled={deletePending} onClick={async () => {
          if (!window.confirm(`Supprimer définitivement le client « ${row.name} » ? Ses commandes seront conservées sans client associé.`)) return;
          setDeletePending(true);
          setDeleteError("");
          const result = await deleteClientAction(row.id);
          setDeletePending(false);
          if (!result.ok) { setDeleteError(result.error || "Suppression impossible."); return; }
          onDeleted();
        }}><Trash2 className="size-3.5" /> {deletePending ? "Suppression…" : "Supprimer le client"}</Button>
        <Button variant="secondary" onClick={onEdit}><Pencil className="size-3.5" /> Modifier le client</Button>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={tone === "success" ? "mt-0.5 text-sm font-semibold text-success" : "mt-0.5 text-sm font-semibold"}>{value}</p>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
