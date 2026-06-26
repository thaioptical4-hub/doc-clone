CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  doc_type VARCHAR(50) NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
