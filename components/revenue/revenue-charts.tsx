import { formatCurrency } from "@/lib/utils";
import type { MonthBucket, Slice } from "@/lib/revenue";

/** Courbe des revenus mois par mois. */
export function MonthlyBars({ data }: { data: MonthBucket[] }) {
  const width = 640;
  const height = 190;
  const pad = { top: 14, right: 10, bottom: 28, left: 10 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((bucket) => bucket.amount), 1);
  const slot = innerWidth / Math.max(data.length, 1);
  const x = (index: number) => pad.left + slot * index + slot / 2;
  const y = (amount: number) => pad.top + innerHeight - (amount / max) * innerHeight;
  const line = data.map((bucket, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(bucket.amount)}`).join(" ");
  const area = data.length ? `${line} L ${x(data.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z` : "";

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" role="img" aria-label="Évolution mensuelle des revenus">
        {[0, 0.5, 1].map((tick) => {
          const value = tick * max;
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.12" strokeDasharray="3 4" />
              <text x={pad.left} y={y(value) - 4} fontSize="9" fill="currentColor" opacity="0.55">{formatCurrency(value)}</text>
            </g>
          );
        })}
        {data.length > 1 ? (
          <>
            <path d={area} fill="rgba(181,206,165,0.12)" />
            <path d={line} fill="none" stroke="currentColor" className="text-accent" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}
        {data.map((bucket, index) => (
          <g key={bucket.key}>
            <circle cx={x(index)} cy={y(bucket.amount)} r="4" fill="currentColor" className="text-accent" stroke="var(--color-panel, #202420)" strokeWidth="1.5">
              <title>{`${bucket.label} : ${formatCurrency(bucket.amount)} · ${bucket.orders} commande${bucket.orders > 1 ? "s" : ""}`}</title>
            </circle>
            <text x={x(index)} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.65">{bucket.shortLabel}</text>
          </g>
        ))}
      </svg>
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
              className={bucket.orders > 0 ? "w-full rounded-t-md bg-blue/60" : "w-full rounded-t-md bg-line/40"}
              style={{ height: `${bucket.orders > 0 ? Math.max(6, (bucket.orders / max) * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-line pt-1.5">
        {data.map((bucket) => (
          <span key={bucket.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-muted">
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
            <span className="shrink-0 font-medium text-ink">{formatCurrency(entry.amount)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.max(3, (entry.amount / max) * 100)}%` }} />
            </div>
            <span className="w-14 shrink-0 text-right text-[10px] text-muted">{entry.count} cmd</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
