import { type Metadata } from "next";
import { CatalogSearch } from "~/components/search/catalog-search";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const listIdRaw = resolved?.listId;
  const listId = Array.isArray(listIdRaw) ? listIdRaw[0] : listIdRaw;
  return (
    <div className="flex flex-1 flex-col">
      <CatalogSearch listId={listId} />
    </div>
  );
}
