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
    <div className={cn("flex flex-col items-start gap-1 py-6", className)}>
      <Icon className="mb-2 size-4 text-muted" strokeWidth={1.75} />
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-[12px] text-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
