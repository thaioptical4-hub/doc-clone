# Doc Delivery

Internal document delivery and confirmation system. Physical paper travels between desks — this app records the digital chain of custody.

Two iPads: **Tablet 1** sends documents with sender details, optional photo, and signature. **Tablet 2** receives them, adds recipient photo and signature, and confirms delivery.

## How It Works

1. **Tablet 1** — Fill out the Send form: document type, sender name, recipient name, optional photo (camera), optional signature (Apple Pencil or finger). Tap ส่งเอกสาร.
2. **Paper moves physically** — the app tracks what was sent and by whom.
3. **Tablet 2** — The document appears in the Receive list (auto-refreshes every 5s, grouped by date). Tap to open.
4. **Tablet 2** — Review sender info and attachments. Add optional recipient photo + signature. Tap **ยืนยันการรับ**.
5. Status changes to `รับแล้ว`. Both tablets see the full audit trail. Optional: export PDF, delete, or multi-select batch delete.

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
| `GOOGLE_CLIENT_ID` | (optional) OAuth client ID for Drive/Sheets backup |
| `GOOGLE_CLIENT_SECRET` | (optional) OAuth client secret for Drive/Sheets backup |
| `GOOGLE_REFRESH_TOKEN` | (optional) OAuth refresh token for Drive/Sheets backup |
| `GOOGLE_DRIVE_FOLDER_ID` | (optional) Drive folder to upload into — attachments are organized into date subfolders under this folder (defaults to My Drive root) |
| `GOOGLE_SHEET_ID` | (optional) Spreadsheet ID for the document activity log |

### 4. Open on both iPads

Open the Vercel URL in Safari → tap Share → **Add to Home Screen**. The app launches fullscreen with no browser chrome.

## Local Dev

```bash
npm install
cp .env.local.example .env.local
# fill in POSTGRES_URL, APP_USER, APP_PASS, NEXTAUTH_SECRET
npm run dev
```

## Google Drive/Sheets Backup

**Send**: when Tablet 1 submits a document, a row is appended to a Google Sheet (doc type, sender, recipient, description, sent time, status). **Receive**: when Tablet 2 confirms receipt, that same row is updated (status, confirm time) and every photo/signature attached to the document (sender's — up to 5 — and recipient's) is uploaded to Google Drive as a separate image file, sorted into a subfolder named for that day (e.g. `2026-07-08`) under `GOOGLE_DRIVE_FOLDER_ID`, with links added back into the row. If Drive/Sheets aren't configured, both steps are silently skipped and the app still works normally.

Everything lands in `thaioptical4@gmail.com`'s own Drive/Sheets (not a service account), because the integration uses that account's own OAuth credentials.

### One-time setup

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable the **Google Drive API** and **Google Sheets API**.
2. Configure the OAuth consent screen (External; add `thaioptical4@gmail.com` as a test user).
3. Create an **OAuth Client ID** of type **Desktop app**. Copy the client ID and secret.
4. Run the helper script locally to get a refresh token:
   ```bash
   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/get-google-refresh-token.mjs
   ```
5. Open the printed URL, sign in as `thaioptical4@gmail.com`, approve access.
6. Create the log spreadsheet (reuses the same credentials):
   ```bash
   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy GOOGLE_REFRESH_TOKEN=zzz node scripts/create-google-sheet.mjs
   ```
7. Copy the four printed/obtained values (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_SHEET_ID`) into `.env.local` (dev) and your Vercel project's environment variables (production).
8. Run the migration in `db/schema.sql` again against your Neon database — it adds the `sheet_row` column needed to match each document to its spreadsheet row (safe to re-run; existing tables/data are untouched).

The integration requests the full `drive` scope (not the narrower `drive.file`), because it needs to write into a pre-existing folder the account owner picked (`GOOGLE_DRIVE_FOLDER_ID`), not just files it created itself.

## Security

| Measure | What it does |
|---|---|
| **Rate limiting** | Login endpoint: 5 attempts / minute / IP. Returns 429 on excess. |
| **Session expiry** | JWT session expires after 8 hours. Re-login required. |
| **CSP headers** | `Content-Security-Policy` restricts script/style/img/form sources to origin. |
| **Attachment validation** | Only `data:image/` payloads accepted. Max 5 MB per attachment. |

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
db/
└── schema.sql                 # Postgres schema (documents + attachments)

src/
├── app/
│   ├── api/documents/         # REST API (POST, GET list)
│   │   ├── [id]/              # GET detail, PATCH confirm, DELETE
│   │   └── batch-delete/      # POST bulk delete
│   ├── login/                 # Single-credential login page
│   ├── send/                  # Send form page
│   ├── receive/[id]/          # Receive detail + confirm page
│   ├── layout.tsx             # Root layout with PWA meta/viewport
│   ├── page.tsx               # Home page with Send/Receive tabs
│   └── globals.css            # Styles
├── components/
│   ├── CameraCapture.tsx      # Camera → compressed JPEG base64
│   ├── DocumentDetail.tsx     # Full document view with confirm + PDF export + delete
│   ├── DocumentForm.tsx       # Send form with all fields
│   ├── DocumentList.tsx       # Date-grouped list with status badges, multi-select, Export All
│   ├── SignaturePad.tsx       # Canvas + PointerEvents → PNG base64
│   └── TabBar.tsx             # Tab navigation (ส่ง / รับ)
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
| `DELETE` | `/api/documents/[id]` | Delete document + all its attachments |
| `POST` | `/api/documents/batch-delete` | Bulk delete `{ ids: [1, 2, 3] }` |
