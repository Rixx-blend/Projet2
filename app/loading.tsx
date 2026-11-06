export default function Loading() {
  return (
    <main className="grid h-dvh place-items-center bg-[#222423] p-6 text-[#DEDFDD]">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#454846] bg-[#2A2B2A] text-2xl font-bold text-[#B5CEA5]">R</div>
        <p className="mt-5 text-sm font-semibold tracking-wide">Rixx Studio</p>
        <p className="mt-1 text-xs text-[#A3A5A3]">Préparation de ton espace de travail…</p>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-[#343735]"><div className="h-full w-2/3 animate-pulse rounded-full bg-[#B5CEA5]" /></div>
      </div>
    </main>
  );
}
