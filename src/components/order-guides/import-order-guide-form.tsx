"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { parseOrderGuideFromCsvText } from "~/lib/order-guide-csv";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export const CSV_TEMPLATE = `name,vendor,category,pack_size,unit_type,barcode
Organic Whole Milk,Acme Dairy,Dairy,12/1 gal,case,012345678905
Sea Salt Kettle Chips,SnackCo,Snacks,64 count,unit,
`;

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Could not read file as text"));
    };
    reader.onerror = () =>
      reject(new Error(reader.error?.message ?? "File read failed"));
    reader.readAsText(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file as data URL"));
        return;
      }
      const parts = result.split(",");
      resolve(parts[1] ?? "");
    };
    reader.onerror = () =>
      reject(new Error(reader.error?.message ?? "File read failed"));
    reader.readAsDataURL(file);
  });
}

function detectSourceType(file: File): "pdf" | "image" {
  const lower = file.name.toLowerCase();
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  return "image";
}

export function ImportOrderGuideForm() {
  const router = useRouter();
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [csvText, setCsvText] = useState("");
  const [syncCatalog, setSyncCatalog] = useState(true);
  const [artifactFile, setArtifactFile] = useState<File | null>(null);

  const storage = api.orderGuides.storageStatus.useQuery();

  const preview = useMemo(
    () => parseOrderGuideFromCsvText(csvText),
    [csvText],
  );

  const createCsv = api.orderGuides.createFromCsv.useMutation({
    onSuccess: (res) => {
      if (res.ok && res.guideId) {
        router.push(`/order-guides/${res.guideId}`);
      }
    },
  });

  const createArtifact = api.orderGuides.createFromArtifact.useMutation({
    onSuccess: (res) => {
      if (res.ok && res.guideId) {
        router.push(`/order-guides/${res.guideId}`);
      }
    },
  });

  const previewRows = preview.rows.slice(0, 40);

  return (
    <div className="flex flex-col gap-8">
      <section className="bg-surface border-border rounded-card border p-4 shadow-card sm:p-5">
        <h2 className="text-foreground text-sm font-semibold">Guide details</h2>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-muted text-xs font-semibold tracking-wide uppercase">
              Guide name
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week of May 12 produce order"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted text-xs font-semibold tracking-wide uppercase">
              Vendor (optional)
            </span>
            <Input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Default vendor for rows without one"
            />
          </label>
        </div>
      </section>

      <section className="bg-surface border-border rounded-card border p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-foreground text-sm font-semibold">
              Import from CSV
            </h2>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Paste spreadsheet text or upload a file. Parsed rows are stored in
              the database (the raw CSV file is not kept).
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="md" type="button" asChild>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
                download="smartorder-order-guide-template.csv"
              >
                Download template
              </a>
            </Button>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await readFileAsText(file);
                setCsvText(text);
                e.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => csvFileInputRef.current?.click()}
            >
              Upload CSV file
            </Button>
          </div>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-muted text-xs font-semibold tracking-wide uppercase">
            CSV contents
          </span>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder='First row must be headers. Required: a "name" column.'
            rows={10}
            className={cn(
              "bg-surface border-border-strong text-foreground placeholder:text-muted",
              "min-h-[220px] w-full resize-y rounded-md border px-3.5 py-3 text-sm font-mono leading-relaxed",
              "focus:border-brand focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          />
        </label>

        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={syncCatalog}
            onChange={(e) => setSyncCatalog(e.target.checked)}
            className="text-brand focus:ring-brand h-5 w-5 rounded border-border-strong"
          />
          <span className="text-foreground text-sm">
            Match or create catalog items from each row
          </span>
        </label>

        {preview.errors.length > 0 ? (
          <ul className="border-danger/40 bg-danger/5 mt-4 rounded-md border px-3 py-2 text-sm text-danger">
            {preview.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        ) : null}

        {preview.rows.length > 0 ? (
          <div className="mt-4">
            <p className="text-muted mb-2 text-xs font-semibold uppercase">
              Preview ({preview.rows.length} rows
              {preview.rows.length > previewRows.length
                ? `, showing ${previewRows.length}`
                : ""}
              )
            </p>
            <div className="border-border max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 sticky top-0">
                  <tr>
                    <th className="text-muted px-3 py-2 font-semibold">Name</th>
                    <th className="text-muted px-3 py-2 font-semibold">Vendor</th>
                    <th className="text-muted px-3 py-2 font-semibold">Unit</th>
                    <th className="text-muted px-3 py-2 font-semibold">Barcode</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {previewRows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="text-foreground px-3 py-2">{r.rawName}</td>
                      <td className="text-muted px-3 py-2">{r.vendor ?? "—"}</td>
                      <td className="text-muted px-3 py-2">{r.unitType}</td>
                      <td className="text-muted font-mono px-3 py-2">
                        {r.barcode ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" size="lg" type="button" asChild>
            <Link href="/order-guides">Cancel</Link>
          </Button>
          <Button
            type="button"
            size="lg"
            variant="primary"
            disabled={
              createCsv.isPending ||
              !name.trim() ||
              !csvText.trim() ||
              preview.rows.length === 0
            }
            onClick={() => {
              createCsv.mutate({
                name: name.trim(),
                vendor: vendor.trim() || undefined,
                csvText,
                syncCatalog,
              });
            }}
          >
            {createCsv.isPending ? "Importing…" : "Import CSV"}
          </Button>
        </div>

        {createCsv.data && !createCsv.data.ok ? (
          <p className="text-danger mt-3 text-sm">{createCsv.data.errors.join(" ")}</p>
        ) : null}
        {createCsv.error ? (
          <p className="text-danger mt-3 text-sm">{createCsv.error.message}</p>
        ) : null}
        {createCsv.data?.ok && createCsv.data.warnings.length > 0 ? (
          <ul className="text-muted mt-3 text-xs">
            {createCsv.data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="bg-surface border-border rounded-card border p-4 shadow-card sm:p-5">
        <h2 className="text-foreground text-sm font-semibold">
          PDF or photo (optional)
        </h2>
        <p className="text-muted mt-1 text-xs leading-relaxed">
          Store a vendor PDF or shelf photo as reference. This does not extract
          line items automatically.
        </p>

        {!storage.data?.blobConfigured ? (
          <p className="border-border bg-surface-2 mt-4 rounded-md border px-3 py-3 text-sm">
            Configure{" "}
            <code className="bg-background rounded px-1 py-0.5 text-xs">
              BLOB_READ_WRITE_TOKEN
            </code>{" "}
            (Vercel Blob) to enable uploads. Until then, use CSV import above.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-muted text-xs font-semibold tracking-wide uppercase">
                PDF or image file
              </span>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="text-foreground text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold"
                onChange={(e) => setArtifactFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={
                createArtifact.isPending ||
                !artifactFile ||
                !name.trim() ||
                !storage.data?.blobConfigured
              }
              onClick={async () => {
                if (!artifactFile || !name.trim()) return;
                const base64 = await readFileAsBase64(artifactFile);
                createArtifact.mutate({
                  name: name.trim(),
                  vendor: vendor.trim() || undefined,
                  sourceType: detectSourceType(artifactFile),
                  filename: artifactFile.name,
                  contentBase64: base64,
                });
              }}
            >
              {createArtifact.isPending ? "Uploading…" : "Save PDF or photo"}
            </Button>
            {createArtifact.data && !createArtifact.data.ok ? (
              <p className="text-danger text-sm">{createArtifact.data.error}</p>
            ) : null}
            {createArtifact.error ? (
              <p className="text-danger text-sm">{createArtifact.error.message}</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
