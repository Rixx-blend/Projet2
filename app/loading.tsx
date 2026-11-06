export default function Loading() {
  return (
    <main className="grid h-dvh place-items-center bg-[#101A17] p-6 text-[#F0F0E6]">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#557B62] text-2xl font-bold text-[#F0F0E6] shadow-[0_0_35px_rgba(85,123,98,.28)]">R</div>
        <p className="mt-5 text-sm font-semibold tracking-wide">Rixx Studio</p>
        <p className="mt-1 text-xs text-[#B5C9A8]">Préparation de ton espace de travail…</p>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-[#203B30]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#B5C9A8]" /></div>
      </div>
    </main>
  );
}
