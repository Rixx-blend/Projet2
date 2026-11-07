"use client";

import {
  ArrowUpRight,
  Download,
  Eraser,
  FileArchive,
  FileText,
  Grid3x3,
  Hand,
  Highlighter,
  ImageIcon,
  Minus,
  MousePointer2,
  Paperclip,
  Pencil,
  Plus,
  Redo2,
  StickyNote,
  Type,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BaseBoxShapeUtil,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultSizeStyle,
  ArrowShapeArrowheadEndStyle,
  ArrowShapeArrowheadStartStyle,
  getSnapshot,
  HTMLContainer,
  loadSnapshot,
  T,
  Tldraw,
  toRichText,
  useEditor,
  useValue,
  type Editor,
  type RecordProps,
  type TLShape,
  type TLShapeId,
  createShapeId,
} from "tldraw";

export type SaveState = "idle" | "saving" | "saved" | "error";

/* -------------------------------------------------------------------------- */
/*  Carte de fichier (forme personnalisée)                                    */
/* -------------------------------------------------------------------------- */

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    "file-card": {
      w: number;
      h: number;
      name: string;
      url: string;
      size: number;
      mime: string;
    };
  }
}

type FileCardShape = TLShape<"file-card">;

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    "image-card": { w: number; h: number; name: string; url: string; size: number; radius: number };
  }
}

type ImageCardShape = TLShape<"image-card">;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function FileGlyph({ mime, name }: { mime: string; name: string }) {
  if (mime.startsWith("image/")) return <ImageIcon size={22} />;
  if (/\.(zip|rar|7z)$/i.test(name)) return <FileArchive size={22} />;
  return <FileText size={22} />;
}

class FileCardUtil extends BaseBoxShapeUtil<FileCardShape> {
  static override type = "file-card" as const;
  static override props: RecordProps<FileCardShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    url: T.string,
    size: T.number,
    mime: T.string,
  };

  override getDefaultProps(): FileCardShape["props"] {
    return { w: 240, h: 76, name: "fichier", url: "", size: 0, mime: "" };
  }

  override canResize() {
    return false;
  }

  override component(shape: FileCardShape) {
    const { name, url, size, mime } = shape.props;
    const isImage = mime.startsWith("image/");
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            height: "100%",
            padding: "0 12px",
            borderRadius: 18,
            background: "#1C1D1C",
            border: "1px solid #454846",
            boxShadow: "0 6px 18px rgba(0,0,0,.35)",
            color: "#DEDFDD",
            fontFamily: "Segoe UI, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              flex: "none",
              width: 48,
              height: 48,
              borderRadius: 12,
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              background: "#B5CEA522",
              color: "#B5CEA5",
            }}
          >
            {isImage && url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <FileGlyph mime={mime} name={name} />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 11, color: "#B5CEA5" }}>{formatSize(size)}</div>
          </div>
          <a
            href={url}
            download={name}
            target="_blank"
            rel="noreferrer"
            title="Télécharger / ouvrir"
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              flex: "none",
              width: 34,
              height: 34,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#1C1D1C",
              color: "#DEDFDD",
            }}
          >
            <Download size={16} />
          </a>
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: FileCardShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 18);
    return path;
  }
}

class ImageCardUtil extends BaseBoxShapeUtil<ImageCardShape> {
  static override type = "image-card" as const;
  static override props: RecordProps<ImageCardShape> = { w: T.number, h: T.number, name: T.string, url: T.string, size: T.number, radius: T.number };
  override getDefaultProps(): ImageCardShape["props"] { return { w: 640, h: 420, name: "image", url: "", size: 0, radius: 24 }; }
  override component(shape: ImageCardShape) {
    return <HTMLContainer style={{ width: shape.props.w, height: shape.props.h, pointerEvents: "all" }}>
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: Math.max(0, Math.min(64, shape.props.radius)), background: "#171817", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 12px 32px rgba(0,0,0,.24)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shape.props.url} alt={shape.props.name} draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    </HTMLContainer>;
  }
  override getIndicatorPath(shape: ImageCardShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, Math.max(0, Math.min(64, shape.props.radius)));
    return path;
  }
}

const shapeUtils = [FileCardUtil, ImageCardUtil];

/* -------------------------------------------------------------------------- */
/*  Envoi de fichiers                                                         */
/* -------------------------------------------------------------------------- */

type UploadedFile = { id: string; name: string; type: string | null; size: number; url: string };
type InitialBoardFile = { id: string; name: string; type: string | null; size: number; storage_path: string };
function isImageUpload(file: { name: string; type?: string | null }) {
  if (file.type?.startsWith("image/")) return true;
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  return ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg"].includes(extension);
}

async function uploadFile(orderId: string, file: File): Promise<UploadedFile> {
  const response = await fetch(`/api/orders/${orderId}/files`, {
    method: "POST",
    headers: {
      "x-file-name": encodeURIComponent(file.name),
      "content-type": file.type || "application/octet-stream",
    },
    body: file,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Envoi impossible.");
  return data.file as UploadedFile;
}

/* -------------------------------------------------------------------------- */
/*  Interface par-dessus le canvas                                            */
/* -------------------------------------------------------------------------- */

const COLORS: { value: string; hex: string }[] = [
  { value: "black", hex: "#1d1d1d" },
  { value: "grey", hex: "#9fa8b2" },
  { value: "white", hex: "#ffffff" },
  { value: "red", hex: "#e03131" },
  { value: "orange", hex: "#f76707" },
  { value: "yellow", hex: "#f1ac4b" },
  { value: "green", hex: "#099268" },
  { value: "light-blue", hex: "#4dabf7" },
  { value: "blue", hex: "#4465e9" },
  { value: "violet", hex: "#ae3ec9" },
  { value: "light-violet", hex: "#e599f7" },
];

const SIZES = ["s", "m", "l", "xl"] as const;
const HEADS = [
  { value: "none", label: "Aucun" },
  { value: "arrow", label: "Flèche" },
  { value: "triangle", label: "Triangle" },
  { value: "dot", label: "Point" },
  { value: "bar", label: "Barre" },
] as const;

const TOOLS = [
  { id: "select", label: "Sélection (V)", icon: MousePointer2 },
  { id: "hand", label: "Main (H)", icon: Hand },
  { id: "draw", label: "Pinceau (D)", icon: Pencil },
  { id: "highlight", label: "Surligneur", icon: Highlighter },
  { id: "eraser", label: "Gomme (E)", icon: Eraser },
  { id: "arrow", label: "Flèche (A)", icon: ArrowUpRight },
  { id: "text", label: "Texte (T)", icon: Type },
  { id: "note", label: "Note (N)", icon: StickyNote },
] as const;

function BoardUI({
  orderId,
  onFilesUploaded,
  onError,
}: {
  orderId: string;
  onFilesUploaded: () => void;
  onError: (message: string) => void;
}) {
  const editor = useEditor();
  const fileInput = useRef<HTMLInputElement>(null);

  const tool = useValue("tool", () => editor.getCurrentToolId(), [editor]);
  const styles = useValue("styles", () => editor.getSharedStyles(), [editor]);
  const grid = useValue("grid", () => editor.getInstanceState().isGridMode, [editor]);
  const zoom = useValue("zoom", () => Math.round(editor.getZoomLevel() * 100), [editor]);
  const canUndo = useValue("undo", () => editor.getCanUndo(), [editor]);
  const canRedo = useValue("redo", () => editor.getCanRedo(), [editor]);
  const selectedImages = useValue("selected-image-cards", () => editor.getSelectedShapes().filter((shape): shape is ImageCardShape => shape.type === "image-card"), [editor]);

  const color = styles.get(DefaultColorStyle);
  const size = styles.get(DefaultSizeStyle);

  const showStyles = ["draw", "highlight", "arrow", "text", "note", "geo"].includes(tool) ||
    editor.getSelectedShapeIds().length > 0;
  const showHeads = tool === "arrow" || editor
    .getSelectedShapes()
    .some((shape) => shape.type === "arrow");

  const setColor = (value: string) => {
    editor.setStyleForNextShapes(DefaultColorStyle, value as never);
    if (editor.getSelectedShapeIds().length) {
      editor.setStyleForSelectedShapes(DefaultColorStyle, value as never);
    }
  };

  const setSize = (value: (typeof SIZES)[number]) => {
    editor.setStyleForNextShapes(DefaultSizeStyle, value);
    if (editor.getSelectedShapeIds().length) {
      editor.setStyleForSelectedShapes(DefaultSizeStyle, value);
    }
  };

  const setHead = (end: "start" | "end", value: string) => {
    const style = end === "start" ? ArrowShapeArrowheadStartStyle : ArrowShapeArrowheadEndStyle;
    editor.setStyleForNextShapes(style, value as never);
    if (editor.getSelectedShapeIds().length) {
      editor.setStyleForSelectedShapes(style, value as never);
    }
  };

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      try {
        const center = editor.getViewportPageBounds().center;
        let index = 0;
        for (const file of files) {
          const uploaded = await uploadFile(orderId, file);
          if (isImageUpload({ name: uploaded.name, type: uploaded.type ?? file.type })) {
            editor.createShape<ImageCardShape>({ id: createShapeId(), type: "image-card", x: center.x - 320 + index * 30, y: center.y - 210 + index * 30, props: { w: 640, h: 420, name: uploaded.name, url: uploaded.url, size: uploaded.size, radius: 24 }, meta: { orderFileId: uploaded.id } });
          } else {
            editor.createShape<FileCardShape>({ id: createShapeId(), type: "file-card", x: center.x - 120 + index * 24, y: center.y - 38 + index * 92, props: { w: 240, h: 76, name: uploaded.name, url: uploaded.url, size: uploaded.size, mime: uploaded.type ?? file.type }, meta: { orderFileId: uploaded.id } });
          }
          index += 1;
        }
        onFilesUploaded();
      } catch (error) {
        onError(error instanceof Error ? error.message : "Envoi impossible.");
      }
    },
    [editor, orderId, onFilesUploaded, onError],
  );

  // Dépôt / collage de fichiers → cartes (pas d'image encodée dans le board).
  useEffect(() => {
    editor.registerExternalContentHandler("files", async (content) => {
      await addFiles(content.files);
    });
  }, [editor, addFiles]);

  const btn =
    "grid size-9 place-items-center rounded-xl text-[#BFC2BE] transition-colors hover:bg-white/8 hover:text-white disabled:opacity-30";

  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1000 }}
      className="flex flex-col items-center justify-end gap-2 pb-4"
    >
      {showStyles ? (
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-[#454846] bg-[#1C1D1C]/95 px-3 py-2 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-1.5">
            {COLORS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                title={entry.value}
                onClick={() => setColor(entry.value)}
                className="size-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: entry.hex,
                  borderColor:
                    color?.type === "shared" && color.value === entry.value
                      ? "#B5CEA5"
                      : "#454846",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#B5CEA5]">Taille</span>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={
                size?.type === "shared" ? Math.max(0, SIZES.indexOf(size.value as never)) : 1
              }
              onChange={(event) => setSize(SIZES[Number(event.target.value)])}
              className="w-24 accent-[#B5CEA5]"
            />
          </div>
          {selectedImages.length ? <label className="flex items-center gap-2 text-[11px] text-[#B5CEA5]">Arrondi
            <input type="range" min={0} max={64} step={2} value={selectedImages[0].props.radius}
              onChange={(event) => editor.updateShapes(selectedImages.map((shape) => ({ id: shape.id, type: "image-card" as const, props: { radius: Number(event.target.value) } })))}
              className="w-24 accent-[#B5CEA5]" />
            <span className="w-7 tabular-nums">{selectedImages[0].props.radius}</span>
          </label> : null}
          {showHeads ? (
            <div className="flex items-center gap-2 text-[11px] text-[#B5CEA5]">
              <label className="flex items-center gap-1">
                Début
                <select
                  defaultValue="none"
                  onChange={(event) => setHead("start", event.target.value)}
                  className="rounded-md border border-[#454846] bg-[#1C1D1C] px-1 py-0.5 text-[#DEDFDD]"
                >
                  {HEADS.map((head) => (
                    <option key={head.value} value={head.value}>
                      {head.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                Fin
                <select
                  defaultValue="arrow"
                  onChange={(event) => setHead("end", event.target.value)}
                  className="rounded-md border border-[#454846] bg-[#1C1D1C] px-1 py-0.5 text-[#DEDFDD]"
                >
                  {HEADS.map((head) => (
                    <option key={head.value} value={head.value}>
                      {head.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-[#454846] bg-[#1C1D1C]/95 p-1.5 shadow-2xl backdrop-blur">
        {TOOLS.map((entry) => {
          const Icon = entry.icon;
          const active = tool === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              title={entry.label}
              onClick={() => editor.setCurrentTool(entry.id)}
              className={btn}
              style={active ? { background: "#B5CEA5", color: "#222423" } : undefined}
            >
              <Icon size={18} />
            </button>
          );
        })}
        <span className="mx-1 h-6 w-px bg-[#454846]" />
        <button
          type="button"
          title="Ajouter un fichier"
          className={btn}
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            void addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <button
          type="button"
          title="Grille"
          className={btn}
          style={grid ? { color: "#B5CEA5" } : undefined}
          onClick={() => editor.updateInstanceState({ isGridMode: !grid })}
        >
          <Grid3x3 size={18} />
        </button>
        <span className="mx-1 h-6 w-px bg-[#454846]" />
        <button type="button" title="Annuler" disabled={!canUndo} className={btn} onClick={() => editor.undo()}>
          <Undo2 size={18} />
        </button>
        <button type="button" title="Rétablir" disabled={!canRedo} className={btn} onClick={() => editor.redo()}>
          <Redo2 size={18} />
        </button>
        <span className="mx-1 h-6 w-px bg-[#454846]" />
        <button type="button" title="Zoom -" className={btn} onClick={() => editor.zoomOut()}>
          <Minus size={16} />
        </button>
        <button
          type="button"
          title="Ajuster à l'écran"
          className="min-w-12 rounded-xl px-1 text-[11px] text-[#BFC2BE] hover:bg-white/8"
          onClick={() => editor.zoomToFit({ animation: { duration: 200 } })}
        >
          {zoom}%
        </button>
        <button type="button" title="Zoom +" className={btn} onClick={() => editor.zoomIn()}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/** Dépose la carte (image ou fichier) d'un fichier de commande sur le canvas. */
function placeFileCard(editor: Editor, file: InitialBoardFile, index: number) {
  const center = editor.getViewportPageBounds().center;
  const url = "/api/files/" + file.storage_path;
  if (isImageUpload({ name: file.name, type: file.type })) {
    editor.createShape<ImageCardShape>({ id: createShapeId(), type: "image-card", x: center.x - 320 + index * 30, y: center.y - 210 + index * 30, props: { w: 640, h: 420, name: file.name, url, size: file.size, radius: 24 }, meta: { orderFileId: file.id } });
  } else {
    editor.createShape<FileCardShape>({ id: createShapeId(), type: "file-card", x: center.x - 120 + index * 24, y: center.y - 38 + index * 92, props: { w: 240, h: 76, name: file.name, url, size: file.size, mime: file.type ?? "" }, meta: { orderFileId: file.id } });
  }
}

/** Identifiants des fichiers de commande déjà présents sous forme de cartes sur le canvas. */
function fileIdsOnCanvas(editor: Editor) {
  return new Set(editor.getCurrentPageShapes().flatMap((shape) => {
    if (shape.type === "file-card" || shape.type === "image-card") {
      const fileId = (shape.meta as { orderFileId?: string }).orderFileId;
      return fileId ? [fileId] : [];
    }
    return [];
  }));
}

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */

export function TldrawBoard({
  orderId,
  initialSnapshot,
  boardNote,
  initialFiles,
  onSaveStateChange,
  onFilesUploaded,
  onError,
}: {
  orderId: string;
  initialSnapshot: unknown;
  boardNote: string | null;
  initialFiles: InitialBoardFile[];
  onSaveStateChange: (state: SaveState) => void;
  onFilesUploaded: () => void;
  onError: (message: string) => void;
}) {
  const [startBlank, setStartBlank] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const needsBackup = useRef(false);
  const onLoadFailed = useCallback(() => {
    needsBackup.current = true;
    setStartBlank(true);
    setAttempt((value) => value + 1);
    onError("Ancien board illisible : ouverture sans son contenu (une copie est conservée).");
  }, [onError]);
  const editorRef = useRef<Editor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fichiers déjà traités : une carte supprimée du canvas à la main n'est pas remise en place.
  const seenFileIds = useRef<Set<string>>(new Set());

  const save = useCallback(
    async (keepalive = false) => {
      const editor = editorRef.current;
      if (!editor || !dirty.current) return;
      dirty.current = false;
      onSaveStateChange("saving");
      try {
        const backup = needsBackup.current ? "?backup=1" : "";
        needsBackup.current = false;
        const response = await fetch(`/api/orders/${orderId}/board${backup}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: getSnapshot(editor.store) }),
          keepalive,
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Sauvegarde impossible.");
        }
        onSaveStateChange("saved");
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => onSaveStateChange("idle"), 2500);
      } catch (error) {
        dirty.current = true;
        onSaveStateChange("error");
        onError(error instanceof Error ? error.message : "Sauvegarde impossible.");
      }
    },
    [orderId, onSaveStateChange, onError],
  );

  useEffect(() => {
    const flush = () => void save(true);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      if (timer.current) clearTimeout(timer.current);
      void save(true);
    };
  }, [save]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      editor.user.updateUserPreferences({ colorScheme: "dark" });
      editor.updateInstanceState({ isGridMode: true });

      if (initialSnapshot && typeof initialSnapshot === "object" && !startBlank) {
        try {
          const snap = initialSnapshot as Record<string, unknown>;
          // On ne recharge que le dessin (document), jamais l'ancienne session
          // (page courante, caméra…) : c'est elle qui faisait planter la 1.1.0.
          const document = snap.document ?? (snap.store && snap.schema ? snap : null);
          if (document) loadSnapshot(editor.store, { document } as never);
          editor.getCurrentPageId();
        } catch {
          onLoadFailed();
          return;
        }
      }

      // Les fichiers ajoutés à la création sont déposés une seule fois sur le canvas.
      const existingFileIds = fileIdsOnCanvas(editor);
      let addedInitialFiles = 0;
      initialFiles.forEach((file, index) => {
        seenFileIds.current.add(file.id);
        if (existingFileIds.has(file.id)) return;
        addedInitialFiles += 1;
        placeFileCard(editor, file, index);
      });
      if (addedInitialFiles > 0) dirty.current = true;

      // Le brief du client est déposé une seule fois sur le canvas.
      if (boardNote) {
        const id: TLShapeId = createShapeId();
        const center = editor.getViewportPageBounds().center;
        editor.createShape({
          id,
          type: "note",
          x: center.x - 100,
          y: center.y - 100,
          props: { richText: toRichText(boardNote.slice(0, 1500)), color: "yellow" },
        });
        void fetch(`/api/orders/${orderId}/board-note`, { method: "DELETE" });
        dirty.current = true;
      }

      if (dirty.current) void save();

      editor.store.listen(
        () => {
          dirty.current = true;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void save(), 900);
        },
        { source: "user", scope: "document" },
      );
    },
    [initialSnapshot, boardNote, initialFiles, orderId, save, onError, startBlank, onLoadFailed],
  );

  // Fichiers ajoutés après l'ouverture du board (ex. via « Modifier la commande ») : placés sur le canvas.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const onCanvas = fileIdsOnCanvas(editor);
    const fresh = initialFiles.filter((file) => !seenFileIds.current.has(file.id) && !onCanvas.has(file.id));
    initialFiles.forEach((file) => seenFileIds.current.add(file.id));
    if (fresh.length === 0) return;
    fresh.forEach((file, index) => placeFileCard(editor, file, index));
    dirty.current = true;
    void save();
  }, [initialFiles, save]);

  const components = useMemo(
    () => ({
      ErrorFallback: ({ error }: { error: unknown }) => (
        <div className="grid h-full place-items-center bg-[#222423] p-6 text-[#DEDFDD]">
          <div className="max-w-md rounded-2xl border border-[#454846] bg-[#1C1D1C] p-5">
            <p className="text-sm font-semibold">Le board n&apos;a pas pu s&apos;afficher</p>
            <p className="mt-2 break-words text-xs text-[#B5CEA5]">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[#B5CEA5] px-3 py-2 text-xs font-semibold text-[#222423]"
              onClick={onLoadFailed}
            >
              Ouvrir avec un board vide (l&apos;ancien est conservé)
            </button>
          </div>
        </div>
      ),
    }),
    [onLoadFailed],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw
        key={attempt}
        hideUi
        shapeUtils={shapeUtils}
        components={components}
        onMount={handleMount}
        persistenceKey={undefined}
      >
        <BoardUI orderId={orderId} onFilesUploaded={onFilesUploaded} onError={onError} />
      </Tldraw>
    </div>
  );
}
