import Link from "next/link";
import { Mic, Plus, ScanLine, Upload } from "lucide-react";
import { type Metadata } from "next";

import { ListCard, type ListSummary } from "~/components/lists/list-card";
import { Button } from "~/components/ui/button";
import { IconTile } from "~/components/ui/icon-tile";
import { PageHeader } from "~/components/ui/page-header";
import { Section } from "~/components/ui/section";

export const metadata: Metadata = {
  title: "Lists",
};

const LISTS: ListSummary[] = [
  {
    id: "1",
    name: "Tuesday produce + dry goods",
    itemCount: 42,
    scannedCount: 28,
    status: "scanning",
    updatedLabel: "Updated 12 min ago",
    contentSummary: "Produce, Dry goods, Beverages",
  },
  {
    id: "2",
    name: "Bakery weekly order",
    itemCount: 18,
    scannedCount: 0,
    status: "draft",
    updatedLabel: "Updated 1 hour ago",
    contentSummary: "Bakery",
  },
  {
    id: "3",
    name: "Cleaning + paper",
    itemCount: 23,
    scannedCount: 23,
    status: "review",
    updatedLabel: "Updated yesterday",
    contentSummary: "Cleaning, Paper",
  },
  {
    id: "4",
    name: "Coffee bar restock",
    itemCount: 11,
    scannedCount: 11,
    status: "complete",
    updatedLabel: "Updated 2 days ago",
    contentSummary: "Beverage, Dairy",
  },
  {
    id: "5",
    name: "Walk-in cooler audit",
    itemCount: 36,
    scannedCount: 4,
    status: "draft",
    updatedLabel: "Updated 3 days ago",
    contentSummary: "Dairy, Produce, Frozen",
  },
];

export default function ListsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workflows"
        title="Lists"
        description="Working inventory and order-prep lists. Build by voice, by import, or by hand."
        actions={
          <Button asChild size="lg">
            <Link href="/lists#new">
              <Plus className="h-4 w-4" />
              New list
            </Link>
          </Button>
        }
      />

      <Section title="Build a list">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <IconTile
            icon={Upload}
            label="Import order guide"
            description="PDF or photo. We OCR and structure rows."
            href="#import"
          />
          <IconTile
            icon={Mic}
            label="Voice build list"
            description="Speak items naturally — we match the catalog."
            href="#voice"
          />
          <IconTile
            icon={ScanLine}
            label="Start scan session"
            description="Item-by-item Zebra-assisted run."
            href="#scan"
            emphasis
          />
        </div>
      </Section>

      <Section title="Active lists" description={`${LISTS.length} lists`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {LISTS.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      </Section>
    </div>
  );
}
