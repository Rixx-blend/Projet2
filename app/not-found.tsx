import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-2 text-xl font-semibold">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted">
          Cette page n’existe pas ou la commande a été supprimée.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-strong"
        >
          Retour aux commandes
        </Link>
      </div>
    </div>
  );
}
