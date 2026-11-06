import { cn, formatCurrency } from "@/lib/utils";
import type { MonthBucket, Slice } from "@/lib/revenue";

/** Barres verticales : revenus mois par mois. */
export function MonthlyBars({ data }: { data: MonthBucket[] }) {
  const max = Math.max(...data.map((bucket) => bucket.amount), 1);

  return (
    <div>
      <div className="flex h-44 items-end gap-1.5">
        {data.map((bucket) => {
          const height = bucket.amount > 0 ? Math.max(4, (bucket.amount / max) * 100) : 0;
          return (
            <div
              key={bucket.key}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={`${bucket.label} : ${formatCurrency(bucket.amount)} · ${bucket.orders} commande${
                bucket.orders > 1 ? "s" : ""
              }`}
            >
              <span className="mb-1 hidden rounded bg-panel-2 px-1 text-[11px] font-medium text-ink group-hover:block">
                {formatCurrency(bucket.amount)}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-md transition-all duration-300",
                  bucket.amount > 0
                    ? "bg-accent/80 group-hover:bg-accent"
                    : "bg-line/40",
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-1.5 border-t border-line pt-1.5">
        {data.map((bucket) => (
          <span
            key={bucket.key}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-muted"
          >
            {bucket.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Petites barres : nombre de commandes par mois. */
export function OrderCountBars({ data }: { data: MonthBucket[] }) {
  const max = Math.max(...data.map((bucket) => bucket.orders), 1);

  return (
    <div>
      <div className="flex h-20 items-end gap-1.5">
        {data.map((bucket) => (
          <div
            key={bucket.key}
            className="flex h-full flex-1 items-end"
            title={`${bucket.label} : ${bucket.orders} commande${bucket.orders > 1 ? "s" : ""}`}
          >
            <div
              className={cn(
                "w-full rounded-t-md",
                bucket.orders > 0 ? "bg-blue/60" : "bg-line/40",
              )}
              style={{ height: `${bucket.orders > 0 ? Math.max(6, (bucket.orders / max) * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-line pt-1.5">
        {data.map((bucket) => (
          <span
            key={bucket.key}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-muted"
          >
            {bucket.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barres horizontales : répartition par type / par client. */
export function Breakdown({
  data,
  emptyLabel,
  tone = "accent",
}: {
  data: Slice[];
  emptyLabel: string;
  tone?: "accent" | "amber" | "sky";
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(...data.map((entry) => entry.amount), 1);
  const barTone =
    tone === "amber" ? "bg-warning/80" : tone === "sky" ? "bg-blue/80" : "bg-accent";

  return (
    <ul className="space-y-2">
      {data.map((entry) => (
        <li key={entry.label}>
          <div className="flex items-baseline justify-between gap-2 text-[12px]">
            <span className="min-w-0 truncate text-ink-soft">{entry.label}</span>
            <span className="shrink-0 font-medium text-ink">
              {formatCurrency(entry.amount)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className={cn("h-full rounded-full", barTone)}
                style={{ width: `${Math.max(3, (entry.amount / max) * 100)}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-muted">
              {entry.count} cmd
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
