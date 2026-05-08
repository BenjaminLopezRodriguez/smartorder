"use client";

import { Mic, Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { cn } from "~/lib/utils";

interface SearchBarProps {
  initialValue?: string;
  className?: string;
  /** Optional onChange — kept simple so this works as a fully-controlled or uncontrolled bar. */
  onValueChange?: (value: string) => void;
}

export function SearchBar({
  initialValue = "",
  className,
  onValueChange,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const handleChange = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };

  return (
    <div
      className={cn(
        "bg-surface border-border-strong flex h-14 items-center gap-3 rounded-md border px-3 shadow-flat focus-within:border-brand",
        className,
      )}
    >
      <Search className="text-muted h-5 w-5 shrink-0" />
      <input
        autoFocus
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search inventory by name, UPC, vendor, category…"
        aria-label="Search inventory"
        className="text-foreground placeholder:text-muted h-full flex-1 bg-transparent text-base outline-none sm:text-sm"
      />

      {value ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => handleChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : (
        <div className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
      )}

      <span aria-hidden className="bg-border h-6 w-px" />

      <Button
        variant="ghost"
        size="icon"
        aria-label="Voice search"
        title="Voice search"
      >
        <Mic className="h-5 w-5" />
      </Button>
    </div>
  );
}
