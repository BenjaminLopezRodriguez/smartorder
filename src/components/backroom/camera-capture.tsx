"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, MessageSquare, Repeat2, Save, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

type FacingMode = "user" | "environment";

type StoredBackroomSnapshot = {
  id: string;
  location: string;
  imageUrl: string;
  createdAt: number;
  note?: string;
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

function readStoredSnapshots(): StoredBackroomSnapshot[] {
  if (typeof window === "undefined") return [];
  return safeParseSnapshots(window.localStorage.getItem(STORAGE_KEY));
}

function writeStoredSnapshots(next: StoredBackroomSnapshot[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 50)));
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

function formatRelative(ts: number) {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins <= 0) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}

export function CameraCapture() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [location, setLocation] = useState("Backroom");
  const [note, setNote] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const canUseCamera = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  async function startCamera(mode: FacingMode) {
    if (!canUseCamera) return;
    setIsStarting(true);
    setError(null);
    setSavedAt(null);
    setCapturedDataUrl(null);

    stopStream(stream);
    setStream(null);

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });

      setStream(nextStream);
      const video = videoRef.current;
      if (video) {
        video.srcObject = nextStream;
        await video.play();
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Camera permission denied.";
      setError(message);
    } finally {
      setIsStarting(false);
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedDataUrl(dataUrl);
  }

  function retake() {
    setCapturedDataUrl(null);
    setSavedAt(null);
    setNote("");
  }

  function saveSnapshot() {
    if (!capturedDataUrl) return;

    const now = Date.now();
    const next: StoredBackroomSnapshot = {
      id: `local_${now}`,
      location: location.trim() || "Backroom",
      imageUrl: capturedDataUrl,
      createdAt: now,
      note: note.trim() || undefined,
    };

    const existing = readStoredSnapshots();
    writeStoredSnapshots([next, ...existing]);
    setSavedAt(now);
  }

  useEffect(() => {
    // Start automatically for fast capture flows.
    void startCamera(facingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => stopStream(stream);
  }, [stream]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="text-muted mb-1 block text-xs font-semibold tracking-wide uppercase">
            Location label
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Walk-in cooler · north wall"
          />
        </div>
        <div className="flex gap-2 sm:pt-6">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              const next = facingMode === "environment" ? "user" : "environment";
              setFacingMode(next);
              void startCamera(next);
            }}
            disabled={!canUseCamera || isStarting}
          >
            <Repeat2 className="h-4 w-4" />
            Flip
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => router.push("/backroom")}
          >
            <X className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {error ? (
        <div className="border-border-strong bg-surface rounded-md border p-4">
          <p className="text-foreground text-sm font-semibold">
            Camera unavailable
          </p>
          <p className="text-muted mt-1 text-sm">{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => void startCamera(facingMode)}
              disabled={!canUseCamera || isStarting}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "bg-surface-2 border-border rounded-card relative overflow-hidden border shadow-card",
          "aspect-[4/3] w-full",
        )}
      >
        {capturedDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedDataUrl}
            alt="Captured snapshot"
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {capturedDataUrl ? (
        <div>
          <label className="text-muted mb-1 block text-xs font-semibold tracking-wide uppercase">
            <MessageSquare className="mr-1 inline h-3 w-3" />
            Note (optional)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Rotation needed on bottom shelf. Dairy short on left side."
            rows={2}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!capturedDataUrl ? (
          <Button
            size="lg"
            onClick={takePhoto}
            disabled={!stream || isStarting}
          >
            <Camera className="h-4 w-4" />
            Take photo
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="lg" onClick={retake}>
              <Repeat2 className="h-4 w-4" />
              Retake
            </Button>
            <Button size="lg" onClick={saveSnapshot}>
              <Save className="h-4 w-4" />
              Save snapshot
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/backroom")}
              disabled={!savedAt}
              title={savedAt ? undefined : "Save first to return"}
            >
              Done
            </Button>
          </>
        )}
      </div>

      {savedAt ? (
        <p className="text-muted text-sm">
          Saved locally · {formatRelative(savedAt)}. You can now go back to
          BackroomVision.
        </p>
      ) : null}
    </div>
  );
}

