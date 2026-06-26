# Doc Delivery

Internal document delivery and confirmation system. Physical paper travels between desks — this app records the digital chain of custody.

Two iPads: **Tablet 1** sends documents with sender details, optional photo, and signature. **Tablet 2** receives them, adds recipient photo and signature, and confirms delivery.

## How It Works

1. **Tablet 1** — Fill out the Send form: document type, sender name, recipient name, optional photo (camera), optional signature (Apple Pencil or finger). Tap Submit.
2. **Paper moves physically** — the app tracks what was sent and by whom.
3. **Tablet 2** — The document appears in the Receive list (auto-refreshes every 5s). Tap to open.
4. **Tablet 2** — Review sender info and attachments. Add optional recipient photo + signature. Tap **Confirm Receipt**.
5. Status changes to `confirmed`. Both tablets see the full audit trail.

## Workflow

```
Send tab               Receive tab                 Detail view
┌──────────────┐       ┌──────────────┐            ┌──────────────────┐
│ Doc type     │       │ Invoice      │  tap →     │ Sender: John     │
│ Sender       │       │ Packing Slip │            │ Recipient: Jane  │
│ Recipient    │       │ Contract     │            │ Status: sent     │
│ 📷 Photo     │       │ Report       │            │ 📷 Sender photo  │
│ ✍️ Signature  │       └──────────────┘            │ ✍️ Sender sig    │
│ Submit       │                                   │ ──────────────   │
└──────────────┘                                   │ 📷 Take photo    │
                                                   │ ✍️ Sign here     │
                                                   │ ✅ Confirm       │
                                                   └──────────────────┘
```

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Neon (Postgres) |
| Auth | NextAuth.js (credentials) |
| Hosting | Vercel |
| PWA | manifest.json + iOS safe-area |

## Quick Deploy

### 1. Create a Neon database

Go to [neon.tech](https://neon.tech), create a project, copy the connection string.

### 2. Run the schema

Run `db/schema.sql` against your Neon database (Neon's SQL editor works fine).

### 3. Deploy to Vercel

Import this repo into [Vercel](https://vercel.com) and set these environment variables:

| Variable | Description |
|---|---|
| `POSTGRES_URL` | Neon connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` and paste |
| `NEXTAUTH_URL` | Your Vercel URL (e.g. `https://doc-delivery.vercel.app`) |
| `APP_USER` | Login username (e.g. `admin`) |
| `APP_PASS` | Login password |

### 4. Open on both iPads

Open the Vercel URL in Safari → tap Share → **Add to Home Screen**. The app launches fullscreen with no browser chrome.

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
| `npm test` | Vitest (if tests are written) |

## Project Structure

```
src/
├── app/
│   ├── api/documents/         # REST API (POST, GET list, GET detail, PATCH confirm)
│   ├── login/                 # Single-credential login page
│   ├── send/                  # Send form page
│   ├── receive/[id]/          # Receive detail + confirm page
│   ├── layout.tsx             # Root layout with PWA meta/viewport
│   ├── page.tsx               # Home page with Send/Receive tabs
│   └── globals.css            # Styles
├── components/
│   ├── CameraCapture.tsx      # Camera → compressed JPEG base64
│   ├── DocumentDetail.tsx     # Full document view with confirm controls
│   ├── DocumentForm.tsx       # Send form with all fields
│   ├── DocumentList.tsx       # Document table with status badges
│   ├── SignaturePad.tsx       # Canvas + PointerEvents → SVG
│   └── TabBar.tsx             # Tab navigation (Send / Receive)
├── lib/
│   ├── auth.ts                # NextAuth config
│   ├── db.ts                  # Neon query helpers
│   └── types.ts               # Document, Attachment types
└── middleware.ts              # Auth gate (redirects to /login)
```

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/documents` | Create a document (sender photo/signature optional) |
| `GET` | `/api/documents` | List all documents (optional `?status=sent`) |
| `GET` | `/api/documents/[id]` | Get single document with all attachments |
| `PATCH` | `/api/documents/[id]` | Confirm receipt (add recipient photo/signature) |
