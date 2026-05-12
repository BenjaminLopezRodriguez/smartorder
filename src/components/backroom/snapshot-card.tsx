import { Boxes, Calendar, ImageIcon, MessageSquare } from "lucide-react";

import { Badge } from "~/components/ui/badge";

export interface BackroomSnapshot {
  id: string;
  location: string;
  uploadedBy: string;
  uploadedLabel: string;
  detectedItems: number;
  estimatedCases: number;
  /** Newest received-date label seen in the snapshot, e.g. "19 days ago". */
  oldestReceivedLabel?: string;
  /** Whether AI processing is complete. */
  status: "processing" | "ready";
  imageUrl?: string;
  note?: string;
}

interface SnapshotCardProps {
  snapshot: BackroomSnapshot;
}

export function SnapshotCard({ snapshot }: SnapshotCardProps) {
  return (
    <article className="bg-surface border-border rounded-card overflow-hidden border shadow-card">
      <div className="bg-surface-2 text-muted relative flex aspect-[4/3] items-center justify-center">
        {snapshot.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={snapshot.imageUrl}
            alt={`Snapshot of ${snapshot.location}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-10 w-10" />
        )}
        <div className="absolute top-2 left-2">
          <Badge
            tone={snapshot.status === "ready" ? "brand" : "warning"}
            size="sm"
          >
            {snapshot.status === "ready" ? "AI ready" : "Processing"}
          </Badge>
        </div>
        {snapshot.oldestReceivedLabel ? (
          <div className="absolute right-2 bottom-2">
            <Badge tone="warning" size="sm">
              <Calendar className="h-3 w-3" />
              Aged {snapshot.oldestReceivedLabel}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <h3 className="text-foreground text-sm font-semibold">
          {snapshot.location}
        </h3>
        <p className="text-muted mt-0.5 text-xs">
          {snapshot.uploadedBy} · {snapshot.uploadedLabel}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-surface-2 rounded-md px-3 py-2">
            <dt className="text-muted text-[10px] font-semibold tracking-wide uppercase">
              Items
            </dt>
            <dd className="text-foreground mt-0.5 flex items-center gap-1 text-sm font-semibold tabular-nums">
              <Boxes className="text-muted h-3.5 w-3.5" />
              {snapshot.detectedItems}
            </dd>
          </div>
          <div className="bg-surface-2 rounded-md px-3 py-2">
            <dt className="text-muted text-[10px] font-semibold tracking-wide uppercase">
              Est. cases
            </dt>
            <dd className="text-foreground mt-0.5 text-sm font-semibold tabular-nums">
              {snapshot.estimatedCases}
            </dd>
          </div>
        </dl>

        {snapshot.note ? (
          <div className="mt-3 flex gap-2">
            <MessageSquare className="text-muted mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="text-muted text-xs leading-snug">{snapshot.note}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
