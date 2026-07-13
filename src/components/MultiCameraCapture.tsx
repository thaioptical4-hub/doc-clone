"use client"

import { useRef } from "react"
import { compressImage } from "@/lib/image"

const MAX_PHOTOS = 5

interface MultiCameraCaptureProps {
  value: string[]
  onChange: (photos: string[]) => void
}

export default function MultiCameraCapture({ value, onChange }: MultiCameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleCapture() {
    inputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ""
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      compressImage(reader.result as string, (compressed) => {
        onChange([...value, compressed].slice(0, MAX_PHOTOS))
      })
    }
    reader.readAsDataURL(file)
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="photo-grid">
          {value.map((photo, i) => (
            <div key={i} className="photo-grid-item">
              <img src={photo} alt={`รูปที่ ${i + 1}`} />
              <button type="button" onClick={() => handleRemove(i)} className="photo-grid-remove" title="ลบรูปนี้">
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < MAX_PHOTOS && (
        <button type="button" onClick={handleCapture} style={{ background: "#fdf0e2", color: "#7a4a1e", width: "100%", padding: value.length > 0 ? 16 : 40 }}>
          ถ่ายรูป ({value.length}/{MAX_PHOTOS})
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          border: 0,
        }}
      />
    </div>
  )
}
