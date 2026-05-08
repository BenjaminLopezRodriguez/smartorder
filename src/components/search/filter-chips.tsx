"use client";

import { useState } from "react";

import { cn } from "~/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "produce", label: "Produce" },
  { id: "dry", label: "Dry goods" },
  { id: "dairy", label: "Dairy" },
  { id: "bakery", label: "Bakery" },
  { id: "cleaning", label: "Cleaning" },
  { id: "paper", label: "Paper" },
  { id: "beverage", label: "Beverage" },
  { id: "favorites", label: "Favorites" },
];

export function FilterChips() {
  const [active, setActive] = useState("all");

  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:-mx-0 sm:px-0">
      <div className="flex w-max items-center gap-2">
        {FILTERS.map((filter) => {
          const selected = filter.id === active;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActive(filter.id)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                selected
                  ? "bg-foreground border-foreground text-surface"
                  : "bg-surface border-border-strong text-muted-foreground hover:bg-surface-2",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
