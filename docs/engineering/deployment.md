# SmartOrder — Deployment Strategy

## Purpose

Defines the deployment pipeline, environment management, and production readiness requirements for SmartOrder. Stable deployments are critical — a broken production deploy during a shift means workers can't complete their order prep.

---

## Responsibilities

- Define the deployment pipeline (preview → production)
- Establish environment variable management
- Define pre-deploy checklist requirements
- Set rollback procedures

---

## Platform: Vercel

SmartOrder deploys on Vercel with Next.js App Router. Vercel handles:
- Preview deployments on every push/PR
- Production deployments on merge to `main`
- Environment variable management
- CDN and Blob storage

---

## Branch Strategy

```
main          ← production branch; deploys to production automatically
feature/*     ← feature branches; get preview deployments on push
```

No `develop` or `staging` branch. Preview deployments serve as staging.

---

## Deployment Pipeline

```
Developer pushes to feature branch
         ↓
Vercel: preview deployment created
  └─ Next.js build
  └─ Type check (pnpm typecheck)
  └─ Tests (pnpm test --run)
         ↓
Developer opens PR
  └─ PR comment: preview URL
  └─ CI checks must pass (typecheck, tests)
         ↓
PR merged to main
         ↓
Vercel: production deployment
  └─ pnpm build
  └─ Run database migrations
  └─ Promote to production
```

---

## Environment Variables

Managed via Vercel's environment variable UI. Never committed to the repository.

### Variable categories

| Variable | Environment | Sensitive? |
|---|---|---|
| `DATABASE_URL` | Production, Preview | Yes |
| `DIRECT_URL` | Production, Preview | Yes |
| `OPENAI_API_KEY` | Production, Preview | Yes |
| `AWS_ACCESS_KEY_ID` | Production, Preview | Yes |
| `AWS_SECRET_ACCESS_KEY` | Production, Preview | Yes |
| `AWS_REGION` | Production, Preview | No |
| `BLOB_READ_WRITE_TOKEN` | Production, Preview | Yes |
| `NEXTAUTH_SECRET` | Production, Preview | Yes |
| `NEXTAUTH_URL` | Production, Preview | No |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | No |
| `FEATURE_OCR_PARSING` | All | No |
| `FEATURE_VISION_ANALYSIS` | All | No |

### Local development

```bash
# .env.local — never committed
# Pull from Vercel:
vercel env pull .env.local
```

---

## Database Migrations on Deploy

Drizzle migrations run automatically as part of the build process:

```json
// package.json
{
  "scripts": {
    "build": "pnpm db:migrate && next build",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

This ensures migrations run before the new code is served.

### Migration safety rules for production

1. All new columns must be nullable or have a DEFAULT
2. Never drop a column that existing code still reads (two-step: stop reading, then drop)
3. Test migrations on a restored production dump before merging
4. Large table migrations (adding an index on a 1M+ row table) should use concurrent index creation

```sql
-- Safe large-table index
CREATE INDEX CONCURRENTLY catalog_item_name_trgm_idx
  ON smartorder_catalog_item USING gin (name gin_trgm_ops);
```

---

## Pre-Deploy Checklist

Before merging to `main`:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm test --run` passes
- [ ] `pnpm lint` passes (no errors)
- [ ] New migrations are backward-compatible
- [ ] Environment variables for new features are set in Vercel
- [ ] Feature flags are set for new AI features
- [ ] Preview deployment tested on mobile viewport
- [ ] No `console.log` in committed code
- [ ] No `.env` files committed

---

## Rollback Procedure

If a production deployment causes failures:

1. **Immediate rollback**: Vercel dashboard → Deployments → select previous deployment → "Promote to Production"
2. **Migration rollback**: If the deployment included a migration, roll back the migration manually if needed (Drizzle does not auto-rollback)
3. **Feature flag rollback**: Disable failing feature via `FEATURE_*` env var in Vercel dashboard (instant, no redeploy needed)

Rollback decision criteria:
- Error rate > 5% on any user-facing mutation
- Scan session failures (critical path)
- Database migration failure (stop deployment immediately)

---

## Preview Deployments

Every push to a feature branch gets a preview URL. Use it to:
- Test new UI on mobile viewport (browser DevTools ≠ real device)
- Verify database migrations on the preview database
- Share with stakeholders for review

Preview environments use a separate Neon PostgreSQL branch (if configured).

---

## Health Checks

Add a health endpoint:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
```

Vercel Uptime Monitoring can ping `/api/health` on an interval.

---

## Anti-patterns

- Running migrations manually on production without a rollback plan
- Hardcoding environment-specific URLs in application code
- Deploying untested migrations on Friday afternoon
- Using `NEXT_PUBLIC_` prefix on secret values

---

## Rules

1. `main` branch is always deployable
2. Migrations run before the new code takes traffic
3. Feature flags control AI feature availability — use them for staged rollout
4. Rollback is always possible and is always faster than forward-fixing
5. Preview deployments are tested before merge

---

## AI-Agent Instructions

When generating deployment-related code:
1. Migrations belong in `drizzle/` — generated by `drizzle-kit generate`, never hand-written
2. Environment variables are always accessed via `process.env.VAR_NAME` — never hardcoded
3. The health endpoint reads from the real database — it is a real health check
4. Feature flags are env-var-based — add new ones to the variable table in this doc

---

## Production Considerations

- Set up Vercel Speed Insights for real-user monitoring
- Configure Vercel Firewall rules to block obvious abuse patterns
- Enable Vercel Log Drains to pipe logs to an aggregation service
- Neon PostgreSQL: use connection pooling URL for the app, direct URL for migrations
- Set `maxDuration` in Vercel function config for AI/OCR routes (they may need > 30s)

```json
// vercel.json (route-specific timeout)
{
  "functions": {
    "src/app/api/trpc/[trpc]/route.ts": {
      "maxDuration": 60
    }
  }
}
```
