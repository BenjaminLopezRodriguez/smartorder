# SmartOrder — Scan Detection Philosophy & Architecture

## Purpose

Defines the philosophy and implementation architecture for scan detection in SmartOrder. The app detects Zebra scanner activity through indirect signals (front camera, light changes, laser detection, proximity inference) because direct Zebra integration via BLE or SDK is not available in a web browser context.

---

## Responsibilities

- Define the signals used to detect scan events
- Specify the detection pipeline and signal fusion approach
- Establish the fallback behavior when detection is unavailable
- Define the UX for scan confirmation and error states

---

## Core Philosophy

> **The Zebra scanner is the source of truth. SmartOrder detects what the scanner did — it never replaces the scanner.**

SmartOrder does not attempt to scan barcodes itself. It detects when the Zebra scanner has fired (via camera-observable signals) and maps that event to a catalog item count increment.

The user still points the Zebra at each item. SmartOrder's job is to:
1. Know what item is "current" in the guided session
2. Detect that a scan has occurred
3. Increment the count
4. Advance to the next item (or prompt for quantity confirmation)

---

## Scan Detection Signals

SmartOrder uses a **multi-signal fusion** approach. Multiple signals vote on whether a scan has occurred. A detection fires when the composite confidence exceeds threshold.

### Signal 1: Front Camera — Laser Detection

Zebra scanners emit a red laser line when scanning. The front-facing camera on an iPhone, pointed at the user's hand/scanner area during a scan session, can detect the laser flash.

**Detection method:**
- Sample camera frames at ~15fps during active session (lower fps to preserve battery)
- Convert each frame to grayscale
- Detect sudden increase in high-luminance pixels in the red channel
- A "laser flash" signature: brief (< 200ms), point-source, high-saturation red

```typescript
type LaserFlashSignal = {
  type: "laser_flash";
  confidence: number; // 0-1
  durationMs: number;
  luminanceDelta: number;
};
```

### Signal 2: Ambient Light Sensor

When a Zebra laser fires in a dim warehouse, there's a measurable ambient light change.

**Detection method:**
- Use `DeviceLightEvent` (limited browser support) or CSS `@media (prefers-color-scheme)` transitions
- More reliably: sample video frame luminance as a proxy for ambient light

**Browser support note**: `DeviceLightEvent` is only available in Firefox. Rely on camera-based luminance instead.

### Signal 3: Proximity / Motion Inference

The scan gesture has a characteristic motion profile: extend arm toward shelf, hold steady, retract.

**Detection method:**
- Use `DeviceMotionEvent` (iOS requires permission) to detect the hold-steady signature
- Motion pattern: movement → stillness → movement (extend, hold, retract)
- Window: 1–3 seconds per scan cycle

```typescript
type MotionPattern = {
  type: "motion_scan_gesture";
  confidence: number;
  gestureMs: number;
};
```

### Signal 4: Sound Detection (optional)

Zebra scanners emit a beep on successful scan.

**Detection method:**
- Use `AudioContext` + `AnalyserNode` to detect a brief, consistent-frequency tone
- Zebra beep frequency range: 1000–4000 Hz, duration 50–300ms

**Status**: Optional enhancement; not a primary signal due to warehouse noise.

---

## Signal Fusion Logic

```typescript
type ScanSignalEvent = {
  laserFlash: number;      // 0–1
  motionGesture: number;   // 0–1
  audioCue: number;        // 0–1 (optional)
  timestamp: Date;
};

function computeScanConfidence(signals: ScanSignalEvent): number {
  const weights = {
    laserFlash: 0.60,
    motionGesture: 0.30,
    audioCue: 0.10,
  };

  return (
    signals.laserFlash * weights.laserFlash +
    signals.motionGesture * weights.motionGesture +
    signals.audioCue * weights.audioCue
  );
}

const SCAN_CONFIDENCE_THRESHOLD = 0.55;

function isScanDetected(signals: ScanSignalEvent): boolean {
  return computeScanConfidence(signals) >= SCAN_CONFIDENCE_THRESHOLD;
}
```

---

## Fallback: Manual Count Entry

Scan detection is an accelerator, not a requirement. The app must always work without it.

**When scan detection is disabled or unavailable:**
- Show the quantity stepper prominently
- User manually increments count
- UX is identical — only the auto-increment is missing

**Graceful degradation order:**
1. Full detection (laser + motion + audio)
2. Motion only
3. Manual only

---

## Scan Session State Machine

```
IDLE
  └─ user starts session → ITEM_READY

ITEM_READY
  └─ scan detected → COUNT_INCREMENT
  └─ user taps +/− → COUNT_INCREMENT
  └─ user taps skip → ITEM_READY (next item)
  └─ session complete → REVIEW

COUNT_INCREMENT
  └─ count updated in Zustand
  └─ haptic feedback + visual flash
  └─ after 300ms → back to ITEM_READY (ready for next scan of same item)
  └─ user taps "Mark Scanned" → ITEM_READY (next item)

REVIEW
  └─ user reviews all counts
  └─ user confirms → COMPLETE

COMPLETE
  └─ list status → "complete"
  └─ export options shown
```

---

## Camera Permissions and Privacy

Camera use for scan detection must be handled carefully:

1. **Request permission explicitly**: explain WHY the camera is used ("to detect Zebra scanner laser")
2. **Never upload camera frames**: all processing is on-device, no frames leave the browser
3. **Stop camera when session ends**: call `stream.getTracks().forEach(t => t.stop())`
4. **Handle permission denial gracefully**: fall back to manual mode, no error state

```tsx
// Permission request with explanation
async function requestCameraForScanDetection(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user", // front camera
        width: { ideal: 320 }, // small res for performance
        height: { ideal: 240 },
        frameRate: { ideal: 15, max: 30 },
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      // User denied — switch to manual mode
      return null;
    }
    throw err;
  }
}
```

---

## Battery and Performance

Camera sampling during a scan session is battery-intensive. Mitigations:

- Sample at 15fps maximum (not 60fps)
- Use `requestVideoFrameCallback` for efficient frame sampling
- Stop camera automatically after 10 minutes of inactivity
- Allow user to disable camera detection from session settings
- Show battery warning if iOS battery level < 20% (via `Battery Status API` where available)

---

## Constraints

1. Scan detection never makes autonomous decisions — it only provides a confidence signal
2. Manual entry is always available and always works
3. Camera frames are never stored or transmitted
4. The app never claims to have definitively detected a scan — it increments count with visual feedback that can be undone
5. A single session can have at most ~500 scan events (hardware/UX ceiling)

---

## Anti-patterns

- Auto-advancing to the next item on scan detection without user control option
- Treating a scan detection as certain (it's always probabilistic)
- Requesting camera permission without explaining why
- Keeping the camera active after the session ends
- Blocking the scan session UI while waiting for camera permission

---

## Rules

1. Scan detection is opt-in — the app explains it before requesting camera permission
2. Manual count entry always works, regardless of detection state
3. All detection processing is on-device — no frames are sent to the server
4. Count increments can always be undone (−1 button always available)
5. The scan session state machine must match `docs/flows/scan-session.md`

---

## Implementation Guidance

File structure for scan detection:
```
src/
  lib/
    scan/
      laser-detector.ts      # Camera-based laser flash detection
      motion-detector.ts     # DeviceMotionEvent gesture detection
      audio-detector.ts      # Web Audio scan beep detection
      signal-fusion.ts       # Combine signals into confidence score
  hooks/
    use-scan-detection.ts    # React hook that wires up all detectors
  stores/
    scan-store.ts            # Zustand session state
```

---

## AI-Agent Instructions

When implementing scan detection:
1. The camera is for detection only — never send frames to any server
2. All detection runs in a `useEffect` with a cleanup function that stops the camera track
3. Signal fusion threshold (0.55) is configurable — do not hard-code it in multiple places
4. Manual entry mode must be fully functional before camera detection is added
5. The state machine in this document is canonical — do not add states without updating both this document and the flow doc

---

## Production Considerations

- iOS Safari: `getUserMedia` requires HTTPS in production (automatic on Vercel)
- Android Chrome: `getUserMedia` works well, but frame rate limits vary by device
- Older iPhones (iPhone X era): front camera quality may be insufficient for laser detection
- `DeviceMotionEvent` requires `requestPermission()` on iOS 13+ — handle this in the permission flow
- Test scan detection in actual warehouse lighting conditions before shipping
