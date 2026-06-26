# Doc Delivery — Developer Guide

## Commands
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck` (tsc --noEmit)
- **Test**: `npm test`

## Stack
Next.js App Router, TypeScript, Vercel Postgres, NextAuth.js (credentials).

## Patterns
- App Router route handlers in `src/app/api/`
- Components in `src/components/`
- DB helpers in `src/lib/db.ts`
- Shared types in `src/lib/types.ts`
- PWA manifest in `public/manifest.json`

## Conventions
- No default exports for components (named exports only)
- Server components by default; add `"use client"` only when needed
- Keep API routes thin — logic in lib/, not in route handlers
- Use `@vercel/postgres` `sql` template tag for queries
