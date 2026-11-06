"use client";

import { useState } from "react";

import { cn, formatCurrency } from "@/lib/utils";

export type ChartPoint = {
  key: string;
  label: string;
  collected: number;
  planned: number;
  isFuture: boolean;
};

export type ChartPeriod = { id: string; label: string; points: ChartPoint[] };

const W = 640;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 44 };

function niceMax(value: number) {
  if (value <= 0) return 100;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => value <= m * exponent) ?? 10;
  return step * exponent;
}

/** Revenus encaissés (plein) et prévus (contour) : jamais additionnés. */
export function RevenueChart({ periods }: { periods: ChartPeriod[] }) {
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const [hover, setHover] = useState<number | null>(null);
  const period = periods.find((p) => p.id === periodId) ?? periods[0];
  const points = period?.points ?? [];

  const max = niceMax(Math.max(0, ...points.flatMap((p) => [p.collected, p.planned])));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, points.length);
  const barW = Math.min(26, slot * 0.32);
  const y = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const active = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand" /> Encaissé
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border border-blue bg-blue/20" /> Prévu (reste à encaisser)
          </span>
        </div>
        <div role="tablist" aria-label="Période" className="flex rounded-lg border border-line bg-surface p-0.5">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === periodId}
              onClick={() => {
                setPeriodId(p.id);
                setHover(null);
              }}
              className={cn(
                "rounded-md px-3 py-1 text-[12px] font-medium transition-colors",
                p.id === periodId ? "bg-panel-2 text-ink" : "text-muted hover:text-ink-soft",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Revenus encaissés et prévus par mois"
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="#343735" strokeDasharray={tick === 0 ? undefined : "3 4"} />
              <text x={PAD.left - 8} y={y(tick) + 3} textAnchor="end" fontSize="10" fill="#B5CEA5">
                {tick >= 1000 ? `${tick / 1000}k` : Math.round(tick)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const h1 = Math.max(0, y(0) - y(p.collected));
            const h2 = Math.max(0, y(0) - y(p.planned));
            return (
              <g key={p.key} onMouseEnter={() => setHover(i)}>
                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill={hover === i ? "rgba(255,255,255,0.03)" : "transparent"} />
                <rect
                  x={cx - barW - 2}
                  y={y(p.collected)}
                  width={barW}
                  height={h1}
                  rx="4"
                  fill="#B5CEA5"
                  className="origin-bottom animate-[fade-up_0.4s_ease-out_both]"
                />
                <rect
                  x={cx + 2}
                  y={y(p.planned)}
                  width={barW}
                  height={h2}
                  rx="4"
                  fill="rgba(181,206,165,0.10)"
                  stroke="#B5CEA5"
                  strokeWidth="1"
                />
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill={hover === i ? "#DEDFDD" : "#B5CEA5"}>
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {active ? (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 animate-pop rounded-lg border border-line bg-panel-2 px-3 py-2 text-[12px] shadow-pop"
            style={{
              left: `${((PAD.left + slot * (hover ?? 0) + slot / 2) / W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-medium">{active.label}</p>
            <p className="mt-1 flex justify-between gap-4 text-ink-soft">
              <span>Encaissé</span>
              <span className="tabular-nums text-ink">{formatCurrency(active.collected)}</span>
            </p>
            <p className="flex justify-between gap-4 text-ink-soft">
              <span>Prévu</span>
              <span className="tabular-nums text-ink">{formatCurrency(active.planned)}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
