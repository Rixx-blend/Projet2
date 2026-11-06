"use client";

import { ArrowDownUp, ArrowRight, Clock3, Grid2X2, ImagePlus, LayoutGrid, Plus, Search, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TabLink } from "@/components/layout/tabs-context";
import type { Workboard } from "@/lib/local/workspaces";
import { cn } from "@/lib/utils";

const WorkboardPreview = dynamic(() => import("@/components/workboards/workboard-preview").then((mod) => mod.WorkboardPreview), { ssr: false });

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}

export function WorkboardLibrary({ initialWorkboards }: { initialWorkboards: Omit<Workboard, "snapshot">[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialWorkboards);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Miniature");
  const [pending, setPending] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const categories = useMemo(() => ["Toutes", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const visible = useMemo(() => items
    .filter((item) => filter === "Toutes" || item.category === filter)
    .filter((item) => item.title.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")))
    .sort((a, b) => sort === "recent" ? b.updated_at.localeCompare(a.updated_at) : a.title.localeCompare(b.title, "fr")), [items, filter, search, sort]);

  async function create() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/workboards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: title.trim() || "Nouvelle miniature", category }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Création impossible.");
      router.push(`/workboards/${data.workboard.id}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer définitivement cette planche et son canvas ?")) return;
    const response = await fetch(`/api/workboards/${id}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert("La suppression a échoué.");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    setMenuId(null);
  }

  return (
    <main className="h-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted"><LayoutGrid className="size-3.5" /> Espace créatif</div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[30px]">Planches de travail</h1>
            <p className="mt-1.5 text-sm text-muted">Tous tes canvases de création, réunis au même endroit.</p>
          </div>
          <button onClick={() => { setTitle(""); setCategory("Miniature"); setDialog(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink shadow-sm transition hover:brightness-105">
            <Plus className="size-4" /> Nouvelle planche
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-line pb-4">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une planche…" className="h-10 w-full rounded-xl border border-line bg-panel pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent" />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-line bg-panel p-1">
            {categories.map((entry) => <button key={entry} onClick={() => setFilter(entry)} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition", filter === entry ? "bg-panel-2 text-ink" : "text-muted hover:text-ink")}>{entry}</button>)}
          </div>
          <button onClick={() => setSort((value) => value === "recent" ? "name" : "recent")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-xs text-ink-soft hover:border-line-strong"><ArrowDownUp className="size-3.5" /> {sort === "recent" ? "Récentes" : "Nom"}</button>
        </div>

        <div className="mb-4 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-ink">Toutes les planches</h2><span className="rounded-full border border-line bg-panel px-2 py-0.5 text-[10px] tabular-nums text-muted">{visible.length}</span></div>
          <span className="text-[11px] text-muted">Enregistrement automatique</span>
        </div>

        {visible.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((item) => (
              <article key={item.id} className="group relative overflow-hidden rounded-2xl border border-line bg-panel transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop">
                <TabLink href={`/workboards/${item.id}`} title={item.title} className="block">
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-[#1A1B1A]">
                    <WorkboardPreview id={item.id} />
                    <div className="absolute bottom-3 left-3 rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[10px] text-white/75 backdrop-blur">{item.category}</div>
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-panel-2 text-accent"><ImagePlus className="size-4" /></div>
                    <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-ink">{item.title}</h3><p className="mt-1 flex items-center gap-1 text-[11px] text-muted"><Clock3 className="size-3" /> Modifiée le {dateLabel(item.updated_at)}</p></div>
                    <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                </TabLink>
                <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} aria-label="Options de la planche" className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg border border-white/10 bg-black/45 text-white/80 opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100">•••</button>
                {menuId === item.id ? <div className="absolute right-3 top-12 z-20 w-40 rounded-xl border border-line bg-panel p-1.5 shadow-pop"><button onClick={() => void remove(item.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-danger hover:bg-white/5"><Trash2 className="size-3.5" /> Supprimer</button><button onClick={() => setMenuId(null)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted hover:bg-white/5"><X className="size-3.5" /> Fermer</button></div> : null}
              </article>
            ))}
            <button onClick={() => setDialog(true)} className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-panel/40 text-muted transition hover:border-accent/60 hover:bg-panel hover:text-ink"><span className="grid size-11 place-items-center rounded-xl border border-line bg-panel"><Plus className="size-5" /></span><span className="text-sm font-medium">Créer une nouvelle planche</span><span className="text-[11px]">Un nouvel espace, prêt à dessiner</span></button>
          </div>
        ) : (
          <div className="mt-8 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-panel/30 px-6 text-center">
            <div className="grid size-14 place-items-center rounded-2xl border border-line bg-panel text-accent"><Grid2X2 className="size-6" /></div>
            <h3 className="mt-5 text-base font-semibold text-ink">{search || filter !== "Toutes" ? "Aucun résultat" : "Ton espace de création est prêt"}</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{search || filter !== "Toutes" ? "Essaie un autre terme ou une autre catégorie." : "Crée une planche pour commencer une miniature, organiser tes références et conserver tes idées."}</p>
            {!search && filter === "Toutes" ? <button onClick={() => setDialog(true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"><Plus className="size-4" /> Créer ma première planche</button> : null}
          </div>
        )}
      </div>

      {dialog ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(false); }}>
        <form onSubmit={(event) => { event.preventDefault(); void create(); }} className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-pop">
          <div className="flex items-start justify-between"><div><p className="text-[11px] font-medium uppercase tracking-wider text-accent">Nouvel espace</p><h2 className="mt-1 text-lg font-semibold text-ink">Créer une planche</h2><p className="mt-1 text-xs text-muted">Un canvas indépendant, sauvegardé automatiquement.</p></div><button type="button" onClick={() => setDialog(false)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white/5"><X className="size-4" /></button></div>
          <label className="mt-5 block text-xs font-medium text-ink-soft">Nom de la planche<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Miniature Fortnite — Ranked" className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-accent" /></label>
          <label className="mt-4 block text-xs font-medium text-ink-soft">Type de création<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-accent"><option>Miniature</option><option>Bannière YouTube</option><option>Pack / couverture</option><option>Visuel réseaux sociaux</option><option>Autre</option></select></label>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDialog(false)} className="h-10 rounded-xl px-4 text-xs font-medium text-muted hover:bg-white/5">Annuler</button><button disabled={pending} type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-xs font-semibold text-accent-ink disabled:opacity-50"><Plus className="size-3.5" /> {pending ? "Création…" : "Créer le canvas"}</button></div>
        </form>
      </div> : null}
    </main>
  );
}
