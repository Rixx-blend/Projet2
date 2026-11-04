"use client";

import { Bell, CheckCheck, Loader2, Mail, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  markNotificationsReadAction,
  sendReminderEmailAction,
} from "@/actions/notifications";
import { TabLink, useTabs } from "@/components/layout/tabs-context";
import type { AppNotification } from "@/lib/notifications";
import { notificationEmoji, unreadCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const TONE_DOT = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-blue",
} as const;

const TONE_TEXT = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-blue",
} as const;

export function NotificationBell({
  notifications,
  emailReady,
}: {
  notifications: AppNotification[];
  emailReady: boolean;
}) {
  const router = useRouter();
  const { openTab } = useTabs();
  const [open, setOpen] = useState(false);
  const [locallyRead, setLocallyRead] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [emailState, setEmailState] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Les notifications déjà lues côté serveur restent lues, même après rafraîchissement.
  const items = notifications.map((item) =>
    item.read || locallyRead.includes(item.id) ? { ...item, read: true } : item,
  );
  const count = unreadCount(items);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function markRead(ids: string[]) {
    if (ids.length === 0) return;
    setLocallyRead((previous) => Array.from(new Set([...previous, ...ids])));
    startTransition(async () => {
      await markNotificationsReadAction(ids);
      router.refresh();
    });
  }

  function openItem(item: AppNotification) {
    setOpen(false);
    markRead([item.id]);
    if (item.href) {
      openTab(item.href, item.orderTitle || "Demandes reçues");
      return;
    }
    openTab(`/orders/${item.orderId}`, item.orderTitle);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          count > 0 ? `Notifications, ${count} non lue(s)` : "Notifications"
        }
        aria-expanded={open}
        className={cn(
          "relative grid size-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink",
          open && "border-line-strong bg-white/5 text-ink",
        )}
      >
        <Bell className="size-4" />
        {count > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-4 text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/50"
        >
          <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold text-ink">Notifications</p>
              <p className="text-[10px] text-muted">
                {count > 0
                  ? `${count} rappel${count > 1 ? "s" : ""} en attente`
                  : "Tout est à jour"}
              </p>
            </div>
            {count > 0 ? (
              <button
                type="button"
                onClick={() => markRead(items.filter((i) => !i.read).map((i) => i.id))}
                className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-1 text-[10px] text-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <CheckCheck className="size-3" />
                Tout lire
              </button>
            ) : null}
          </header>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-[11px] text-muted">
                Aucun rappel pour l’instant.
                <br />
                Les deadlines proches, retards et paiements en attente
                apparaîtront ici.
              </p>
            ) : (
              <ul className="divide-y divide-line/70">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={cn(
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]",
                        item.read && "opacity-55",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          TONE_DOT[item.tone],
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-[12px] font-medium",
                              TONE_TEXT[item.tone],
                            )}
                          >
                            {notificationEmoji(item.kind)} {item.title}
                          </span>
                          {!item.read ? (
                            <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-muted">
                              nouveau
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-soft">
                          {item.message}
                        </span>
                        {item.clientName ? (
                          <span className="mt-0.5 block text-[10px] text-muted">
                            {item.clientName}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="space-y-2 border-t border-line px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pending || count === 0 || !emailReady}
                onClick={() => {
                  setEmailState(null);
                  startTransition(async () => {
                    const result = await sendReminderEmailAction();
                    setEmailState({
                      tone: result.ok ? "ok" : "error",
                      text: result.message ?? result.error ?? "Envoi impossible.",
                    });
                  });
                }}
                title={
                  emailReady
                    ? "Envoyer les rappels non lus par e-mail"
                    : "Configure l'e-mail dans les paramètres"
                }
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1.5 text-[11px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-45"
              >
                {pending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Mail className="size-3" />
                )}
                Recevoir par e-mail
              </button>
              <TabLink
                href="/settings"
                title="Paramètres"
                onNavigate={() => setOpen(false)}
                aria-label="Paramètres des rappels"
                className="grid size-7 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <Settings2 className="size-3.5" />
              </TabLink>
            </div>

            {!emailReady ? (
              <p className="text-[10px] leading-snug text-muted">
                L’envoi par e-mail se configure dans Paramètres → Notifications
                (clé Resend gratuite).
              </p>
            ) : null}

            {emailState ? (
              <p
                role="status"
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] leading-snug",
                  emailState.tone === "ok"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-danger/30 bg-danger/10 text-danger",
                )}
              >
                {emailState.text}
              </p>
            ) : null}
          </footer>
        </div>
      ) : null}
    </div>
  );
}
