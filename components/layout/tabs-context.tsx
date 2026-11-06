"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** Un onglet ouvert dans la barre de navigation. */
export type AppTab = {
  href: string;
  title: string;
  section: string;
  closable: boolean;
};

const STORAGE_KEY = "orderboard.tabs.v1";
export const HOME_HREF = "/overview";

const SECTIONS: { prefix: string; label: string }[] = [
  { prefix: "/workboards/", label: "Planche de travail" },
  { prefix: "/workboards", label: "Planches de travail" },
  { prefix: "/orders/", label: "Commande" },
  { prefix: "/clients/", label: "Client" },
  { prefix: "/clients", label: "Clients" },
  { prefix: "/overview", label: "Vue d'ensemble" },
  { prefix: "/calendar", label: "Planning" },
  { prefix: "/revenue", label: "Finances" },
  { prefix: "/demands", label: "Messages" },
  { prefix: "/resources", label: "Ressources" },
  { prefix: "/settings", label: "Paramètres" },
  { prefix: "/dashboard", label: "Commandes" },
];

export function sectionOf(href: string): string {
  const match = SECTIONS.find(
    (entry) => href === entry.prefix || href.startsWith(entry.prefix),
  );
  return match?.label ?? "Page";
}

function makeTab(href: string, title?: string): AppTab {
  return {
    href,
    title: title?.trim() || sectionOf(href),
    section: sectionOf(href),
    closable: href !== HOME_HREF,
  };
}

/** Ajoute l'onglet de la page courante s'il n'existe pas encore. */
function withCurrentPage(tabs: AppTab[], pathname: string): AppTab[] {
  const href = pathname === "/" ? HOME_HREF : pathname;
  if (tabs.some((tab) => tab.href === href)) return tabs;
  return [makeTab(href), ...tabs];
}

type TabsContextValue = {
  tabs: AppTab[];
  activeHref: string;
  openTab: (href: string, title?: string) => void;
  closeTab: (href: string) => void;
  closeOtherTabs: (href: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function readStoredTabs(): AppTab[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppTab[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((tab) => typeof tab?.href === "string" && tab.href.startsWith("/"))
      .map((tab) => {
        const href = tab.href === "/" ? HOME_HREF : tab.href;
        return {
          href,
          title:
            typeof tab.title === "string" && tab.title.trim()
              ? tab.title
              : sectionOf(href),
          section: sectionOf(href),
          closable: href !== HOME_HREF,
        };
      });
  } catch {
    return [];
  }
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [storedTabs, setStoredTabs] = useState<AppTab[]>([]);

  // Lecture du stockage après le montage (évite tout écart d'hydratation).
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStoredTabs(readStoredTabs()));
    return () => cancelAnimationFrame(frame);
  }, []);

  // L'onglet de la page courante est dérivé : aucun état à synchroniser.
  const tabs = useMemo(() => {
    const withHome = storedTabs.some((tab) => tab.href === HOME_HREF)
      ? storedTabs
      : [makeTab(HOME_HREF), ...storedTabs];
    return withCurrentPage(withHome, pathname);
  }, [storedTabs, pathname]);

  // Le titre définitif arrive après le rendu de la page : on le récupère ensuite.
  useEffect(() => {
    const href = pathname === "/" ? HOME_HREF : pathname;
    const timers = [200, 700].map((delay) =>
      setTimeout(() => {
        const raw = document.title.replace(/\s*—\s*(OrderBoard|Rixx Studio)\s*$/i, "").trim();
        if (!raw) return;
        setStoredTabs((previous) => {
          const exists = previous.some((tab) => tab.href === href);
          if (!exists) return [...previous, makeTab(href, raw)];
          return previous.map((tab) =>
            tab.href === href && tab.title !== raw ? { ...tab, title: raw } : tab,
          );
        });
      }, delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [pathname]);

  // Persistance (effet de bord uniquement, pas de setState).
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // Stockage plein ou bloqué : les onglets restent valables pour la session.
    }
  }, [tabs]);

  const openTab = useCallback(
    (href: string, title?: string) => {
      setStoredTabs((previous) => {
        if (previous.some((tab) => tab.href === href)) {
          if (!title) return previous;
          return previous.map((tab) =>
            tab.href === href && tab.title !== title ? { ...tab, title } : tab,
          );
        }
        return [...previous, makeTab(href, title)];
      });
      router.push(href);
    },
    [router],
  );

  const closeTab = useCallback(
    (href: string) => {
      if (href === HOME_HREF) return;
      const currentIndex = tabs.findIndex((tab) => tab.href === href);

      setStoredTabs((previous) => previous.filter((tab) => tab.href !== href));

      if (href === pathname) {
        const remaining = tabs.filter((tab) => tab.href !== href);
        const fallback =
          remaining[currentIndex] ??
          remaining[currentIndex - 1] ??
          remaining.find((tab) => tab.href === HOME_HREF);
        router.push(fallback?.href ?? HOME_HREF);
      }
    },
    [pathname, router, tabs],
  );

  const closeOtherTabs = useCallback(
    (href: string) => {
      setStoredTabs((previous) =>
        previous.filter((tab) => tab.href === HOME_HREF || tab.href === href),
      );
      if (href !== pathname) router.push(href);
    },
    [pathname, router],
  );

  const value = useMemo<TabsContextValue>(
    () => ({
      tabs,
      activeHref: pathname === "/" ? HOME_HREF : pathname,
      openTab,
      closeTab,
      closeOtherTabs,
    }),
    [tabs, pathname, openTab, closeTab, closeOtherTabs],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs doit être utilisé dans <TabsProvider>.");
  }
  return context;
}

/** Lien qui ouvre le contenu dans un onglet (au lieu d'une navigation nue). */
export function TabLink({
  href,
  title,
  className,
  children,
  onNavigate,
  ...rest
}: React.ComponentProps<"a"> & {
  href: string;
  title?: string;
  onNavigate?: () => void;
}) {
  const { openTab } = useTabs();
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        openTab(href, title);
        onNavigate?.();
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
