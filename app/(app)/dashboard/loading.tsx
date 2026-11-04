export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6">
      <div className="h-7 w-48 animate-pulse rounded-md bg-panel-2" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-panel-2" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[64px] animate-pulse rounded-xl border border-line bg-panel"
          />
        ))}
      </div>
      <div className="mt-6 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-[420px] w-[260px] shrink-0 animate-pulse rounded-xl border border-line bg-panel/60"
          />
        ))}
      </div>
    </main>
  );
}
