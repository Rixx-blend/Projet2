export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-8" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-panel" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[118px] animate-pulse rounded-2xl border border-line bg-panel" />
        ))}
      </div>
      <div className="mt-4 h-80 animate-pulse rounded-2xl border border-line bg-panel" />
    </div>
  );
}
