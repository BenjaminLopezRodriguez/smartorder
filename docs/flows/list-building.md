# SmartOrder — List Building Flow

## Purpose

Defines the flow and UX for building an order-prep list from the catalog. List building is the step between having a catalog and running a scan session. It must be fast, flexible, and support multiple input modes (search, voice, camera scan).

---

## What List Building Is

The user creates a list of catalog items they need to count during their order prep. They set target quantities (optional), then start the scan session.

Entry points:
- "New List" button on the Lists page
- Dashboard quick action

---

## Flow

```
User taps "New List"
        ↓
Name the list (required)
  └─ Default: today's date + "Order Prep" (e.g., "May 8 Order Prep")
        ↓
Add items → three modes (tabs or quick toggle):
  1. Search mode (default)
  2. Voice mode (microphone icon)
  3. Scan mode (camera icon — scan barcode to add)
        ↓
For each item added:
  - Item appears in the "In This List" section below
  - Optional: set target cases/units (can skip → defaults to 0)
        ↓
User taps "Start Scan Session"
  OR saves list as draft for later
        ↓
Scan session begins
```

---

## Add Item: Search Mode

The search experience in list building is the same search component used in the catalog browse, but with an "Add to List" action instead of a navigation action.

```
┌─────────────────────────────────────┐
│ 🔍 [Search catalog...           ]   │  ← autofocus on open
│                                     │
│ RESULTS                             │
│ ┌─────────────────────────────┐     │
│ │ Whole Milk 1 Gal  · Dean's  │ [+] │  ← 56px row, + adds to list
│ │ 2% Milk 1 Gal    · Dean's  │ [+] │
│ │ OJ 64oz          · Tropicana│ [+] │
│ └─────────────────────────────┘     │
│                                     │
│ IN THIS LIST (3)                    │
│ ┌─────────────────────────────┐     │
│ │ Whole Milk 1 Gal       🗑  │     │
│ │ OJ 64oz                🗑  │     │
│ └─────────────────────────────┘     │
│                                     │
│ [Start Scan Session →]              │  ← fixed bottom
└─────────────────────────────────────┘
```

### Add behavior

- Tapping [+] adds the item immediately (optimistic insert)
- The [+] button changes to [✓ Added] for 1.5 seconds
- Duplicate prevention: if item already in list, show [Already added]
- Items scroll into "In This List" section (smooth scroll + flash)

---

## Add Item: Voice Mode

```
┌─────────────────────────────────────┐
│ 🎤 Listening...                     │
│                                     │
│ [             ◉              ]       │  ← microphone button, 72px
│                                     │
│ "whole milk gallon"                 │  ← live transcript
│                                     │
│ MATCHED:                            │
│ ┌─────────────────────────────┐     │
│ │ Whole Milk 1 Gallon · Dean's│     │
│ │ [Add to List] [Not this one]│     │
│ └─────────────────────────────┘     │
│                                     │
│ [Stop listening]                    │
└─────────────────────────────────────┘
```

### Voice flow

1. User taps microphone → `navigator.mediaDevices.getUserMedia({ audio: true })`
2. Web Speech API (`SpeechRecognition`) transcribes in real-time
3. After pause (1.5 seconds of silence) → normalize transcript → fuzzy match
4. If match confidence ≥ 0.80 → show matched item card
5. User taps [Add to List] → adds item
6. Keeps listening (continuous mode) until user taps [Stop]

```typescript
// Voice search hook
export function useVoiceSearch(onMatch: (item: CatalogItem) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input not supported on this device");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      const text = latest[0].transcript;
      setTranscript(text);
      if (latest.isFinal) {
        handleFinalTranscript(text);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setTranscript("");
  }

  return { isListening, transcript, startListening, stopListening };
}
```

---

## Add Item: Barcode Scan Mode

```
┌─────────────────────────────────────┐
│ 📷 Point at barcode                 │
│                                     │
│ ┌─────────────────────────────┐     │
│ │                             │     │
│ │   [camera viewfinder]       │     │
│ │   ────────────────          │     │  ← scan line
│ │                             │     │
│ └─────────────────────────────┘     │
│                                     │
│ Position barcode in the box         │
│                                     │
│ [Stop scanning]                     │
└─────────────────────────────────────┘
```

Use the browser's `BarcodeDetector` API (where available) or a JS barcode library (`@zxing/browser`).

```typescript
// Barcode detection in list building
async function detectBarcode(videoElement: HTMLVideoElement): Promise<string | null> {
  if ("BarcodeDetector" in window) {
    const detector = new BarcodeDetector({ formats: ["ean_13", "upc_a", "upc_e"] });
    const codes = await detector.detect(videoElement);
    return codes[0]?.rawValue ?? null;
  }
  // Fallback: use @zxing/browser
  return null;
}
```

---

## Target Quantity Setting

Target quantities are optional. They tell the worker "you need X cases of this item."

After adding an item, a small quantity input appears in the list row:

```
┌─────────────────────────────────────┐
│ Whole Milk 1 Gal                    │
│ Target: [  6  ] cases     🗑        │  ← inline qty input
└─────────────────────────────────────┘
```

Rules:
- Defaults to 0 (unset)
- Input is numeric, opens numeric keypad
- No target = scan session still works, just counts what's found
- Targets show as reference during scan session

---

## List Reordering

Items in the list can be reordered to match the physical aisle layout:

- Long-press + drag to reorder (or "Sort" button for simpler manual reorder)
- Sort order persisted via `sortOrder` field on `listItem`
- Default sort: order items were added

---

## Draft vs. Active

| Status | Meaning | Allowed actions |
|---|---|---|
| `draft` | Being built, not started | Edit, delete, start session |
| `active` | Scan session in progress | Count only (no add/remove) |
| `complete` | Session finished | View, export (no edits) |

---

## Constraints

1. Duplicate items cannot be added to the same list
2. A list with zero items cannot start a scan session
3. Active lists cannot have items added or removed (session is in progress)
4. Voice input requires microphone permission — handle denial gracefully
5. Barcode scan requires camera permission — same handling as scan detection

---

## Anti-patterns

- Opening a full new page for list building (it should feel inline)
- Requiring all target quantities before starting (they're optional)
- Blocking item addition while a previous item is saving
- Showing a confirmation dialog for each item added (too many interruptions)

---

## Rules

1. All three input modes (search, voice, scan) must work independently
2. Voice mode falls back gracefully if SpeechRecognition is unsupported
3. Items added optimistically appear immediately — sync in background
4. "Start Scan Session" is always visible (fixed bottom button)
5. The list name defaults to the current date + "Order Prep"

---

## AI-Agent Instructions

When implementing list building:
1. The search component is the same as catalog search — do not duplicate it
2. Voice input uses Web Speech API — always check for browser support before initializing
3. Barcode detection: try `BarcodeDetector` first, fall back to `@zxing/browser`
4. Optimistic adds: add to UI first, save to server in background
5. The "Start Scan Session" button is always fixed at the bottom (not scrollable away)

---

## Production Considerations

- Web Speech API is not available in all browsers — test on Safari iOS (limited support)
- `BarcodeDetector` API is Chrome/Android only — ensure the fallback library is bundled
- Voice input in a noisy warehouse: recommend the user use a quiet spot or fall back to search
- Draft lists should autosave name changes (debounced 500ms)
