import { AlarmClock } from "lucide-react";

import { Badge, Dot } from "@/components/ui/badge";
import { paymentMeta, priorityMeta, statusMeta } from "@/lib/constants";
import { deadlineState } from "@/lib/deadline";
import { cn, deadlineLabel } from "@/lib/utils";
import type { OrderPriority, OrderStatus, PaymentStatus } from "@/types/database";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = statusMeta(status);
  return (
    <Badge className={meta.badge}>
      <Dot className={meta.dot} />
      {meta.label}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const meta = paymentMeta(status);
  return (
    <Badge className={meta.badge}>
      <Dot className={meta.dot} />
      {meta.label}
    </Badge>
  );
}

export function PriorityLabel({ priority }: { priority: OrderPriority }) {
  const meta = priorityMeta(priority);
  return (
    <span className={cn("text-[11px] font-medium", meta.badge)}>
      {meta.label}
    </span>
  );
}

export function DeadlineChip({
  deadline,
  status,
  className,
}: {
  deadline: string | null;
  status: OrderStatus;
  className?: string;
}) {
  const label = deadlineLabel(deadline);
  if (!label) return null;

  const state = deadlineState(deadline, status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px]",
        state.tone === "overdue" && "text-danger",
        state.tone === "soon" && "text-warning",
        state.tone === "ok" && "text-success/90",
        state.tone === "done" && "text-muted",
        className,
      )}
      title={deadline ? new Date(deadline).toLocaleString("fr-FR") : undefined}
    >
      {state.tone === "overdue" || state.tone === "soon" ? (
        <AlarmClock className="size-3" />
      ) : null}
      {label}
    </span>
  );
}

/**
 * Compte à rebours coloré : vert au-delà de 5 jours, orange de 1 à 5 jours,
 * rouge en retard, gris une fois la commande terminée.
 */
export function CountdownBadge({
  deadline,
  status,
  className,
  compact = false,
}: {
  deadline: string | null;
  status: OrderStatus;
  className?: string;
  compact?: boolean;
}) {
  const state = deadlineState(deadline, status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        state.chip,
        className,
      )}
      title={
        deadline
          ? `Deadline : ${new Date(deadline).toLocaleString("fr-FR")}`
          : "Aucune deadline"
      }
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", state.dot)} />
      {state.short}
    </span>
  );
}
