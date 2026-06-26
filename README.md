# Doc Delivery

Internal document delivery and confirmation system for company use. Runs on two iPads — one to send, one to confirm receipt. Signatures with Apple Pencil, photos via camera, all synced through a single web app.

## Stack

- **Next.js 15** (App Router) — frontend + API routes
- **TypeScript** — full stack
- **Neon (Postgres)** — document + attachment storage
- **NextAuth.js** — single-credential auth gate
- **Vercel** — hosting

## Quick Deploy

1. Create a [Neon](https://neon.tech) database and copy the connection string
2. Import this repo into [Vercel](https://vercel.com/import)
3. Set these environment variables in Vercel dashboard:

| Variable | Value |
|---|---|
| `POSTGRES_URL` | Your Neon connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` output |
| `APP_USER` | Choose a username (e.g. `admin`) |
| `APP_PASS` | Choose a password |

4. Run `db/schema.sql` against your Neon database
5. Open the Vercel URL on both iPads — add to home screen for PWA mode

## Local Dev

```bash
npm install
cp .env.local.example .env.local
# fill in POSTGRES_URL, APP_USER, APP_PASS, NEXTAUTH_SECRET
npm run dev
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest |
