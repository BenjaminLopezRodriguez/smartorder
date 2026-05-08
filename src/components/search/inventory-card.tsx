import { Package, Plus } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  vendor: string;
  packSize: string;
  unitType: string;
  barcode: string;
  /** 0–1 confidence score from OCR/AI parsing. */
  confidence?: number;
  imageUrl?: string;
}

interface InventoryCardProps {
  item: InventoryItem;
}

export function InventoryCard({ item }: InventoryCardProps) {
  const confidencePct =
    typeof item.confidence === "number"
      ? Math.round(item.confidence * 100)
      : null;

  const confidenceTone: "success" | "warning" | "neutral" =
    confidencePct === null
      ? "neutral"
      : confidencePct >= 90
        ? "success"
        : confidencePct >= 70
          ? "warning"
          : "neutral";

  return (
    <article className="bg-surface border-border rounded-card flex items-stretch gap-4 border p-3 shadow-card sm:p-4">
      <div className="bg-surface-2 text-muted flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-24 sm:w-24">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-8 w-8" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-foreground line-clamp-2 text-sm font-semibold sm:text-[15px]">
              {item.name}
            </h3>
            <p className="text-muted mt-0.5 truncate text-xs">
              {item.vendor} · {item.category}
            </p>
          </div>
          {confidencePct !== null ? (
            <Badge tone={confidenceTone} size="sm">
              {confidencePct}%
            </Badge>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="outline" size="sm">
            {item.packSize}
          </Badge>
          <Badge tone="outline" size="sm">
            {item.unitType}
          </Badge>
          <span className="text-muted font-mono text-[11px] tracking-tight">
            {item.barcode}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm">
            Details
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add to list
          </Button>
        </div>
      </div>
    </article>
  );
}
