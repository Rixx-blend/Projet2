"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check,
  CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Command, FileImage,
  Filter, FolderKanban, LayoutDashboard, ListFilter, MoreHorizontal,
  Plus, Search, Settings2, Sparkles, Users, Wallet, X,
} from "lucide-react";

type Section = "Aperçu" | "Commandes" | "Clients" | "Finances" | "Planches de travail";
type Order = { id: number; title: string; client: string; type: string; price: number; status: string; due: string; color: string };

const initialOrders: Order[] = [
  { id: 1048, title: "Miniature — Nouvelle saison", client: "Nexor", type: "Miniature YouTube", price: 45, status: "En création", due: "Aujourd'hui", color: "#B5CEA5" },
  { id: 1047, title: "Pack visuel Fortnite", client: "Krayz", type: "Pack graphique", price: 120, status: "Révision", due: "Demain", color: "#A5B9CE" },
  { id: 1046, title: "Bannière chaîne", client: "Milo", type: "Bannière", price: 35, status: "À commencer", due: "12 nov.", color: "#C7A5CE" },
  { id: 1045, title: "Miniature ranked", client: "Nexor", type: "Miniature YouTube", price: 40, status: "Terminée", due: "8 nov.", color: "#CEBDA5" },
  { id: 1044, title: "Rendu 3D — Skin", client: "Aster", type: "Rendu 3D", price: 75, status: "En création", due: "14 nov.", color: "#A5C9C5" },
];

const clients = [
  { name: "Nexor", tag: "@nexorfn", orders: 8, spent: "320 €", initials: "N", color: "#B5CEA5" },
  { name: "Krayz", tag: "@krayz_", orders: 5, spent: "540 €", initials: "K", color: "#A5B9CE" },
  { name: "Milo", tag: "@milo", orders: 3, spent: "125 €", initials: "M", color: "#C7A5CE" },
  { name: "Aster", tag: "@asterdesign", orders: 6, spent: "410 €", initials: "A", color: "#CEBDA5" },
];

const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
  { label: "Aperçu", icon: LayoutDashboard },
  { label: "Commandes", icon: ListFilter },
  { label: "Clients", icon: Users },
  { label: "Finances", icon: Wallet },
  { label: "Planches de travail", icon: FolderKanban },
];

const money = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#343735] bg-[#1C1D1C] ${className}`}>{children}</section>;
}

function Heading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold tracking-tight text-[#DEDFDD]">{title}</h2>{subtitle && <p className="mt-1 text-sm text-[#929791]">{subtitle}</p>}</div>{action}</div>;
}

export default function DemoPage() {
  const [section, setSection] = useState<Section>("Aperçu");
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [modal, setModal] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftClient, setDraftClient] = useState("");
  const [draftPrice, setDraftPrice] = useState("45");
  const [tasks, setTasks] = useState([false, true, false, false]);
  const [notice, setNotice] = useState("");

  const filteredOrders = useMemo(() => orders.filter((o) => {
    const matches = `${o.title} ${o.client} ${o.type}`.toLowerCase().includes(query.toLowerCase());
    return matches && (filter === "Toutes" || o.status === filter);
  }), [orders, query, filter]);

  const total = orders.reduce((sum, o) => sum + o.price, 0);
  const active = orders.filter((o) => o.status !== "Terminée").length;

  function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftTitle.trim() || !draftClient.trim()) return;
    setOrders((current) => [{ id: Math.max(...current.map((o) => o.id), 1048) + 1, title: draftTitle.trim(), client: draftClient.trim(), type: "Création graphique", price: Number(draftPrice) || 0, status: "À commencer", due: "À définir", color: "#B5CEA5" }, ...current]);
    setDraftTitle(""); setDraftClient(""); setDraftPrice("45"); setModal(false); setSection("Commandes");
    setNotice("Commande ajoutée à la démo");
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <div className="min-h-dvh bg-[#222423] text-[#DEDFDD] selection:bg-[#B5CEA5]/20">
      <div className="sticky top-0 z-30 flex min-h-10 items-center justify-center gap-2 border-b border-[#B5CEA5]/20 bg-[#B5CEA5]/[0.08] px-4 py-2 text-center text-xs text-[#C7D9BC]">
        <Sparkles className="size-3.5 shrink-0" />
        <span><strong className="font-semibold">Mode démo</strong> · Données fictives, aucune donnée réelle n'est consultée ou modifiée.</span>
        <a href="https://github.com/Rixx-blend/Projet2" target="_blank" rel="noreferrer" className="ml-1 hidden underline underline-offset-2 sm:inline">Projet source</a>
      </div>

      <div className="flex min-h-[calc(100dvh-40px)]">
        <aside className="sticky top-10 hidden h-[calc(100dvh-40px)] w-[232px] shrink-0 flex-col border-r border-[#343735] bg-[#1C1D1C] p-4 md:flex">
          <div className="flex items-center gap-3 px-2 py-3"><div className="grid size-9 place-items-center rounded-xl bg-[#B5CEA5] font-bold text-[#222423]">R</div><div><p className="text-sm font-semibold">Rixx Studio</p><p className="text-[11px] text-[#8D948D]">Order management</p></div></div>
          <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#788078]">Espace de travail</div>
          <nav className="mt-3 space-y-1">
            {nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => setSection(label)} className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] transition ${section === label ? "bg-[#B5CEA5]/10 text-[#C6D9B8]" : "text-[#A6AAA5] hover:bg-white/[.04] hover:text-white"}`}><Icon className="size-[17px]" strokeWidth={1.8}/>{label}</button>)}
          </nav>
          <div className="mt-auto rounded-xl border border-[#343735] bg-[#252726] p-3"><div className="flex items-center gap-2 text-xs font-medium"><Activity className="size-4 text-[#B5CEA5]"/> Espace de démonstration</div><p className="mt-2 text-[11px] leading-5 text-[#8D948D]">Les modifications sont temporaires et restent dans cette session.</p></div>
          <div className="mt-4 flex items-center gap-3 border-t border-[#343735] px-2 pt-4"><div className="grid size-8 place-items-center rounded-full bg-[#B5CEA5]/15 text-xs font-semibold text-[#B5CEA5]">R</div><div><p className="text-xs font-medium">Rixx Studio</p><p className="text-[10px] text-[#858B84]">Compte démo</p></div><Settings2 className="ml-auto size-4 text-[#777E77]"/></div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-10 z-20 flex h-[62px] items-center justify-between border-b border-[#343735] bg-[#222423]/90 px-4 backdrop-blur-xl sm:px-7">
            <div className="flex items-center gap-2 md:hidden"><div className="grid size-8 place-items-center rounded-lg bg-[#B5CEA5] font-bold text-[#222423]">R</div><span className="text-sm font-semibold">Rixx Studio</span></div>
            <div className="relative hidden w-full max-w-[420px] md:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#747B74]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une commande ou un client..." className="h-9 w-full rounded-xl border border-[#343735] bg-[#1C1D1C] pl-9 pr-3 text-xs text-[#DEDFDD] outline-none placeholder:text-[#707770] focus:border-[#B5CEA5]/50"/></div>
            <div className="ml-auto flex items-center gap-2"><button onClick={() => setModal(true)} className="flex h-9 items-center gap-2 rounded-xl bg-[#B5CEA5] px-3 text-xs font-semibold text-[#222423] transition hover:bg-[#C5D9B6]"><Plus className="size-4"/>Nouvelle commande</button><button aria-label="Notifications" className="grid size-9 place-items-center rounded-xl border border-[#343735] text-[#9DA39C]"><Bell className="size-4"/></button></div>
          </header>

          <div className="mx-auto max-w-[1450px] p-4 sm:p-7 lg:p-9">
            <div className="mb-6 flex gap-1 overflow-x-auto md:hidden">{nav.map(({label}) => <button key={label} onClick={() => setSection(label)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs ${section===label?"bg-[#B5CEA5]/10 text-[#C6D9B8]":"text-[#929791]"}`}>{label}</button>)}</div>

            {section === "Aperçu" && <>
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#B5CEA5]">Espace de travail</p><h1 className="text-2xl font-semibold tracking-tight sm:text-[30px]">Bonjour Rixx</h1><p className="mt-1 text-sm text-[#929791]">Voici un aperçu de ton activité créative.</p></div><div className="flex items-center gap-2 rounded-xl border border-[#343735] bg-[#1C1D1C] px-3 py-2 text-xs text-[#A8ADA7]"><CalendarDays className="size-4"/> Novembre 2026 <ChevronDown className="size-3"/></div></div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[{label:"Revenus générés",value:money(total),hint:"+12,8 % ce mois",icon:CircleDollarSign,trend:true},{label:"Commandes actives",value:String(active),hint:"En cours de réalisation",icon:Command},{label:"Clients",value:"4",hint:"Clients dans le répertoire",icon:Users},{label:"À livrer",value:"3",hint:"Prochainement",icon:Clock3}].map(({label,value,hint,icon:Icon,trend})=><Panel key={label} className="relative overflow-hidden p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs text-[#9AA098]">{label}</span><Icon className="size-[17px] text-[#B5CEA5]"/></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-[#929791]">{trend&&<ArrowUpRight className="size-3 text-[#B5CEA5]"/>}{hint}</p></Panel>)}
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
                <Panel className="p-5"><div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold">Activité financière</h3><p className="mt-1 text-xs text-[#8E958D]">Revenus générés · 6 derniers mois</p></div><span className="rounded-lg bg-[#B5CEA5]/10 px-2.5 py-1 text-[10px] text-[#B5CEA5]">+18,4 %</span></div><div className="mt-7 flex h-[190px] items-end gap-3 border-b border-[#343735] px-1">{[{m:"Juin",v:34},{m:"Juil.",v:52},{m:"Août",v:43},{m:"Sept.",v:72},{m:"Oct.",v:61},{m:"Nov.",v:88}].map(({m,v},i)=><div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end"><div className={`w-full rounded-t-md transition-all duration-500 ${i===5?"bg-[#B5CEA5]":"bg-[#B5CEA5]/25 hover:bg-[#B5CEA5]/45"}`} style={{height:`${v}%`}}/></div><span className="pb-2 text-[10px] text-[#858C84]">{m}</span></div>)}</div></Panel>
                <Panel className="p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">À faire</h3><span className="text-[11px] text-[#858C84]">{tasks.filter(Boolean).length}/4 terminées</span></div><div className="mt-4 space-y-1">{["Finaliser la miniature de Nexor","Envoyer le rendu à Krayz","Préparer les exports 3D","Mettre à jour les planches"].map((t,i)=><button key={t} onClick={()=>setTasks(s=>s.map((v,j)=>j===i?!v:v))} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-white/[.03]"><span className={`grid size-[18px] shrink-0 place-items-center rounded-md border ${tasks[i]?"border-[#B5CEA5] bg-[#B5CEA5] text-[#222423]":"border-[#505650] text-transparent"}`}><Check className="size-3"/></span><span className={`text-xs ${tasks[i]?"text-[#777E77] line-through":"text-[#C5C9C3]"}`}>{t}</span></button>)}</div></Panel>
              </div>
              <div className="mt-6"><Heading title="Commandes récentes" subtitle="Les dernières commandes de ton activité" action={<button onClick={()=>setSection("Commandes")} className="text-xs text-[#B5CEA5] hover:underline">Voir tout</button>}/><OrdersTable orders={orders.slice(0,4)}/></div>
            </>}

            {section === "Commandes" && <><Heading title="Commandes" subtitle={`${orders.length} commandes · données de démonstration`} action={<button onClick={()=>setModal(true)} className="flex h-9 items-center gap-2 rounded-xl bg-[#B5CEA5] px-3 text-xs font-semibold text-[#222423]"><Plus className="size-4"/>Créer une commande</button>}/><div className="mb-4 flex flex-wrap items-center gap-2"><div className="relative min-w-[220px] flex-1 md:hidden"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#747B74]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher..." className="h-9 w-full rounded-lg border border-[#343735] bg-[#1C1D1C] pl-9 text-xs outline-none"/></div><Filter className="size-4 text-[#858C84]"/>{["Toutes","À commencer","En création","Révision","Terminée"].map(f=><button key={f} onClick={()=>setFilter(f)} className={`rounded-lg border px-3 py-2 text-[11px] ${filter===f?"border-[#B5CEA5]/40 bg-[#B5CEA5]/10 text-[#C6D9B8]":"border-[#343735] text-[#929791] hover:bg-white/[.03]"}`}>{f}</button>)}</div><OrdersTable orders={filteredOrders}/></>}

            {section === "Clients" && <><Heading title="Clients" subtitle="Ton répertoire de créateurs et collaborateurs"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{clients.map(c=><Panel key={c.name} className="p-5 transition hover:border-[#B5CEA5]/30"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-full text-sm font-semibold text-[#222423]" style={{background:c.color}}>{c.initials}</div><div className="min-w-0"><p className="text-sm font-semibold">{c.name}</p><p className="text-xs text-[#8E958D]">{c.tag}</p></div><button className="ml-auto text-[#7D847D]"><MoreHorizontal className="size-4"/></button></div><div className="mt-5 grid grid-cols-2 border-t border-[#343735] pt-4"><div><p className="text-[10px] uppercase tracking-wider text-[#858C84]">Commandes</p><p className="mt-1 text-lg font-semibold">{c.orders}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#858C84]">Total facturé</p><p className="mt-1 text-lg font-semibold">{c.spent}</p></div></div></Panel>)}</div></>}

            {section === "Finances" && <><Heading title="Finances" subtitle="Suivi des revenus et paiements · valeurs fictives"/><div className="grid gap-3 sm:grid-cols-3">{[{l:"Total facturé",v:"1 395 €"},{l:"Encaissé",v:"1 120 €"},{l:"À recevoir",v:"275 €"}].map(x=><Panel key={x.l} className="p-5"><p className="text-xs text-[#929791]">{x.l}</p><p className="mt-3 text-2xl font-semibold">{x.v}</p></Panel>)}</div><Panel className="mt-4 p-5"><h3 className="text-sm font-semibold">Répartition mensuelle</h3><div className="mt-6 space-y-4">{[{m:"Juin",v:420},{m:"Juillet",v:610},{m:"Août",v:530},{m:"Septembre",v:790},{m:"Octobre",v:680},{m:"Novembre",v:920}].map(x=><div key={x.m} className="grid grid-cols-[78px_1fr_60px] items-center gap-3 text-xs"><span className="text-[#929791]">{x.m}</span><div className="h-2 overflow-hidden rounded-full bg-[#343735]"><div className="h-full rounded-full bg-[#B5CEA5]" style={{width:`${x.v/1000*100}%`}}/></div><span className="text-right tabular-nums">{x.v} €</span></div>)}</div></Panel></>}

            {section === "Planches de travail" && <><Heading title="Planches de travail" subtitle="Espaces créatifs collaboratifs · aperçu fictif"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[{name:"Miniatures Nexor",count:"8 éléments",color:"#B5CEA5"},{name:"Pack Krayz — Saison 2",count:"12 éléments",color:"#A5B9CE"},{name:"Rendus 3D",count:"5 éléments",color:"#C7A5CE"}].map((b,i)=><Panel key={b.name} className="overflow-hidden"><div className="relative h-40 p-4" style={{background:`linear-gradient(135deg, ${b.color}22, #252726 70%)`}}><div className="absolute inset-4 grid grid-cols-3 gap-2 opacity-80">{Array.from({length:6}).map((_,j)=><div key={j} className="rounded-lg border border-white/10" style={{background:`${b.color}${j%2?"18":"30"}`}}/>)}</div><div className="absolute bottom-5 left-5 rounded-lg border border-white/10 bg-[#1C1D1C]/80 p-2 backdrop-blur"><FileImage className="size-5" style={{color:b.color}}/></div></div><div className="p-4"><p className="text-sm font-semibold">{b.name}</p><p className="mt-1 text-xs text-[#858C84]">{b.count} · Modifiée récemment</p></div></Panel>)}</div></>}
          </div>
        </main>
      </div>

      {notice && <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-[#B5CEA5]/30 bg-[#252726] px-4 py-3 text-xs shadow-xl"><CheckCircle2 className="size-4 text-[#B5CEA5]"/>{notice}</div>}
      {modal && <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form onSubmit={createOrder} className="w-full max-w-[440px] rounded-2xl border border-[#454846] bg-[#1C1D1C] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#B5CEA5]">Mode démo</p><h3 className="mt-1 text-lg font-semibold">Nouvelle commande</h3></div><button type="button" onClick={()=>setModal(false)} className="grid size-8 place-items-center rounded-lg text-[#929791] hover:bg-white/5"><X className="size-4"/></button></div><label className="mt-5 block text-xs text-[#A7ADA5]">Nom de la commande<input autoFocus required value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} placeholder="Ex. Miniature YouTube" className="mt-2 h-10 w-full rounded-lg border border-[#343735] bg-[#252726] px-3 text-sm text-white outline-none focus:border-[#B5CEA5]/60"/></label><label className="mt-4 block text-xs text-[#A7ADA5]">Client<input required value={draftClient} onChange={e=>setDraftClient(e.target.value)} placeholder="Nom du client" className="mt-2 h-10 w-full rounded-lg border border-[#343735] bg-[#252726] px-3 text-sm text-white outline-none focus:border-[#B5CEA5]/60"/></label><label className="mt-4 block text-xs text-[#A7ADA5]">Prix (€)<input type="number" min="0" value={draftPrice} onChange={e=>setDraftPrice(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#343735] bg-[#252726] px-3 text-sm text-white outline-none focus:border-[#B5CEA5]/60"/></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>setModal(false)} className="rounded-lg border border-[#343735] px-4 py-2 text-xs text-[#A7ADA5]">Annuler</button><button type="submit" className="rounded-lg bg-[#B5CEA5] px-4 py-2 text-xs font-semibold text-[#222423]">Ajouter à la démo</button></div></form></div>}
    </div>
  );
}

function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <Panel className="p-10 text-center text-sm text-[#858C84]">Aucune commande ne correspond à cette recherche.</Panel>;
  return <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="border-b border-[#343735] bg-[#252726] text-[10px] uppercase tracking-wider text-[#858C84]"><tr>{["Commande","Client","Type","Échéance","Montant","Statut"].map(h=><th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#343735]">{orders.map(o=><tr key={o.id} className="transition hover:bg-white/[.025]"><td className="px-4 py-4"><p className="text-xs font-medium text-[#D9DDD7]">{o.title}</p><p className="mt-1 text-[10px] text-[#737A73]">#{o.id}</p></td><td className="px-4 py-4 text-xs text-[#B8BDB6]">{o.client}</td><td className="px-4 py-4 text-xs text-[#929791]">{o.type}</td><td className="px-4 py-4 text-xs text-[#929791]">{o.due}</td><td className="px-4 py-4 text-xs font-semibold tabular-nums">{money(o.price)}</td><td className="px-4 py-4"><span className="whitespace-nowrap rounded-full border border-[#B5CEA5]/20 bg-[#B5CEA5]/[.07] px-2.5 py-1 text-[10px] text-[#C3D5B8]">{o.status}</span></td></tr>)}</tbody></table></div></Panel>;
}
