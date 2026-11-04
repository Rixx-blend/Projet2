export default function OrderLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
        <div className="size-8 animate-pulse rounded-lg border border-line bg-panel-2" />
        <div className="flex-1">
          <div className="h-3.5 w-44 animate-pulse rounded bg-panel-2" />
          <div className="mt-1.5 h-2.5 w-28 animate-pulse rounded bg-panel-2" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 animate-pulse bg-bg" />
        <div className="hidden w-[344px] shrink-0 border-l border-line bg-panel lg:block" />
      </div>
    </div>
  );
}
