"use client";

import { usePathname } from "next/navigation";

import { NAV, isNavActive } from "@/components/layout/app-sidebar";
import { TabLink } from "@/components/layout/tabs-context";
import { cn } from "@/lib/utils";

/** Navigation compacte en bas de l'écran, sur mobile uniquement. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="flex shrink-0 overflow-x-auto border-t border-line bg-surface px-1 pb-[env(safe-area-inset-bottom)] scrollbar-none md:hidden"
    >
      {NAV.map((entry) => {
        const active = isNavActive(entry.href, pathname);
        const Icon = entry.icon;
        return (
          <TabLink
            key={entry.href}
            href={entry.href}
            title={entry.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-w-[72px] flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
              active ? "text-accent-strong" : "text-muted",
            )}
          >
            {active ? (
              <span aria-hidden className="absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-accent" />
            ) : null}
            <Icon className="size-5" strokeWidth={1.75} />
            <span className="max-w-full truncate">{entry.short ?? entry.label}</span>
          </TabLink>
        );
      })}
    </nav>
  );
}
