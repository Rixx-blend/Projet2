import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "surface-card",
        interactive &&
          "transition-all duration-150 hover:-translate-y-px hover:border-line-strong hover:bg-panel-2/60",
        className,
      )}
      {...props}
    />
  );
}

/** En-tête d'une section de carte : titre 17px + action optionnelle à droite. */
export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Indicateur chiffré (icône, valeur, libellé, détail optionnel). */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "danger" | "success" | "warning";
  className?: string;
}) {
  return (
    <Card className={cn("px-4 py-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        {icon ? (
          <span className="grid size-7 place-items-center rounded-lg bg-accent/12 text-accent-strong [&_svg]:size-3.5">
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-[24px] font-semibold leading-none tracking-tight tabular-nums",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] text-muted">{hint}</p> : null}
    </Card>
  );
}
