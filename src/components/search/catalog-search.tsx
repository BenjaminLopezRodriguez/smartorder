"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, Mic, MicOff, Package, Plus, Search, X } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";
import { cn } from "~/lib/utils";

type Tab = "all" | "recent" | "favorites";

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: { 0: SpeechRecognitionResultLike };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function ProductThumb({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="bg-surface-2 text-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
      {initials || <Package className="h-5 w-5" />}
    </div>
  );
}

function VoiceOverlay({
  onClose,
  onTranscript,
}: {
  onClose: () => void;
  onTranscript: (t: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const r = e.results[0];
      if (!r) return;
      setTranscript(r[0]?.transcript ?? "");
      if (r.isFinal) {
        onTranscript(r[0]?.transcript ?? "");
        setIsListening(false);
      }
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    recRef.current = rec;
    setIsListening(true);
  }, [onTranscript]);

  useEffect(() => {
    startListening();
    return () => recRef.current?.abort();
  }, [startListening]);

  const suggestions = [
    '"Add 2 boxes of paper towels"',
    '"I need Lysol wipes"',
    '"Add coffee mate creamer"',
    '"Add 3 boxes of trash bags"',
  ];

  return (
    <div className="flex flex-1 flex-col items-center px-4 pt-10">
      <button
        aria-label={isListening ? "Stop" : "Listen"}
        onClick={() => {
          if (isListening) {
            recRef.current?.stop();
            setIsListening(false);
          } else {
            startListening();
          }
        }}
        className={cn(
          "flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition-all",
          isListening ? "bg-brand text-white" : "bg-surface-2 text-muted",
        )}
      >
        {isListening ? <Mic className="h-10 w-10" /> : <MicOff className="h-10 w-10" />}
      </button>

      <p className="text-foreground mt-4 text-lg font-semibold">
        {isListening ? "Listening..." : "Tap to listen"}
      </p>
      {transcript && (
        <p className="text-muted mt-2 text-center text-sm italic">&ldquo;{transcript}&rdquo;</p>
      )}

      {!transcript && (
        <div className="mt-8 w-full space-y-2.5">
          <p className="text-muted text-center text-xs">Try saying something like:</p>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onTranscript(s.replace(/^"|"$/g, ""))}
              className="text-brand block w-full text-center text-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="border-danger text-danger mt-10"
        onClick={onClose}
      >
        Stop Listening
      </Button>
    </div>
  );
}

export function CatalogSearch({ listId }: { listId?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [voiceMode, setVoiceMode] = useState(false);
  const utils = api.useUtils();

  const results = api.catalog.search.useQuery({ query, limit: 50 });
  const addMutation = api.lists.addItem.useMutation({
    onSuccess: async () => {
      if (listId) await utils.lists.byId.invalidate({ id: listId });
    },
  });
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  function handleAdd(catalogItemId: string) {
    if (!listId) {
      router.push(`/lists/new`);
      return;
    }
    addMutation.mutate({ listId, catalogItemId, targetCases: 0, targetUnits: 0 });
    setAddedIds((prev) => new Set(prev).add(catalogItemId));
  }

  function handleVoiceTranscript(text: string) {
    setQuery(text);
    setVoiceMode(false);
  }

  const displayItems = results.data ?? [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "recent", label: "Recent" },
    { id: "favorites", label: "Favorites" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {listId && (
        <div className="bg-brand-soft text-brand-soft-foreground mb-3 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5">
          <p className="text-sm font-medium">Adding items to list</p>
          <Link href={`/lists/${listId}`} className="text-sm font-semibold underline">
            Done
          </Link>
        </div>
      )}

      {/* Search bar */}
      <div className="bg-surface border-border flex items-center gap-2 rounded-xl border px-3 shadow-card">
        <Search className="text-muted h-5 w-5 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items, codes, brands…"
          className="text-foreground placeholder:text-muted h-12 flex-1 bg-transparent text-sm outline-none"
          inputMode="search"
          autoFocus={false}
        />
        {query ? (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X className="text-muted h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setVoiceMode(true)}
            aria-label="Voice search"
            className={cn(voiceMode ? "text-brand" : "text-muted")}
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
        <span className="bg-border mx-1 h-5 w-px" />
        <button aria-label="Filter" className="text-muted">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {voiceMode ? (
        <VoiceOverlay
          onClose={() => setVoiceMode(false)}
          onTranscript={handleVoiceTranscript}
        />
      ) : (
        <>
          {/* Tabs */}
          <div className="mt-3 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Count */}
          {!results.isLoading && (
            <p className="text-muted mt-3 text-xs font-medium">
              Results ({displayItems.length})
            </p>
          )}

          {displayItems.length === 0 && !results.isLoading ? (
            <div className="mt-6">
              <EmptyState
                title="No results"
                description="Try a different search or add a new catalog item."
                action={
                  <Button asChild>
                    <Link href="/catalog/new">Add item</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="bg-surface border-border mt-2 overflow-hidden rounded-xl border shadow-card">
              {displayItems.map((item, i) => {
                const added = addedIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i < displayItems.length - 1 && "border-border border-b",
                    )}
                  >
                    <ProductThumb name={item.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {item.name}
                      </p>
                      <p className="text-muted text-xs">
                        {item.packSize ?? item.unitType}
                      </p>
                      {item.barcode && (
                        <p className="text-muted font-mono text-[11px]">
                          {item.barcode}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAdd(item.id)}
                      disabled={addMutation.isPending}
                      aria-label={`Add ${item.name}`}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                        added
                          ? "bg-success-soft text-success-foreground"
                          : "bg-brand text-white",
                      )}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
