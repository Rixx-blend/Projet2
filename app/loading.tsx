export default function Loading() {
  return (
    <main className="grid h-dvh place-items-center bg-[#0b0c12] p-6 text-white">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-600 text-2xl font-bold shadow-[0_0_45px_rgba(124,58,237,.4)]">R</div>
        <p className="mt-5 text-sm font-semibold tracking-wide">Rixx Studio</p>
        <p className="mt-1 text-xs text-white/45">Préparation de ton espace de travail…</p>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 animate-pulse rounded-full bg-violet-500" /></div>
      </div>
    </main>
  );
}
