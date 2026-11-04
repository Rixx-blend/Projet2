"use client";

import {
  Archive,
  Box,
  Download,
  File as FileIcon,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { TabLink } from "@/components/layout/tabs-context";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { fileUrl } from "@/lib/storage";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

export type ResourceRow = {
  id: string;
  name: string;
  mime: string | null;
  size: number;
  createdAt: string;
  storagePath: string;
  orderId: string;
  orderTitle: string;
  client: string | null;
};

type Category = "image" | "design" | "pdf" | "3d" | "archive" | "other";

const CATEGORIES: { value: Category; label: string; icon: LucideIcon }[] = [
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "design", label: "Photoshop / design", icon: Layers },
  { value: "pdf", label: "PDF & documents", icon: FileText },
  { value: "3d", label: "Projets 3D", icon: Box },
  { value: "archive", label: "Archives", icon: Archive },
  { value: "other", label: "Autres", icon: FileIcon },
];

function categoryOf(row: ResourceRow): Category {
  const ext = row.name.split(".").pop()?.toLowerCase() ?? "";
  if (row.mime?.startsWith("image/") && !["psd", "ai"].includes(ext)) return "image";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"].includes(ext)) return "image";
  if (["psd", "psb", "ai", "xcf", "afdesign", "fig", "kra"].includes(ext)) return "design";
  if (ext === "pdf" || ["doc", "docx", "txt", "md", "odt"].includes(ext)) return "pdf";
  if (["blend", "fbx", "obj", "glb", "gltf", "c4d", "ma", "mb", "uasset", "stl"].includes(ext)) return "3d";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  return "other";
}

export function ResourcesView({ rows }: { rows: ResourceRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");

  const counts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const row of rows) map.set(categoryOf(row), (map.get(categoryOf(row)) ?? 0) + 1);
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "all" && categoryOf(row) !== category) return false;
      if (!needle) return true;
      return [row.name, row.orderTitle, row.client].some((value) =>
        value?.toLowerCase().includes(needle),
      );
    });
  }, [rows, query, category]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Aucun fichier pour l'instant"
        description="Les fichiers ajoutés dans une commande (références, briefs, livrables…) apparaîtront ici automatiquement."
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Type de fichier">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            Tous · {rows.length}
          </Chip>
          {CATEGORIES.filter((entry) => counts.has(entry.value)).map((entry) => (
            <Chip
              key={entry.value}
              active={category === entry.value}
              onClick={() => setCategory(entry.value)}
            >
              <entry.icon className="size-3.5" />
              {entry.label} · {counts.get(entry.value)}
            </Chip>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Fichier, commande ou client…"
            aria-label="Rechercher un fichier"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Search}
          title="Aucun fichier trouvé"
          description="Essaie un autre mot-clé ou un autre type de fichier."
        />
      ) : (
        <Card className="mt-4 overflow-hidden">
          <ul>
            {filtered.map((row) => {
              const cat = CATEGORIES.find((entry) => entry.value === categoryOf(row)) as (typeof CATEGORIES)[number];
              const Icon = cat.icon;
              return (
                <li
                  key={row.id}
                  className="flex items-center gap-3 border-b border-line/60 px-4 py-3 transition-colors last:border-0 hover:bg-panel-2/50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent-strong">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{row.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {cat.label} · {formatFileSize(row.size)} · ajouté le {formatDate(row.createdAt)}
                    </p>
                  </div>
                  <TabLink
                    href={`/orders/${row.orderId}`}
                    className="hidden min-w-0 max-w-[260px] flex-col text-right text-[12px] text-ink-soft hover:text-accent-strong sm:flex"
                  >
                    <span className="truncate">{row.orderTitle}</span>
                    {row.client ? <span className="truncate text-[11px] text-muted">{row.client}</span> : null}
                  </TabLink>
                  <a
                    href={fileUrl(row.storagePath)}
                    download={row.name}
                    aria-label={`Télécharger ${row.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-ink"
                  >
                    <Download className="size-4" />
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-accent/50 bg-accent/15 text-ink"
          : "border-line text-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
