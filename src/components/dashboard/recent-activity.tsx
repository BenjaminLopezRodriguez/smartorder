import { Camera, FileSearch, Mic, ScanLine, Upload } from "lucide-react";
import { type LucideIcon } from "lucide-react";

import { Section } from "~/components/ui/section";

interface ActivityEntry {
  id: string;
  icon: LucideIcon;
  text: string;
  meta: string;
  time: string;
}

const ACTIVITY: ActivityEntry[] = [
  {
    id: "a1",
    icon: ScanLine,
    text: "Scan session completed — Tuesday produce",
    meta: "42 items · 0 misses",
    time: "12 min ago",
  },
  {
    id: "a2",
    icon: Upload,
    text: "Order guide imported",
    meta: "Sysco_July.pdf · 312 rows · 96% confidence",
    time: "1 hour ago",
  },
  {
    id: "a3",
    icon: Camera,
    text: "Backroom snapshot uploaded",
    meta: "Walk-in cooler · 14 boxes detected",
    time: "3 hours ago",
  },
  {
    id: "a4",
    icon: Mic,
    text: "Voice list created",
    meta: "“2 cases paper towels, 3 creamers”",
    time: "Yesterday",
  },
  {
    id: "a5",
    icon: FileSearch,
    text: "Catalog updated",
    meta: "8 items reconciled with vendor sheet",
    time: "Yesterday",
  },
];

export function RecentActivity() {
  return (
    <Section title="Recent activity">
      <ol className="bg-surface border-border rounded-card border p-2 shadow-card">
        {ACTIVITY.map((entry) => {
          const Icon = entry.icon;
          return (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-md px-3 py-3"
            >
              <span className="bg-brand-soft text-brand-soft-foreground mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">
                  {entry.text}
                </p>
                <p className="text-muted mt-0.5 truncate text-xs">{entry.meta}</p>
              </div>
              <span className="text-muted shrink-0 text-xs whitespace-nowrap">
                {entry.time}
              </span>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
