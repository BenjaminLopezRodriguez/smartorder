# SmartOrder — Logging Strategy

## Purpose

Defines the logging approach for SmartOrder. Good logs make debugging production issues tractable. Bad logs are either invisible noise or missing at critical moments. This document defines what to log, how, and where.

---

## Responsibilities

- Define log levels and when to use each
- Establish structured logging format
- Specify which events must always be logged
- Define what must never be logged (sensitive data)

---

## Log Levels

| Level | When to use |
|---|---|
| `error` | Something failed that shouldn't have — requires investigation |
| `warn` | Unexpected but recoverable condition — worth monitoring |
| `info` | Important lifecycle events — job started, session completed |
| `debug` | Detailed diagnostic info — only in development |

Production log level: `info` and above (no `debug` in production).

---

## Logger Utility

```typescript
// src/lib/logger.ts
type LogLevel = "error" | "warn" | "info" | "debug";

type LogContext = Record<string, string | number | boolean | null | undefined>;

function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "smartorder",
    ...context,
  };

  if (process.env.NODE_ENV === "production") {
    // Structured JSON for log aggregation (Vercel, Datadog, etc.)
    console[level](JSON.stringify(entry));
  } else {
    // Readable format for development
    const prefix = `[${level.toUpperCase()}] ${message}`;
    if (context) {
      console[level](prefix, context);
    } else {
      console[level](prefix);
    }
  }
}

export const logger = {
  error: (msg: string, ctx?: LogContext) => log("error", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
};
```

---

## What to Log (Required)

### AI/OCR calls (always)

```typescript
// Before call
logger.info("ocr.textract.start", {
  jobId,
  sourceFileName,
  fileSizeBytes: file.size,
  pageCount: estimatedPages,
});

// After success
logger.info("ocr.textract.complete", {
  jobId,
  textractJobId,
  durationMs: Date.now() - startTime,
  lineCount: rawLines.length,
});

// AI parse call
logger.info("ai.parse.start", {
  jobId,
  model: "gpt-4o-2024-08-06",
  promptTokens: estimatedPromptTokens,
});

logger.info("ai.parse.complete", {
  jobId,
  model: "gpt-4o-2024-08-06",
  promptTokens: usage.promptTokens,
  completionTokens: usage.completionTokens,
  itemsFound: result.items.length,
  parseQuality: result.parseQuality,
  durationMs: Date.now() - startTime,
});

logger.error("ai.parse.failed", {
  jobId,
  error: err instanceof Error ? err.message : String(err),
  errorType: classifyAIError(err),
});
```

### Scan session events (info)

```typescript
logger.info("scan.session.start", {
  listId,
  totalItems: list.items.length,
  sessionStartedAt: new Date().toISOString(),
});

logger.info("scan.session.complete", {
  listId,
  totalItems,
  scannedItems,
  durationMs: Date.now() - startTime,
});
```

### File uploads (info)

```typescript
logger.info("upload.start", { fileSizeBytes: file.size, fileType: file.type });
logger.info("upload.complete", { blobUrl, durationMs });
logger.error("upload.failed", { error: err.message, fileSizeBytes: file.size });
```

### tRPC errors (error)

```typescript
// In tRPC error handler middleware
logger.error("trpc.procedure.error", {
  path: opts.path,
  code: error.code,
  message: error.message,
  userId: ctx.session?.user?.id,
});
```

---

## What Must NEVER Be Logged

| Data type | Why |
|---|---|
| Passwords or tokens | Obvious |
| `OPENAI_API_KEY` or `AWS_SECRET_ACCESS_KEY` | Credential exposure |
| Full OCR text (> 500 chars) | Storage bloat + possible PII |
| Full AI response JSON | Storage bloat |
| User's personal info | Privacy |
| Database connection strings | Credential exposure |

```typescript
// ❌ Never log full content
logger.info("ai.parse.complete", { rawOCRText: fullOCRText }); // NO

// ✅ Log a summary
logger.info("ai.parse.complete", {
  rawLineCount: lines.length,
  firstLinePreview: lines[0]?.substring(0, 50), // truncated
});
```

---

## Structured Log Fields

All logs include these fields:

| Field | Type | Description |
|---|---|---|
| `level` | string | "error" \| "warn" \| "info" \| "debug" |
| `message` | string | Human-readable event name (dot-separated) |
| `timestamp` | ISO string | When the event occurred |
| `service` | string | Always "smartorder" |

Domain-specific fields (add as needed):

| Field | When to include |
|---|---|
| `userId` | Any user-triggered action |
| `listId` | Any list or scan operation |
| `jobId` | Any OCR/AI job |
| `durationMs` | Any timed operation |
| `error` | Any error log |
| `errorType` | Categorized error ("rate_limit", "timeout", etc.) |

---

## Log Event Naming Convention

Use dot-notation, `domain.action.result`:

```
ai.parse.start
ai.parse.complete
ai.parse.failed
ocr.textract.start
ocr.textract.complete
ocr.textract.failed
scan.session.start
scan.session.complete
upload.start
upload.complete
upload.failed
catalog.import.start
catalog.import.complete
catalog.item.created
```

---

## Anti-patterns

- `console.log(data)` — use the structured logger
- Logging full objects with sensitive fields
- Error logs without the error message or type
- Logging at `error` level for expected/handled conditions (use `warn`)
- No logs for AI calls (most expensive and fragile operations)

---

## Production Log Aggregation

On Vercel, logs are available in the Vercel dashboard. For production observability:
- Connect to a log aggregation service (Axiom, Datadog, or Logtail — all available on Vercel Marketplace)
- Set up alerts on `level: error` events
- Create dashboards for AI cost monitoring (token count logs)
- Retention: 7 days for debug, 30 days for info, 90 days for error

---

## AI-Agent Instructions

When implementing any AI, OCR, or file upload feature:
1. Log start, completion, and failure for every operation
2. Include `durationMs` for all timed operations
3. Log token counts for every AI call
4. Never log raw API responses or full OCR text
5. Use the structured `logger` utility — never `console.log` directly

---

## Production Considerations

- Vercel Functions stream logs to the Vercel dashboard in real-time
- Structured JSON logs (`console.log(JSON.stringify(entry))`) integrate with Datadog / Axiom automatically
- Set log retention in the aggregation service: error logs kept 90 days minimum
- Alert on: error log rate > 10/min, AI call duration > 30s, upload failure rate > 5%
