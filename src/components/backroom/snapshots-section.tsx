"use client";

import { useEffect, useMemo, useState } from "react";

import { SnapshotCard, type BackroomSnapshot } from "./snapshot-card";

type StoredBackroomSnapshot = {
  id: string;
  location: string;
  imageUrl: string;
  createdAt: number;
};

const STORAGE_KEY = "smartorder.backroom.snapshots.v1";

function safeParseSnapshots(raw: string | null): StoredBackroomSnapshot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredBackroomSnapshot => {
        if (!item || typeof item !== "object") return false;
        const obj = item as Record<string, unknown>;
        return (
          typeof obj.id === "string" &&
          typeof obj.location === "string" &&
          typeof obj.imageUrl === "string" &&
          typeof obj.createdAt === "number"
        );
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

function formatRelative(ts: number) {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins <= 0) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function BackroomSnapshotsSection({
  initialSnapshots,
}: {
  initialSnapshots: BackroomSnapshot[];
}) {
  const [localSnapshots, setLocalSnapshots] = useState<BackroomSnapshot[]>([]);

  useEffect(() => {
    const stored = safeParseSnapshots(window.localStorage.getItem(STORAGE_KEY));
    const mapped: BackroomSnapshot[] = stored.map((s) => ({
      id: s.id,
      location: s.location,
      uploadedBy: "You",
      uploadedLabel: formatRelative(s.createdAt),
      detectedItems: 0,
      estimatedCases: 0,
      status: "processing",
      imageUrl: s.imageUrl,
    }));
    setLocalSnapshots(mapped);
  }, []);

  const allSnapshots = useMemo(() => {
    return [...localSnapshots, ...initialSnapshots];
  }, [initialSnapshots, localSnapshots]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted text-sm">
        {allSnapshots.length} captures · newest first
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allSnapshots.map((snapshot) => (
          <SnapshotCard key={snapshot.id} snapshot={snapshot} />
        ))}
      </div>
    </div>
  );
}

