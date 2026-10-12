CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  doc_type VARCHAR(50) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sheet_row INTEGER
);

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  kind VARCHAR(30) NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_attachments_document_id ON attachments(document_id);

-- Safe to re-run against an existing database created before sheet_row existed.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sheet_row INTEGER;

-- v2: departments for reporting (nullable; older rows are reported as "ไม่ระบุ").
-- The app also applies these automatically on first use (see ensureSchema in src/lib/db.ts).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS sender_department VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_department VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
