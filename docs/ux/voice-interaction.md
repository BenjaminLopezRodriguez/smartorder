# SmartOrder — Voice Interaction Philosophy

## Purpose

Defines the design philosophy, implementation patterns, and UX rules for voice input in SmartOrder. Voice is an accelerator for workers who have one hand occupied. It is never a primary interaction mode — it is always paired with a visual/touch fallback.

---

## Philosophy

Voice in SmartOrder is a **hands-free shortcut**, not a conversational AI interface.

The worker says a product name. The app finds it and adds it to the list (with confirmation). That's the entire voice scope.

Voice is NOT:
- A conversational assistant ("Hey SmartOrder, how many cases of milk do I have?")
- A replacement for search
- The only way to add items
- A way to control the scan session

---

## When Voice Is Available

| Context | Voice available? | Why |
|---|---|---|
| List building | Yes (search mode → voice mode) | Hands may be occupied |
| Scan session (adding items) | No (session is fixed) | Session items are pre-defined |
| Catalog browse | Optional (future) | Not high priority |
| BackroomVision notes | Future enhancement | — |

---

## Browser Support

| Browser | SpeechRecognition | Notes |
|---|---|---|
| Chrome (Desktop + Android) | ✅ `webkitSpeechRecognition` | Works well |
| Safari (iOS 14.5+) | ✅ `SpeechRecognition` | Available but limited continuous mode |
| Firefox | ❌ | Not supported — fall back to search |
| Samsung Internet | ✅ | Works (Chromium-based) |

Always check for support before using:
```typescript
const hasSpeechRecognition =
  "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
```

---

## Implementation Pattern

```typescript
// src/hooks/use-voice-search.ts
"use client";
import { useState, useRef, useCallback, useEffect } from "react";

type VoiceSearchState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "processing"
  | "error";

type UseVoiceSearchOptions = {
  onTranscript: (text: string) => void;
  onError: (reason: "not_supported" | "permission_denied" | "network_error") => void;
  language?: string;
};

export function useVoiceSearch({
  onTranscript,
  onError,
  language = "en-US",
}: UseVoiceSearchOptions) {
  const [state, setState] = useState<VoiceSearchState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      onError("not_supported");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    const recognition: SpeechRecognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;       // single-phrase mode (more reliable)
    recognition.interimResults = true;    // show words as spoken
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setState("listening");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      if (!result) return;

      if (result.isFinal) {
        const finalText = result[0]!.transcript.trim();
        setState("processing");
        setInterimTranscript("");
        onTranscript(finalText);
      } else {
        setInterimTranscript(result[0]!.transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setState("error");
      if (event.error === "not-allowed") onError("permission_denied");
      else onError("network_error");
    };

    recognition.onend = () => {
      setState("idle");
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    setState("requesting_permission");
    recognition.start();
  }, [isSupported, language, onTranscript, onError]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
    setInterimTranscript("");
  }, []);

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  return {
    state,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    isListening: state === "listening",
  };
}
```

---

## UX States

```
IDLE
  └─ microphone button (ghost variant)

REQUESTING_PERMISSION
  └─ pulsing animation on mic button
  └─ "Waiting for permission..."

LISTENING
  └─ mic button active (filled/colored)
  └─ pulsing ring animation
  └─ live interim transcript shown below
  └─ "Listening..." label

PROCESSING
  └─ spinner on mic button
  └─ show full transcript
  └─ "Finding match..."

MATCHED
  └─ show matched item card
  └─ [Add to List] / [Not this one] buttons

ERROR: not_supported
  └─ mic button hidden
  └─ no error shown (just no mic button)

ERROR: permission_denied
  └─ "Microphone permission needed"
  └─ [Open Settings] link (if navigable)

ERROR: no_match
  └─ "No match for '[transcript]'"
  └─ [Search for it] → opens search with transcript pre-filled
```

---

## Transcript → Match Flow

```typescript
async function handleTranscript(rawTranscript: string) {
  // Step 1: Normalize
  const normalized = normalizeQuery(rawTranscript);

  // Step 2: Fuzzy match against catalog
  const matches = fuseSearch(normalized, catalog);

  if (matches.length > 0 && matches[0].confidence >= 0.75) {
    setMatchResult(matches[0].item);
  } else if (matches.length === 0 || matches[0].confidence < 0.50) {
    // No match — pre-fill search with transcript
    setSearchQuery(normalized);
    setInputMode("search");
  } else {
    // Low confidence match — show alternatives
    setMatchAlternatives(matches.slice(0, 3));
  }
}
```

---

## Warehouse-Specific Considerations

### Noise mitigation

- Set `continuous: false` — single-phrase mode performs better in noisy environments
- Minimum 1.5 seconds of silence before processing (natural sentence boundary)
- If transcript is < 2 words, prompt user to try again: "Say the product name again"

### Accents and product names

- Warehouse workers may have varied accents and use product shorthand
- The normalization layer handles common abbreviations
- AI semantic matching as fallback for vocabulary mismatches
- "Never heard of it" state: fall back to typed search immediately

### One-handed use

- The microphone button is in thumb-reach zone (bottom of screen)
- Tap to start, tap to stop (toggle, not hold)
- Never require holding the button to speak

---

## Permissions

```tsx
// Show WHY we need the microphone before asking
function VoicePermissionExplainer({ onAllow, onSkip }: Props) {
  return (
    <div className="p-4 border rounded-md space-y-3">
      <p className="text-sm font-medium">Enable voice search?</p>
      <p className="text-sm text-muted-foreground">
        Say a product name and SmartOrder will find it in your catalog.
        Your voice is not recorded or stored.
      </p>
      <div className="flex gap-3">
        <Button onClick={onAllow}>Allow microphone</Button>
        <Button variant="outline" onClick={onSkip}>Use search instead</Button>
      </div>
    </div>
  );
}
```

---

## Anti-patterns

- Making voice the only way to add items (always have a search fallback)
- Continuous listening mode in list building (battery drain + accidental triggers)
- Auto-adding items without confirmation (wrong match + accidental add)
- Showing a "not supported" error as an error state (just hide the mic button)
- Voice-controlled scan session navigation (too risky for operational data)

---

## Rules

1. Voice is always opt-in — the default input mode is search
2. Permission is requested with an explanation, not just a browser prompt
3. Voice never auto-adds items — always require one tap to confirm
4. Unsupported browser: hide the mic button silently, do not show an error
5. Permission denied: show a brief explanation, fall back to search immediately

---

## AI-Agent Instructions

When implementing voice input:
1. Use the `useVoiceSearch` hook — do not create a second SpeechRecognition instance
2. The mic button is only rendered if `isSupported` is true
3. Voice match confidence < 0.75: show alternatives or pre-fill search (never auto-add)
4. Always stop recognition in the cleanup function of `useEffect`
5. Test on iOS Safari specifically — it has the most restrictions

---

## Production Considerations

- iOS Safari requires HTTPS for SpeechRecognition (automatic on Vercel)
- Test in noisy environments — low-budget device microphones pick up more background noise
- Monitor voice feature adoption rate; if < 5% usage, deprioritize further investment
- Chrome's `webkitSpeechRecognition` sends audio to Google's servers — document this in privacy policy
