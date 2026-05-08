export default function ListsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="bg-surface-2 h-7 w-24 animate-pulse rounded-lg" />
        <div className="bg-surface-2 h-9 w-20 animate-pulse rounded-xl" />
      </div>
      <div className="bg-surface border-border rounded-xl border">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-border flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
          >
            <div className="bg-surface-2 h-10 w-10 shrink-0 animate-pulse rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="bg-surface-2 h-4 w-3/4 animate-pulse rounded" />
              <div className="bg-surface-2 h-3 w-1/2 animate-pulse rounded" />
            </div>
            <div className="bg-surface-2 h-5 w-16 animate-pulse rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
