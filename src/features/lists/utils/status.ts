import type { ListStatus } from "~/types/inventory";

export type StatusTone = "brand" | "success" | "warning" | "neutral";

export const LIST_STATUS_MAP: Record<ListStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  scanning: { label: "In Progress", tone: "brand" },
  review: { label: "Review", tone: "warning" },
  complete: { label: "Completed", tone: "success" },
};

export function getListStatus(status: string) {
  return LIST_STATUS_MAP[status as ListStatus] ?? LIST_STATUS_MAP.draft;
}
