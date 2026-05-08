# SmartOrder — Security Guidelines

## Purpose

Defines security requirements, patterns, and prohibited practices for SmartOrder. Inventory data and operational workflows are consequential — security failures can expose sensitive business data or allow unauthorized data modification.

---

## Responsibilities

- Define auth patterns and session management
- Establish input validation requirements
- Specify safe handling of external service credentials
- Define data exposure rules (what can be public vs. private)

---

## Authentication

SmartOrder uses Next.js Auth (Auth.js v5 or Clerk — to be confirmed). All app routes under `(app)/` require authentication.

### Protected routes

Every tRPC procedure in the app uses `protectedProcedure`:

```typescript
// All app operations require auth
export const catalogRouter = createTRPCRouter({
  list: protectedProcedure  // never publicProcedure for app data
    .input(...)
    .query(async ({ ctx, input }) => {
      // ctx.session is guaranteed non-null here
    }),
});
```

### Session handling

- Sessions expire after reasonable inactivity (configure in auth provider)
- Never store sensitive data in `localStorage` (use HttpOnly cookies via auth provider)
- `ctx.session.user.id` is the auth source of truth — never trust user-supplied IDs for ownership checks

---

## Input Validation

Every tRPC procedure input is validated with Zod. This is the primary defense against malformed input.

### String injection prevention

```typescript
// Zod naturally prevents injection in typed inputs
name: z.string().min(1).max(256),

// For SQL: always use Drizzle parameterized queries (never string interpolation)
.where(eq(catalogItems.name, input.name))  // ✅ parameterized
.where(sql`name = '${input.name}'`)        // ❌ injection risk
```

### File upload validation

```typescript
// Validate MIME type AND magic bytes (not just filename extension)
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (!ALLOWED_MIME_TYPES.has(file.type)) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "File type not allowed" });
}
if (file.size > MAX_FILE_SIZE) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "File too large" });
}
```

### Numeric bounds

```typescript
// All numeric inputs must have explicit bounds
targetCases: z.number().int().min(0).max(9999),
sortOrder: z.number().int().min(0).max(9999),
limit: z.number().int().min(1).max(100).default(50),
```

---

## Environment Variables

API keys and secrets are managed via environment variables. Never in code.

### Required secrets (never hardcode)

```bash
# .env.local (never commit)
DATABASE_URL=          # PostgreSQL connection string
DIRECT_URL=            # Direct connection (for migrations)
OPENAI_API_KEY=        # OpenAI API key
AWS_ACCESS_KEY_ID=     # AWS Textract access
AWS_SECRET_ACCESS_KEY= # AWS Textract secret
AWS_REGION=            # AWS region
BLOB_READ_WRITE_TOKEN= # Vercel Blob
NEXTAUTH_SECRET=       # Auth signing key
NEXTAUTH_URL=          # App URL
```

### Access rules

| Secret | Where used |
|---|---|
| `OPENAI_API_KEY` | Server only (in tRPC procedures) |
| `AWS_*` | Server only (in tRPC procedures) |
| `DATABASE_URL` | Server only (Drizzle client) |
| `BLOB_READ_WRITE_TOKEN` | Server only for writes; public read URL via CDN |

Never import secrets in client components. The Next.js `NEXT_PUBLIC_` prefix is required for any env var used client-side — and those must never be secrets.

---

## Data Exposure Rules

### tRPC procedure responses

Never return full database row shapes when a subset is sufficient:

```typescript
// ❌ Potentially over-exposes internal fields
return await db.select().from(catalogItems).where(...);

// ✅ Return only what the client needs
return await db
  .select({
    id: catalogItems.id,
    name: catalogItems.name,
    vendor: catalogItems.vendor,
    packSize: catalogItems.packSize,
    unitType: catalogItems.unitType,
  })
  .from(catalogItems)
  .where(...);
```

### Backroom snapshot images

- Vercel Blob: use private storage with signed URLs for sensitive operational images
- Public URL access should require auth — do not expose blob URLs publicly if snapshots contain sensitive shelf/pricing information

---

## SQL Injection Prevention

Drizzle's query builder parameterizes all inputs automatically. Never bypass it:

```typescript
// ✅ Safe: parameterized via Drizzle
.where(ilike(catalogItems.name, `%${input.query}%`))

// ✅ Safe: tagged sql template (auto-parameterizes)
.where(sql`name ILIKE ${'%' + input.query + '%'}`)

// ❌ Unsafe: raw string (injection risk)
db.execute(`SELECT * FROM catalog WHERE name LIKE '%${input.query}%'`)
```

---

## XSS Prevention

- React auto-escapes all string content in JSX — do not use `dangerouslySetInnerHTML`
- OCR output and AI responses: sanitize before rendering (Zod validation ensures structure; still avoid rendering as raw HTML)
- User notes on snapshots: render as text (`<p>` or `<pre>`) never as HTML

```tsx
// ✅ Safe: React escapes automatically
<p>{snapshot.notes}</p>

// ❌ Unsafe: never do this with user content
<div dangerouslySetInnerHTML={{ __html: snapshot.notes }} />
```

---

## Rate Limiting

Protect expensive endpoints from abuse:

```typescript
// Apply rate limiting to OCR job creation and AI calls
// Implement in middleware or at the tRPC procedure level
const RATE_LIMITS = {
  ocrJobCreate: { maxPerHour: 20, maxPerDay: 100 },
  aiSemanticMatch: { maxPerMinute: 30 },
};
```

Rate limiting implementation: use Upstash Redis (available on Vercel Marketplace) with a sliding window counter.

---

## CORS

The Next.js app handles its own routes — CORS is not needed for same-origin API calls (tRPC). Only configure CORS if an external API consumer is planned.

---

## Content Security Policy

Add CSP headers in `next.config.js`:

```javascript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.public.blob.vercel-storage.com;
  connect-src 'self' https://*.vercel.app;
  frame-src 'none';
`.replace(/\n/g, " ");
```

---

## Anti-patterns

- Secrets in client-side code or `NEXT_PUBLIC_` env vars
- `publicProcedure` for any data mutation
- `dangerouslySetInnerHTML` with user-generated content
- Trusting user-supplied UUIDs for resource ownership (always validate against `ctx.session.user.id`)
- Storing full credentials in `localStorage`

---

## Rules

1. All API routes that touch data use `protectedProcedure`
2. All secrets live in environment variables, never in code
3. All file uploads are validated for type AND size server-side
4. Drizzle parameterized queries only — no raw string SQL with user input
5. AI-parsed content is never rendered as HTML

---

## AI-Agent Instructions

When generating security-relevant code:
1. Always use `protectedProcedure` unless explicitly building a public endpoint
2. Never put API keys, connection strings, or secrets in source files
3. Validate numeric inputs with explicit `.min()` and `.max()` bounds
4. File upload handlers must validate both MIME type and file size
5. User-generated content (notes, names) renders as text — never as HTML

---

## Production Considerations

- Enable Vercel's built-in DDoS protection and Firewall WAF
- Set `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` headers
- Enable HSTS (`Strict-Transport-Security`) on production
- Audit environment variables on every deploy — check that no secrets are exposed client-side
- Rotate API keys on a schedule (OpenAI, AWS) and when team members leave
