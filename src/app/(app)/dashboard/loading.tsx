export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface-2 h-7 w-40 animate-pulse rounded-lg" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface border-border rounded-card h-20 animate-pulse border"
          />
        ))}
      </div>
      <div className="bg-surface-2 h-14 animate-pulse rounded-xl" />
      <div className="bg-surface border-border rounded-card h-48 animate-pulse border" />
    </div>
  );
}
