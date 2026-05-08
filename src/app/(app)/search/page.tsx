import { type Metadata } from "next";

import { FilterChips } from "~/components/search/filter-chips";
import {
  InventoryCard,
  type InventoryItem,
} from "~/components/search/inventory-card";
import { SearchBar } from "~/components/search/search-bar";
import { PageHeader } from "~/components/ui/page-header";
import { Section } from "~/components/ui/section";

export const metadata: Metadata = {
  title: "Search",
};

const SAMPLE_RESULTS: InventoryItem[] = [
  {
    id: "i1",
    name: "Bolillo rolls — bakery par-baked, 24 ct",
    category: "Bakery",
    vendor: "La Hacienda Bakery",
    packSize: "24 ct",
    unitType: "case",
    barcode: "0 12345 67890 1",
    confidence: 0.96,
  },
  {
    id: "i2",
    name: "Coffee creamer — French vanilla, 32 oz",
    category: "Beverage",
    vendor: "Sysco",
    packSize: "32 oz",
    unitType: "unit",
    barcode: "0 22345 67890 2",
    confidence: 0.92,
  },
  {
    id: "i3",
    name: "Paper towels — multifold, 4000 ct case",
    category: "Paper",
    vendor: "Georgia-Pacific",
    packSize: "4000 ct",
    unitType: "case",
    barcode: "0 32345 67890 3",
    confidence: 0.88,
  },
  {
    id: "i4",
    name: "Romaine hearts — 6 ct bag",
    category: "Produce",
    vendor: "Fresh Express",
    packSize: "6 ct",
    unitType: "case",
    barcode: "0 42345 67890 4",
    confidence: 0.74,
  },
  {
    id: "i5",
    name: "All-purpose cleaner — 1 gal",
    category: "Cleaning",
    vendor: "Ecolab",
    packSize: "1 gal",
    unitType: "unit",
    barcode: "0 52345 67890 5",
    confidence: 0.68,
  },
  {
    id: "i6",
    name: "Whole milk — 1 gal jug, 4 ct",
    category: "Dairy",
    vendor: "Borden",
    packSize: "4 ct",
    unitType: "case",
    barcode: "0 62345 67890 6",
    confidence: 0.94,
  },
];

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Catalog"
        title="Search inventory"
        description="Fuzzy search across every imported order guide. UPC, name, vendor, category — search must feel instant."
      />

      <SearchBar />
      <FilterChips />

      <Section
        title="Results"
        description={`${SAMPLE_RESULTS.length} items · sorted by relevance`}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SAMPLE_RESULTS.map((item) => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      </Section>
    </div>
  );
}
