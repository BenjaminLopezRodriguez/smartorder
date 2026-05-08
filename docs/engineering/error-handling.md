# SmartOrder — Error Handling Standards

## Purpose

Defines how errors are categorized, surfaced, and recovered from in SmartOrder. Consistent error handling prevents user confusion, makes debugging tractable, and ensures that operational workers always have a path forward when something fails.

---

## Responsibilities

- Define the error taxonomy for SmartOrder
- Establish error handling patterns for tRPC, AI calls, and file operations
- Specify how errors are presented in the UI
- Define recovery paths for every error category

---

## Error Taxonomy

| Category | Examples | Handling |
|---|---|---|
| Validation error | Invalid input, missing required field | Show inline field error |
| Not found | List deleted, item removed | Show empty state with next action |
| Auth error | Session expired | Redirect to login |
| Business rule violation | Modifying a completed list | Inline error message, do not redirect |
| AI/OCR failure | Textract timeout, OpenAI rate limit | Retry button + fallback to manual |
| Network error | Connectivity lost | Offline indicator + queue for retry |
| Server error | Unexpected 500 | Generic error message + error ID |
| File error | Upload too large, wrong type | Inline file error, re-upload prompt |

---

## tRPC Error Handling (Client Side)

### Query errors

```typescript
const { data, error, isError } = api.lists.getById.useQuery({ id: listId });

if (isError) {
  // error.data?.code is the TRPCError code
  if (error.data?.code === "NOT_FOUND") {
    return <EmptyState title="List not found" action={<Button href="/lists">Back to Lists</Button>} />;
  }
  return <ErrorBanner message={error.message} onRetry={() => refetch()} />;
}
```

### Mutation errors

```typescript
const mutation = api.lists.create.useMutation({
  onError: (error) => {
    // Show toast or inline error based on error type
    if (error.data?.code === "BAD_REQUEST") {
      setFieldError("name", error.message);
    } else {
      toast.error("Failed to create list — please try again");
    }
  },
  onSuccess: (newList) => {
    router.push(`/lists/${newList.id}`);
  },
});
```

---

## UI Error Patterns

### Inline field errors (validation)
```tsx
<div className="space-y-1">
  <Input
    value={name}
    onChange={e => setName(e.target.value)}
    className={fieldError ? "border-destructive" : ""}
  />
  {fieldError && (
    <p className="text-xs text-destructive">{fieldError}</p>
  )}
</div>
```

### Banner errors (recoverable)
```tsx
// For non-blocking errors where the user can retry
function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-3">
      <AlertTriangleIcon className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-destructive">{message}</p>
        {onRetry && (
          <button className="text-xs underline text-destructive mt-1" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
```

### Empty states (not found / no data)
```tsx
// Not a "real" error — use EmptyState component, not error styling
<EmptyState
  title="List not found"
  description="This list may have been deleted."
  action={<Button href="/lists">View all lists</Button>}
/>
```

---

## React Error Boundaries

Add error boundaries to isolate failures in feature sections:

```tsx
// src/components/ui/error-boundary.tsx
"use client";
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Log to monitoring service
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <ErrorBanner
          message="Something went wrong in this section"
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}
```

Wrap feature sections (not entire pages) in `ErrorBoundary`:
```tsx
<ErrorBoundary>
  <ScanSession listId={listId} />
</ErrorBoundary>
```

---

## AI/OCR Error Handling

### Return type pattern (never throw to UI)

```typescript
type AIResult<T> =
  | { success: true; data: T }
  | { success: false; error: "rate_limit" | "timeout" | "parse_error" | "no_items"; message: string; partial?: Partial<T> };

// In the tRPC procedure
try {
  const result = await parseWithStructuredOutput(...);
  return { success: true, data: result };
} catch (err) {
  if (isRateLimitError(err)) {
    return { success: false, error: "rate_limit", message: "Too many requests — try again in a moment" };
  }
  if (isTimeoutError(err)) {
    return { success: false, error: "timeout", message: "Analysis took too long — try a smaller file" };
  }
  return { success: false, error: "parse_error", message: "Could not parse this document — try manual entry" };
}
```

### OCR pipeline failure states

Every OCR job status must be handled in the UI:
```typescript
switch (job.status) {
  case "queued":
  case "textract_processing":
  case "parsing":
    return <OCRJobProgress job={job} />;
  case "review_pending":
    return <OCRReviewFlow job={job} />;
  case "complete":
    return <OCRJobComplete job={job} />;
  case "failed":
    return (
      <ErrorBanner
        message={job.errorMessage ?? "Processing failed"}
        onRetry={() => retryJob(job.id)}
      />
    );
}
```

---

## Network / Offline Errors

```typescript
// Global offline detector hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

Offline behavior:
- Scan session: continue normally (state in Zustand), sync on reconnect
- Other mutations: show "Offline — changes will sync when reconnected" banner
- Reads: show cached React Query data with "Last updated X minutes ago" indicator

---

## Error Logging

All errors must be logged server-side with context. See `docs/engineering/logging.md` for the logger utility.

```typescript
// In tRPC procedures
try {
  // ...
} catch (err) {
  logger.error("catalog.create failed", {
    error: err instanceof Error ? err.message : String(err),
    input: JSON.stringify(input),
    userId: ctx.session?.user?.id,
  });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create item", cause: err });
}
```

---

## Constraints

1. No error should leave the user with no next action
2. Destructive errors (data loss) must be communicated immediately and clearly
3. AI failures must always provide the raw input as a fallback path
4. The scan session must not crash on a network error — it must queue and retry
5. Never show raw error stack traces in production UI

---

## Anti-patterns

- Catching errors and returning empty arrays (silently swallows failures)
- Full-page error states for partial failures (use section-level error boundaries)
- Toast notifications in scan session (they cover the scan interface)
- Generic "Something went wrong" with no recovery path
- Throwing untyped errors from tRPC procedures (`throw new Error(...)` instead of `TRPCError`)

---

## Rules

1. Every `catch` block must either: (a) handle the error specifically, or (b) re-throw as `TRPCError`
2. Every error displayed to the user includes a recovery action
3. Scan session errors are queued for retry — never lost
4. AI errors return partial data when available, not nothing
5. Error messages are written for the user, not the developer ("File too large" not "PAYLOAD_TOO_LARGE")

---

## AI-Agent Instructions

When generating error handling code:
1. Use `TRPCError` for all server-side expected errors (never `throw new Error`)
2. AI call error handling must use the `AIResult<T>` pattern (never throw to UI)
3. Every mutation `onError` must show a user-visible message
4. Every error UI must include a recovery path (retry, go back, manual entry)
5. Never show stack traces, raw DB errors, or internal error details in the UI

---

## Production Considerations

- Integrate with a monitoring service (Sentry or similar) for unhandled errors
- Alert on error rates > 1% for scan session mutations
- Log error IDs that can be shared with support ("Error ID: abc-123")
- Test offline behavior in browser DevTools Network tab before shipping scan session
