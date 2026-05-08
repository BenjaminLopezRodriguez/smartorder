"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function CreateCatalogItemForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("");
  const [packSize, setPackSize] = useState("");
  const [unitType, setUnitType] = useState<"case" | "unit">("case");
  const [barcode, setBarcode] = useState("");

  const create = api.catalog.create.useMutation({
    onSuccess: () => {
      router.push("/search");
    },
  });

  return (
    <form
      className="bg-surface border-border rounded-card flex flex-col gap-3 border p-4 shadow-card sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({
          name,
          vendor: vendor || undefined,
          category: category || undefined,
          packSize: packSize || undefined,
          unitType,
          barcode: barcode || undefined,
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-muted text-xs font-semibold tracking-wide uppercase">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Paper towels — multifold"
            required
          />
        </div>
        <div>
          <label className="text-muted text-xs font-semibold tracking-wide uppercase">
            Vendor
          </label>
          <Input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Sysco"
          />
        </div>
        <div>
          <label className="text-muted text-xs font-semibold tracking-wide uppercase">
            Category
          </label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Cleaning"
          />
        </div>
        <div>
          <label className="text-muted text-xs font-semibold tracking-wide uppercase">
            Pack size
          </label>
          <Input
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            placeholder="e.g. 4000 ct"
          />
        </div>
        <div>
          <label className="text-muted text-xs font-semibold tracking-wide uppercase">
            Unit type
          </label>
          <div className="mt-1 flex gap-2">
            <Button
              type="button"
              variant={unitType === "case" ? "primary" : "secondary"}
              size="md"
              onClick={() => setUnitType("case")}
            >
              Case
            </Button>
            <Button
              type="button"
              variant={unitType === "unit" ? "primary" : "secondary"}
              size="md"
              onClick={() => setUnitType("unit")}
            >
              Unit
            </Button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="text-muted text-xs font-semibold tracking-wide uppercase">
            Barcode (optional)
          </label>
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="UPC / SKU"
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit" size="lg" disabled={create.isPending}>
          <Plus className="h-4 w-4" />
          Create item
        </Button>
      </div>
      {create.error ? (
        <p className="text-danger text-sm">{create.error.message}</p>
      ) : null}
    </form>
  );
}

