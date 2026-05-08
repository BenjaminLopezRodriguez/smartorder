import Link from "next/link";
import { Camera, Search } from "lucide-react";
import { type Metadata } from "next";

import {
  type BackroomSnapshot,
} from "~/components/backroom/snapshot-card";
import { BackroomSnapshotsSection } from "~/components/backroom/snapshots-section";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";
import { Section } from "~/components/ui/section";
import { StatCard } from "~/components/ui/stat-card";
import { Boxes, Calendar, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "BackroomVision",
};

const SNAPSHOTS: BackroomSnapshot[] = [
  {
    id: "s1",
    location: "Walk-in cooler · north wall",
    uploadedBy: "Maya R.",
    uploadedLabel: "12 min ago",
    detectedItems: 32,
    estimatedCases: 14,
    oldestReceivedLabel: "19 days",
    status: "ready",
  },
  {
    id: "s2",
    location: "Dry storage · aisle 2",
    uploadedBy: "Devon S.",
    uploadedLabel: "1 hour ago",
    detectedItems: 58,
    estimatedCases: 22,
    status: "ready",
  },
  {
    id: "s3",
    location: "Backroom · receiving dock",
    uploadedBy: "Jamie L.",
    uploadedLabel: "3 hours ago",
    detectedItems: 21,
    estimatedCases: 9,
    oldestReceivedLabel: "8 days",
    status: "processing",
  },
  {
    id: "s4",
    location: "Bakery freezer",
    uploadedBy: "Maya R.",
    uploadedLabel: "Yesterday",
    detectedItems: 12,
    estimatedCases: 6,
    status: "ready",
  },
  {
    id: "s5",
    location: "Cleaning supplies cabinet",
    uploadedBy: "Devon S.",
    uploadedLabel: "Yesterday",
    detectedItems: 18,
    estimatedCases: 4,
    status: "ready",
  },
  {
    id: "s6",
    location: "Walk-in cooler · south wall",
    uploadedBy: "Jamie L.",
    uploadedLabel: "2 days ago",
    detectedItems: 27,
    estimatedCases: 11,
    oldestReceivedLabel: "23 days",
    status: "ready",
  },
];

export default function BackroomPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Shared visual inventory"
        title="BackroomVision"
        description="A shared operational camera feed of your backroom. AI segments items, OCRs labels and dates, and surfaces aging inventory."
        actions={
          <>
            <Button variant="secondary" size="lg">
              <Search className="h-4 w-4" />
              Search snapshots
            </Button>
            <Button asChild size="lg">
              <Link href="/backroom/capture">
                <Camera className="h-4 w-4" />
                Capture
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Snapshots"
          value="37"
          hint="Last 7 days"
          icon={Boxes}
        />
        <StatCard
          label="Items detected"
          value="1,402"
          hint="By AI segmentation"
          icon={TrendingUp}
        />
        <StatCard
          label="Aging > 14 days"
          value="48"
          hint="Review recommended"
          hintTone="negative"
          icon={Calendar}
        />
        <StatCard
          label="Avg. confidence"
          value="91%"
          hint="OCR + segmentation"
          icon={TrendingUp}
        />
      </div>

      <Section title="Recent snapshots">
        <BackroomSnapshotsSection initialSnapshots={SNAPSHOTS} />
      </Section>
    </div>
  );
}
