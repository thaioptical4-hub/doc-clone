# Doc Delivery — Project Analysis

## Architecture

```
+---------------------------------------------------------------+
|                     NEXT.JS PWA (Vercel)                       |
|                  Single app, dual role — tab-based              |
|                                                                |
|  ┌──────────────────────────────────────────────────────────┐  |
|  │              AUTH GATE (NextAuth.js)                      │  |
|  │         Username / Password  ->  JWT session              │  |
|  └──────────────────────────────────────────────────────────┘  |
|                            │                                   |
|  ┌──────────────┐    ┌──────────────┐                          |
|  │  SEND tab    │    │ RECEIVE tab  │                          |
|  │              │    │              │                          |
|  │ Doc type     │    │ Doc list     │                          |
|  │ Sender name  │    │              │                          |
|  │ Recipient    │    │ Tap -> detail│                          |
|  │ Photo (opt)  │    │              │                          |
|  │ Sig (opt)    │    │ Photo (opt)  │                          |
|  └──────┬───────┘    │ Sig (opt)    │                          |
|         │            │ [Confirm]    │                          |
|         └─────┬──────┘──────┬───────┘                          |
|               │             │                                  |
|               └──────┬──────┘                                  |
|                      ▼                                         |
|             ┌───────────────┐                                  |
|             │  API Routes    │                                 |
|             │  /api/documents│  GET(list), POST(create)        |
|             │  /api/documents│  GET(single), PATCH(confirm),   |
|             │       /[id]    │  DELETE                         |
|             │  /api/documents│  POST(batch delete)             |
|             │  /batch-delete │                                 |
|             └───────┬───────┘                                  |
+---------------------------------------------------------------+
                      │
                      ▼
             ┌───────────────┐
             │Vercel Postgres │
             └───────────────┘
```

## Data Model

```
+------------------+       +----------------------+
|    documents     |       |     attachments      |
+------------------+       +----------------------+
| id (PK)          |--1:N--| id (PK)              |
| doc_type         |       | document_id (FK)     |
| sender_name      |       | kind                 |  'photo_sender'
| recipient_name   |       | data (TEXT)          |  'signature_sender'
| status           |       | created_at           |  'photo_recipient'
| created_at       |       +----------------------+  'signature_recipient'
| updated_at       |
+------------------+

status: 'sent' --> 'confirmed'
```

Photos stored as compressed base64 JPEG in `data`. Signatures stored as SVG markup in `data`.

## File Structure

```
doc-delivery/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # PWA manifest, global styles, auth provider
│   │   ├── page.tsx                # Home -- "Send" / "Receive" tabs
│   │   ├── send/
│   │   │   └── page.tsx            # Send form (doc type, sender, recipient, photo, sig)
│   │   ├── receive/
│   │   │   ├── page.tsx            # Incoming documents list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Detail view + confirm + photo + signature
│   │   └── api/
│   │       └── documents/
│   │           ├── route.ts        # GET (list), POST (create)
│   │           └── [id]/
│   │               └── route.ts    # GET (single), PATCH (confirm: add photo/sig)
│   ├── components/
│   │   ├── SignaturePad.tsx        # <canvas> + PointerEvents -> SVG
│   │   ├── DocumentForm.tsx        # Doc type, sender, recipient, photo, sig
│   │   ├── DocumentList.tsx        # Incoming docs table
│   │   ├── DocumentDetail.tsx      # Read-only view + photo + sig + confirm
│   │   ├── CameraCapture.tsx       # <input capture="environment">
│   │   └── TabBar.tsx             # Send / Receive switcher
│   ├── lib/
│   │   ├── db.ts                   # Neon query helpers (CRUD + batch delete)
│   │   └── types.ts                # Document, Attachment, Status enums
│   └── middleware.ts               # NextAuth gate
├── public/
│   ├── manifest.json               # PWA manifest (standalone, iOS)
│   └── icons/
├── .env.local.example
├── package.json
├── tsconfig.json
├── next.config.ts
└── doc/
    └── analysis.md                 # This file
```

## Decisions Log

| Decision | Choice | Why |
|---|---|---|
| **Framework** | Next.js App Router | One project for frontend + API, free Vercel hosting, PWA works on iPad Safari |
| **Database** | Vercel Postgres | Free tier (500 compute-hours), same platform, no separate service |
| **Storage** | DB TEXT column | Photos as compressed base64, signatures as SVG. No Blob/S3 needed at this scale |
| **Auth** | NextAuth.js + credentials | Single username/password in env vars. No user table, no email verification. Simple gate for the whole app |
| **PWA** | manifest.json | Standalone icon on iPad home screen, hides Safari chrome |
| **Signatures** | `<canvas>` + PointerEvent | Apple Pencil pressure and azimuth via PointerEvent API, export SVG for compact storage |
| **Camera** | `<input capture="environment">` | Works in Safari on iPad, opens camera directly, no permissions dance |
| **Hosting** | Vercel | Free tier (100GB bandwidth, custom domain support). One click deploy from repo |
| **Language** | Thai (th-TH) | UI text, date formatting (Buddhist calendar), status labels all in Thai |
| **Rate limiting** | In-memory Map in middleware | 5 login attempts/min/IP, no external dependency |
| **Session maxAge** | NextAuth JWT: 8 hours | Balances convenience with exposure window |
| **CSP** | Header on every response | Restricts to self, data:, blob: for images; no frame ancestors |
| **Attachment validation** | Base64 prefix + size check in db.ts | Rejects non-image data and oversized payloads |
| **Doc type** | Free-text `<input>` | Replaced dropdown/select after requirements changed; no predefined enum needed |
| **PDF export (single)** | html2canvas + jsPDF | Captures rendered card DOM to canvas, embeds in A4 PDF. Share via navigator.share on iPad |
| **PDF export (all)** | jsPDF text render | Iterates documents, draws text rows per page. No DOM rendering needed |
| **Handoff** | Public GitHub repo + Vercel deploy button | Company creates their own Vercel account. Your repo stays public for portfolio. |

## What Changes vs What Stays Stable

| Likely to change | Should stay stable |
|---|---|
| Document type options | Two-table schema (documents + attachments) |
| Extra fields (department, reference #) | API contract (GET/POST/PATCH /api/documents) |
| Signature pad UX tuning | `attachments` table pattern (kind + data) |
| Photo compression settings | PWA shell + Send/Receive tab nav |
| Auth credentials / method | Auth gate middleware pattern |

**Module boundaries:** `doc_type` enum and `SignaturePad` canvas component each live in isolated modules, because they're the most likely to churn as the company refines the workflow.

---

## Status

### Phase 1 — Core Workflow ✓

- [x] `POST /api/documents` — create document with sender info, optional photo, optional signature
- [x] `GET /api/documents` — list all documents, filterable by status
- [x] `GET /api/documents/[id]` — single document with all attachments
- [x] `PATCH /api/documents/[id]` — confirm receipt, add recipient photo/signature
- [x] `DELETE /api/documents/[id]` — delete document + attachments
- [x] `POST /api/documents/batch-delete` — bulk delete
- [x] Send page (`/send`) — form with doc type text input, sender, recipient, photo capture, signature pad, submit
- [x] Receive list (`/receive`) — date-grouped list, status badges, multi-select, Export All PDF, auto-refresh
- [x] Receive detail (`/receive/[id]`) — read-only sender info, photo capture, signature pad, confirm, PDF export, delete
- [x] SignaturePad component — canvas responds to touch + Apple Pencil, exports PNG base64 to DB
- [x] CameraCapture component — opens camera, compresses to JPEG, stores as base64 in DB
- [x] Auth gate — login page, NextAuth credentials provider, middleware redirect
- [x] PWA manifest — standalone mode, iOS safe-area, app icons
- [x] Database schema — documents + attachments tables in Neon
- [x] All UI in Thai language (th-TH locale, Buddhist calendar)

### Phase 2 — Deployment & Handoff ✓
Project deployable via Vercel with documented env vars and README instructions for company handoff.

### Phase 3 — Polish ✓
- Export single document PDF (html2canvas + jsPDF)
- Export all documents combined PDF (jsPDF text)
- Date-separated list groups
- Multi-select batch delete with confirm dialog
- Individual delete with confirm overlay (no window.confirm — iOS PWA safe)
- "Send Another" button after successful submission

### Phase 4 — Security ✓
- [x] Rate limit login (5 attempts/min/IP)
- [x] Session maxAge (8h JWT expiry)
- [x] CSP headers on all responses
- [x] Attachment data validation (format + size)

### Phase 4 — Offline Support
Service worker for basic offline document viewing.

### Phase 5 — Multi-user Auth
Replace single credential with per-user accounts and roles.
