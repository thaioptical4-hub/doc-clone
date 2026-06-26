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
|             │  /api/documents│  GET(single), PATCH(confirm)    |
|             │       /[id]    │                                 |
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
│   │   ├── db.ts                   # Vercel Postgres pool
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

### Phase 1 — Core Workflow

- [ ] `POST /api/documents` — create document with sender info, optional photo, optional signature
- [ ] `GET /api/documents` — list all documents, filterable by status
- [ ] `GET /api/documents/[id]` — single document with all attachments
- [ ] `PATCH /api/documents/[id]` — confirm receipt, add recipient photo/signature
- [ ] Send page (`/send`) — form with doc type dropdown, sender, recipient, photo capture, signature pad, submit
- [ ] Receive list (`/receive`) — table view of documents by status, tap to open detail
- [ ] Receive detail (`/receive/[id]`) — read-only sender info, photo capture button, signature pad, confirm button
- [ ] SignaturePad component — canvas responds to touch + Apple Pencil, exports SVG, stores in DB
- [ ] CameraCapture component — opens camera, compresses to JPEG, stores as base64 in DB
- [ ] Auth gate — login page, NextAuth credentials provider, middleware redirect
- [ ] PWA manifest — standalone mode, iOS safe-area, app icons
- [ ] Database schema — documents + attachments tables created in Vercel Postgres

### Phase 2 — Deployment & Handoff
Make the project deployable via Vercel with documented env vars and README instructions for company handoff.

### Phase 3 — Polish
Error states, loading skeletons, list sorting/filtering, empty states.

### Phase 4 — Offline Support
Service worker for basic offline document viewing.

### Phase 5 — Multi-user Auth
Replace single credential with per-user accounts and roles.
