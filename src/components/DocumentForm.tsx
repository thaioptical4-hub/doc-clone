"use client"

import { useState, useRef } from "react"
import CameraCapture from "./CameraCapture"
import SignaturePad from "./SignaturePad"

const DOC_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "packing_slip", label: "Packing Slip" },
  { value: "contract", label: "Contract" },
  { value: "report", label: "Report" },
  { value: "other", label: "Other" },
]

interface DocumentFormProps {
  onSuccess: () => void
}

export default function DocumentForm({ onSuccess }: DocumentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [photo, setPhoto] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const form = new FormData(e.currentTarget as HTMLFormElement)
    const body: Record<string, unknown> = {
      doc_type: form.get("doc_type"),
      sender_name: form.get("sender_name"),
      recipient_name: form.get("recipient_name"),
    }

    if (photo) body.photo_sender = photo
    if (signature) body.signature_sender = signature

    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      formRef.current?.reset()
      setPhoto(null)
      setSignature(null)
      onSuccess()
    } else {
      setError("Failed to submit. Try again.")
    }
    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="card">
      <div className="form-group">
        <label htmlFor="doc_type">Document Type</label>
        <select id="doc_type" name="doc_type" required defaultValue="">
          <option value="" disabled>
            Select type...
          </option>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="sender_name">Sender Name</label>
        <input id="sender_name" name="sender_name" type="text" required placeholder="e.g. John Smith" />
      </div>

      <div className="form-group">
        <label htmlFor="recipient_name">Recipient Name</label>
        <input id="recipient_name" name="recipient_name" type="text" required placeholder="e.g. Jane Doe" />
      </div>

      <div className="form-group">
        <label>Photo (optional)</label>
        <CameraCapture value={photo} onChange={setPhoto} />
      </div>

      <div className="form-group">
        <label>Signature (optional)</label>
        <SignaturePad value={signature} onChange={setSignature} />
      </div>

      {error && <p style={{ color: "#ff3b30", marginBottom: 16 }}>{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Sending..." : "Submit Document"}
      </button>
    </form>
  )
}
