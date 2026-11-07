"use client";

import {
  ExternalLink, Mail, MessageCircle, Plus, Search, Users, Youtube, Pencil,
  AtSign,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveClientAction } from "@/actions/clients";
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
            {filtered.map((row) => <li key={row.id}>
              <button type="button" onClick={() => setOpenId(row.id)}
                className="surface-card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-line-strong">
                {row.avatarUrl ? <img src={row.avatarUrl} alt="" className="size-10 rounded-full object-cover" /> : <Avatar name={row.name} size={40} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{row.name}</span>
                  <span className="block text-[12px] text-muted">{row.subscribers !== null ? `${formatCount(row.subscribers)} abonnés · ` : ""}{row.orders.length} commande{row.orders.length > 1 ? "s" : ""}</span>
                </span>
                <span className="text-[12px] tabular-nums text-success">{formatCurrency(row.collected)}</span>
              </button>
            </li>)}
          </ul>
          <Card className="mt-4 hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead><tr className="border-b border-line bg-surface/60 text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-medium">Client</th><th className="px-3 py-3 font-medium">YouTube / contacts</th>
                  <th className="px-3 py-3 text-right font-medium">Commandes</th><th className="px-3 py-3 text-right font-medium">Facturé</th>
                  <th className="px-3 py-3 text-right font-medium">Encaissé</th><th className="px-5 py-3 font-medium">Dernière activité</th>
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
                </tr>)}</tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {selected ? <Dialog open onClose={() => setOpenId(null)} title={selected.name}
        description={`Client depuis le ${formatDate(selected.createdAt)}`}>
        <ClientDetail row={selected} onNavigate={() => setOpenId(null)} onEdit={() => openEdit(selected)} />
      </Dialog> : null}

      <ClientEditor open={editorOpen} row={editing} onClose={() => setEditorOpen(false)}
        onSaved={() => { setEditorOpen(false); setEditing(null); router.refresh(); }} />
    </>
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
    setName(row?.name ?? "");
    setEmail(row?.email ?? "");
    setDiscord(row?.discord ?? "");
    setOther(row?.other ?? "");
    setNotes(row?.notes ?? "");
    setError("");
  }, [open, row]);
