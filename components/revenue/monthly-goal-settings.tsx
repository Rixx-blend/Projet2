"use client";

import { useState, useTransition } from "react";
import { Target, Check } from "lucide-react";
import { setMonthlyGoalAction } from "@/actions/settings";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function MonthlyGoalSettings({ goal }: { goal: number }) {
  const [value, setValue] = useState(goal > 0 ? String(goal) : "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError("");
    const amount = Number(value.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0 || amount > 10000000) {
      setError("Entre un montant valide compris entre 0 et 10 000 000 €.");
      return;
    }
    startTransition(async () => {
      const result = await setMonthlyGoalAction(amount);
      if (result.ok) setSaved(true);
      else setError(result.error ?? "Enregistrement impossible.");
    });
  }

  return (
    <Card className="mt-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-panel-2 text-accent"><Target className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold text-ink">Objectif mensuel</h2>
          <p className="mt-1 text-[12px] leading-5 text-muted">Définis le montant que tu souhaites encaisser chaque mois. Cet objectif sert au suivi de tes revenus.</p>
          <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <input value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" placeholder="Ex. 800" aria-label="Objectif mensuel en euros" className="h-10 w-full rounded-xl border border-line bg-surface px-3 pr-9 text-[13px] text-ink outline-none focus:border-accent" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">€</span>
            </div>
            <button type="submit" disabled={pending} className="h-10 rounded-xl bg-accent px-4 text-[12px] font-semibold text-accent-ink disabled:opacity-50">{pending ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
          {saved ? <p role="status" className="mt-2 flex items-center gap-1.5 text-[11px] text-success"><Check className="size-3.5" /> Objectif enregistré : {formatCurrency(Number(value.replace(",", ".")))}</p> : null}
          {error ? <p role="alert" className="mt-2 text-[11px] text-danger">{error}</p> : null}
          {goal > 0 ? <p className="mt-2 text-[11px] text-muted">Objectif actuel : {formatCurrency(goal)}</p> : <p className="mt-2 text-[11px] text-muted">Aucun objectif défini.</p>}
        </div>
      </div>
    </Card>
  );
}
