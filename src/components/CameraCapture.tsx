"use client"

import { useRef } from "react"
import { compressImage } from "@/lib/image"

interface CameraCaptureProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
}

export default function CameraCapture({ value, onChange }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleCapture() {
    inputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      compressImage(reader.result as string, (compressed) => {
        onChange(compressed)
      })
    }
    reader.readAsDataURL(file)
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = ""
    onChange(null)
  }

  return (
    <div>
      {value ? (
        <div>
          <div className="camera-area">
            <img src={value} alt="Captured" />
          </div>
          <button type="button" onClick={handleClear} className="btn-outline">
            ถ่ายใหม่
          </button>
        </div>
      ) : (
        <button type="button" onClick={handleCapture} className="capture-button">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
          แตะเพื่อถ่ายรูป
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
