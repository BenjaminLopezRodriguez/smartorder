import { Boxes, FileSearch, Package, TrendingUp } from "lucide-react";

import { Section } from "~/components/ui/section";
import { StatCard } from "~/components/ui/stat-card";

/**
 * Static placeholder data. Wired to tRPC in a follow-up milestone.
 */
const STATS = [
  {
    label: "Catalog items",
    value: "1,284",
    hint: "+24 imported this week",
    hintTone: "positive" as const,
    icon: Package,
  },
  {
    label: "Active lists",
    value: "6",
    hint: "2 in scan session",
    hintTone: "neutral" as const,
    icon: FileSearch,
  },
  {
    label: "Backroom snapshots",
    value: "37",
    hint: "Last 24h",
    hintTone: "neutral" as const,
    icon: Boxes,
  },
  {
    label: "Scan throughput",
    value: "182/hr",
    hint: "+11% vs last week",
    hintTone: "positive" as const,
    icon: TrendingUp,
  },
];

export function InventoryStats() {
  return (
    <Section title="Inventory at a glance">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </Section>
  );
}
