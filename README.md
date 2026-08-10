# Doc Delivery

Internal document delivery and confirmation system. Physical paper travels between desks โ€” this app records the digital chain of custody.

Two iPads: **Tablet 1** sends documents with sender details, optional photo, and signature. **Tablet 2** receives them, adds recipient photo and signature, and confirms delivery.

## How It Works

1. **Tablet 1** โ€” Fill out the Send form: document type, sender name, recipient name, optional photo (camera), optional signature (Apple Pencil or finger). Tap เธชเนเธเน€เธญเธเธชเธฒเธฃ.
2. **Paper moves physically** โ€” the app tracks what was sent and by whom.
3. **Tablet 2** โ€” The document appears in the Receive list (auto-refreshes every 5s, grouped by date). Tap to open.
4. **Tablet 2** โ€” Review sender info and attachments. Add optional recipient photo + signature. Tap **เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฃเธฑเธ**.
5. Status changes to `เธฃเธฑเธเนเธฅเนเธง`. Both tablets see the full audit trail. Optional: export PDF, delete, or multi-select batch delete.

## Workflow

```
Send tab               Receive tab                 Detail view
โ”โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”       โ”โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”            โ”โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”
โ” Doc type     โ”       โ” Invoice      โ”  tap โ’     โ” Sender: John     โ”
โ” Sender       โ”       โ” Packing Slip โ”            โ” Recipient: Jane  โ”
โ” Recipient    โ”       โ” Contract     โ”            โ” Status: sent     โ”
โ” ๐“ท Photo     โ”       โ” Report       โ”            โ” ๐“ท Sender photo  โ”
โ” โ๏ธ Signature  โ”       โ””โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”            โ” โ๏ธ Sender sig    โ”
โ” Submit       โ”                                   โ” โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€   โ”
โ””โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”                                   โ” ๐“ท Take photo    โ”
                                                   โ” โ๏ธ Sign here     โ”
                                                   โ” โ… Confirm       โ”
                                                   โ””โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”
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
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | (recommended) Service Account email for durable Drive/Sheets backup |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | (recommended) Service Account private key; store as a sensitive Vercel variable |
| `GOOGLE_DRIVE_FOLDER_ID` | (optional) Drive folder to upload into โ€” attachments are organized into date subfolders under this folder (defaults to My Drive root) |
| `GOOGLE_SHEET_ID` | (optional) Spreadsheet ID for the document activity log |

### 4. Open on both iPads

Open the Vercel URL in Safari โ’ tap Share โ’ **Add to Home Screen**. The app launches fullscreen with no browser chrome.

## Local Dev

```bash
npm install
cp .env.local.example .env.local
# fill in POSTGRES_URL, APP_USER, APP_PASS, NEXTAUTH_SECRET
npm run dev
```

## Google Drive/Sheets Backup

**Send**: when Tablet 1 submits a document, a row is appended to a Google Sheet (doc type, sender, recipient, description, sent time, status). **Receive**: when Tablet 2 confirms receipt, that same row is updated (status, confirm time) and every photo/signature attached to the document (sender's โ€” up to 5 โ€” and recipient's) is uploaded to Google Drive as a separate image file, sorted into a subfolder named for that day (e.g. `2026-07-08`) under `GOOGLE_DRIVE_FOLDER_ID`, with links added back into the row. If Drive/Sheets aren't configured, both steps are silently skipped and the app still works normally.

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
8. Run the migration in `db/schema.sql` again against your Neon database โ€” it adds the `sheet_row` column needed to match each document to its spreadsheet row (safe to re-run; existing tables/data are untouched).

The integration requests the full `drive` scope (not the narrower `drive.file`), because it needs to write into a pre-existing folder the account owner picked (`GOOGLE_DRIVE_FOLDER_ID`), not just files it created itself.

### Recommended production authentication

For a long-running installation, configure `GOOGLE_SERVICE_ACCOUNT_EMAIL` and
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` and share both the target Drive folder and
the activity spreadsheet with the service-account email as an Editor. The app
prefers these credentials automatically and only falls back to the legacy OAuth
variables when Service Account credentials are absent. A Service Account key
does not expire on a seven-day OAuth testing schedule; it remains valid until an
administrator disables the account or revokes/rotates the key.

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
โ””โ”€โ”€ schema.sql                 # Postgres schema (documents + attachments)

src/
โ”โ”€โ”€ app/
โ”   โ”โ”€โ”€ api/documents/         # REST API (POST, GET list)
โ”   โ”   โ”โ”€โ”€ [id]/              # GET detail, PATCH confirm, DELETE
โ”   โ”   โ””โ”€โ”€ batch-delete/      # POST bulk delete
โ”   โ”โ”€โ”€ login/                 # Single-credential login page
โ”   โ”โ”€โ”€ send/                  # Send form page
โ”   โ”โ”€โ”€ receive/[id]/          # Receive detail + confirm page
โ”   โ”โ”€โ”€ layout.tsx             # Root layout with PWA meta/viewport
โ”   โ”โ”€โ”€ page.tsx               # Home page with Send/Receive tabs
โ”   โ””โ”€โ”€ globals.css            # Styles
โ”โ”€โ”€ components/
โ”   โ”โ”€โ”€ CameraCapture.tsx      # Camera โ’ compressed JPEG base64
โ”   โ”โ”€โ”€ DocumentDetail.tsx     # Full document view with confirm + PDF export + delete
โ”   โ”โ”€โ”€ DocumentForm.tsx       # Send form with all fields
โ”   โ”โ”€โ”€ DocumentList.tsx       # Date-grouped list with status badges, multi-select, Export All
โ”   โ”โ”€โ”€ SignaturePad.tsx       # Canvas + PointerEvents โ’ PNG base64
โ”   โ””โ”€โ”€ TabBar.tsx             # Tab navigation (เธชเนเธ / เธฃเธฑเธ)
โ”โ”€โ”€ lib/
โ”   โ”โ”€โ”€ auth.ts                # NextAuth config
โ”   โ”โ”€โ”€ db.ts                  # Neon query helpers
โ”   โ””โ”€โ”€ types.ts               # Document, Attachment types
โ””โ”€โ”€ middleware.ts              # Auth gate (redirects to /login)
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

