"use client"

import { useRef } from "react"
import { compressImage } from "@/lib/image"

interface CameraCaptureProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
}

const hiddenInputStyle = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  border: 0,
}

export default function CameraCapture({ value, onChange }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => compressImage(reader.result as string, onChange)
    reader.readAsDataURL(file)
  }

  function handleClear() {
    onChange(null)
  }

  return (
    <div>
      {value ? (
        <div>
          <div className="camera-area">
            <img src={value} alt="เธฃเธนเธเธ เธฒเธเธ—เธตเนเนเธเธ" />
          </div>
          <button type="button" onClick={handleClear} className="btn-danger" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            เธฅเธเธฃเธนเธเธ เธฒเธ
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <button type="button" onClick={() => cameraInputRef.current?.click()} style={{ background: "#fdf0e2", color: "#7a4a1e", padding: "24px 12px" }}>
            เธ–เนเธฒเธขเธฃเธนเธ
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: "#eef2ff", color: "#243b78", padding: "24px 12px" }}>
            เน€เธฅเธทเธญเธเธฃเธนเธเธเธฒเธเน€เธเธฃเธทเนเธญเธ
          </button>
        </div>
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={hiddenInputStyle} />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={hiddenInputStyle} />
    </div>
  )
}

