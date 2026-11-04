import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** État vide : explique ce qui manque et propose une action pertinente. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/40 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-accent/12 text-accent-strong ring-1 ring-inset ring-accent/20">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[14px] font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
