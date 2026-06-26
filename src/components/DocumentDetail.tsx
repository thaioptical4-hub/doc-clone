"use client"

import { useState } from "react"
import CameraCapture from "./CameraCapture"
import SignaturePad from "./SignaturePad"
import type { DocumentWithAttachments } from "@/lib/types"

interface DocumentDetailProps {
  document: DocumentWithAttachments
  onConfirm: (photo?: string, signature?: string) => Promise<void>
}

export default function DocumentDetail({ document, onConfirm }: DocumentDetailProps) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const senderPhoto = document.attachments.find((a) => a.kind === "photo_sender")
  const senderSig = document.attachments.find((a) => a.kind === "signature_sender")
  const recipientPhoto = document.attachments.find((a) => a.kind === "photo_recipient")
  const recipientSig = document.attachments.find((a) => a.kind === "signature_recipient")
  const isConfirmed = document.status === "confirmed"

  async function handleConfirm() {
    setConfirming(true)
    await onConfirm(photo || undefined, signature || undefined)
    setConfirming(false)
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{document.doc_type}</h3>

      <div style={{ marginBottom: 16 }}>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label>Sender</label>
          <p>{document.sender_name}</p>
        </div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label>Recipient</label>
          <p>{document.recipient_name}</p>
        </div>
        {document.description && (
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>Description</label>
            <p style={{ whiteSpace: "pre-wrap", color: "#555" }}>{document.description}</p>
          </div>
        )}
        <div className="form-group">
          <label>Status</label>
          <span className={isConfirmed ? "badge badge-confirmed" : "badge badge-sent"}>
            {document.status}
          </span>
        </div>
      </div>

      {senderPhoto && (
        <div className="form-group">
          <label>Sender Photo</label>
          <div className="camera-area">
            <img src={senderPhoto.data} alt="Sender" />
          </div>
        </div>
      )}

      {senderSig && (
        <div className="form-group">
          <label>Sender Signature</label>
          <div className="signature-area" style={{ border: "1px solid #eee" }}>
            <img src={senderSig.data} alt="Sender signature" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>
      )}

      {isConfirmed && (
        <>
          <hr style={{ margin: "20px 0", border: "none", borderTop: "2px solid #34c759" }} />

          {recipientPhoto && (
            <div className="form-group">
              <label>Recipient Photo</label>
              <div className="camera-area">
                <img src={recipientPhoto.data} alt="Recipient" />
              </div>
            </div>
          )}

          {recipientSig && (
            <div className="form-group">
              <label>Recipient Signature</label>
              <div className="signature-area" style={{ border: "1px solid #eee" }}>
                <img src={recipientSig.data} alt="Recipient signature" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>
          )}
        </>
      )}

      {!isConfirmed && (
        <>
          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #eee" }} />

          <div className="form-group">
            <label>Photo (optional)</label>
            <CameraCapture value={photo} onChange={setPhoto} />
          </div>

          <div className="form-group">
            <label>Signature (optional)</label>
            <SignaturePad value={signature} onChange={setSignature} />
          </div>

          <button className="btn-success" onClick={handleConfirm} disabled={confirming}>
            {confirming ? "Confirming..." : "Confirm Receipt"}
          </button>
        </>
      )}
    </div>
  )
}
