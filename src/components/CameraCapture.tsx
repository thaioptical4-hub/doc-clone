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
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => compressImage(reader.result as string, onChange)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      {value ? (
        <div>
          <div className="camera-area">
            <img src={value} alt="รูปภาพที่แนบ" />
          </div>
          <button type="button" onClick={() => onChange(null)} className="btn-danger" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            ลบรูปภาพ
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: "100%", background: "#fdf0e2", color: "#7a4a1e", padding: "24px 12px" }}>
          ถ่ายรูปหรือแนบรูป
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={hiddenInputStyle} />
    </div>
  )
}
