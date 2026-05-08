# SmartOrder — AI Engineering Patterns

## Purpose

Defines the patterns, architecture, and conventions for integrating AI into SmartOrder. AI is a tool that accelerates specific workflows — it is not the product. Every AI integration must be robust, transparent to the user, and safely degradable.

---

## Responsibilities

- Define where AI fits in the SmartOrder architecture
- Establish patterns for calling AI services
- Define observability requirements for AI features
- Specify how AI features degrade gracefully

---

## AI Features in SmartOrder

| Feature | AI component | Model | Status |
|---|---|---|---|
| Order guide parsing | OpenAI structured output | gpt-4o-2024-08-06 | Planned |
| Inventory matching (semantic) | OpenAI chat completion | gpt-4o-mini-2024-07-18 | Planned |
| Voice transcript parsing | OpenAI structured output | gpt-4o-mini-2024-07-18 | Planned |
| BackroomVision analysis | OpenAI vision | gpt-4o-2024-08-06 | Planned |
| OCR text extraction | AWS Textract | N/A | Planned |
| Visual segmentation | Segment Anything Model | SAM2 | Future |

---

## AI Call Architecture

All AI calls are:
1. **Server-side only** — never expose API keys to the client
2. **Async** — never block the UI while waiting for AI
3. **Typed** — always use structured outputs with Zod validation
4. **Logged** — always record model, token usage, latency
5. **Retried** — always retry transient errors (429, 503)

```
Client (React)
    ↓ tRPC mutation
tRPC Procedure (server)
    ↓ lib/ai/*
AI Provider (OpenAI / Textract)
    ↓ typed response
Zod validation
    ↓
DB write (if confirmed by user)
    ↓ return to client
Client (React)
```

---

## AI Module Structure

```
src/
  lib/
    ai/
      openai-client.ts       # OpenAI client singleton + retry wrapper
      parse-order-guide.ts   # Order guide OCR parsing
      match-inventory.ts     # Semantic inventory matching
      parse-voice-query.ts   # Voice transcript → structured search
      analyze-snapshot.ts    # BackroomVision image analysis
      confidence.ts          # Confidence threshold helpers + UI badges
  server/
    ai/
      textract-client.ts     # AWS Textract client
      textract-jobs.ts       # Job management (start, poll, fetch)
```

---

## OpenAI Client Pattern

```typescript
// src/lib/ai/openai-client.ts
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,          // built-in retry for transient errors
  timeout: 30_000,        // 30-second timeout per call
});

export async function structuredCompletion<T>(opts: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  schemaName: string;
  temperature?: number;
}): Promise<{ data: T; usage: TokenUsage; durationMs: number }> {
  const startTime = Date.now();

  const response = await openai.beta.chat.completions.parse({
    model: opts.model,
    temperature: opts.temperature ?? 0,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userPrompt },
    ],
    response_format: zodResponseFormat(opts.schema, opts.schemaName),
  });

  const parsed = response.choices[0]?.message.parsed;
  if (!parsed) throw new Error("OpenAI returned null parsed response");

  return {
    data: parsed,
    usage: {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    },
    durationMs: Date.now() - startTime,
  };
}

type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};
```

---

## Observability Pattern

Every AI call logs:

```typescript
// After every AI call
logger.info("ai.call.complete", {
  feature: "order_guide_parse",   // which feature triggered this call
  model: opts.model,
  promptTokens: result.usage.promptTokens,
  completionTokens: result.usage.completionTokens,
  durationMs: result.durationMs,
  itemsFound: result.data.items?.length,
  parseQuality: result.data.parseQuality,
});
```

---

## Graceful Degradation

Every AI feature has a fallback mode that works without AI:

| AI feature | Degraded behavior |
|---|---|
| Order guide parsing | Show raw OCR text + manual entry form |
| Inventory matching | Show fuzzy search results only |
| Voice search | Show typed search fallback |
| BackroomVision analysis | Show photo without item count estimates |

Degradation triggers:
- AI provider unreachable (network error)
- Rate limit hit (429)
- Response validation failure (schema mismatch)
- Confidence below minimum threshold (returns no result)

The app must never show a broken state because AI failed. Always fall back gracefully.

---

## Cost Controls

```typescript
// Rate limiting: per user, per feature
const RATE_LIMITS = {
  orderGuideParse: {
    maxPerDay: 20,          // 20 imports per day per user
    estimatedCostPerCall: 0.08, // dollars, for alerting
  },
  inventoryMatch: {
    maxPerMinute: 60,       // 60 semantic matches per minute
    estimatedCostPerCall: 0.0001,
  },
  visionAnalysis: {
    maxPerDay: 50,          // 50 snapshot analyses per day
    estimatedCostPerCall: 0.01,
  },
};
```

---

## AI Feature Flags

AI features should be behind feature flags for staged rollout:

```typescript
// Feature flags (simple env-var implementation for now)
export const AI_FEATURES = {
  orderGuideParsing: process.env.FEATURE_OCR_PARSING === "true",
  semanticMatching: process.env.FEATURE_SEMANTIC_MATCHING === "true",
  visionAnalysis: process.env.FEATURE_VISION_ANALYSIS === "true",
};

// Usage
if (AI_FEATURES.orderGuideParsing) {
  return await parseWithAI(ocrText);
} else {
  return { success: false, error: "feature_disabled", rawText: ocrText };
}
```

---

## Anti-patterns

- Calling OpenAI directly from a tRPC procedure without the `structuredCompletion` wrapper
- Not logging token usage (makes cost monitoring impossible)
- AI features that have no graceful degradation path
- Using the AI to assert facts (quantities, counts) — AI suggests, humans confirm
- Not pinning the model version (`gpt-4o` vs `gpt-4o-2024-08-06`)
- Calling AI features synchronously from user interaction handlers

---

## Rules

1. All AI calls use the `structuredCompletion` wrapper
2. All AI calls log token usage
3. All AI features degrade gracefully when AI is unavailable
4. Model versions are always pinned (never use alias-only model names)
5. AI features are behind feature flags for staged rollout
6. No AI call is in the critical path of the scan session

---

## AI-Agent Instructions

When adding a new AI feature:
1. Create a dedicated file in `src/lib/ai/`
2. Use the `structuredCompletion` wrapper — never call the OpenAI SDK directly in tRPC code
3. Define the Zod schema for the output before writing the prompt
4. Define the degraded behavior before implementing the AI path
5. Add token usage logging at call completion
6. Add the feature to `AI_FEATURES` flags

---

## Production Considerations

- Set up an OpenAI usage dashboard alert at 80% of monthly budget
- Monitor `durationMs` for AI calls — alert if p95 > 15 seconds
- Implement per-user daily usage limits in the DB (not just in-memory rate limiting)
- Test degraded paths in staging by disabling the AI feature flag
- Periodically re-test prompts against new model versions (pinned models eventually deprecate)
