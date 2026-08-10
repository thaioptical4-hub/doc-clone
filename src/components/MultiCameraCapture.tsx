"use client"

import { useRef } from "react"
import { compressImage } from "@/lib/image"

const MAX_PHOTOS = 5

interface MultiCameraCaptureProps {
  value: string[]
  onChange: (photos: string[]) => void
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

function readAndCompress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"))
    reader.onload = () => compressImage(reader.result as string, resolve)
    reader.readAsDataURL(file)
  })
}

export default function MultiCameraCapture({ value, onChange }: MultiCameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const remaining = MAX_PHOTOS - value.length
    const files = Array.from(e.target.files ?? []).slice(0, remaining)
    e.target.value = ""
    if (files.length === 0) return

    const compressed = await Promise.all(files.map(readAndCompress))
    onChange([...value, ...compressed].slice(0, MAX_PHOTOS))
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="photo-grid">
          {value.map((photo, i) => (
            <div key={`${photo.slice(-24)}-${i}`} className="photo-grid-item">
              <img src={photo} alt={`รูปที่ ${i + 1}`} />
              <button type="button" onClick={() => handleRemove(i)} className="photo-grid-remove" title="ลบรูปนี้" aria-label={`ลบรูปที่ ${i + 1}`}>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < MAX_PHOTOS && (
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: "100%", background: "#fdf0e2", color: "#7a4a1e", padding: value.length > 0 ? 16 : 24 }}>
          ถ่ายรูปหรือแนบรูป ({value.length}/{MAX_PHOTOS})
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={hiddenInputStyle} />
    </div>
  )
}
