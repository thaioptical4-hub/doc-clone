"use client"

import { useRef } from "react"

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
          <button type="button" onClick={handleClear} className="btn-danger" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            ลบรูปภาพ
          </button>
        </div>
      ) : (
        <button type="button" onClick={handleCapture} style={{ background: "#e7f0fb", color: "#33455c", width: "100%", padding: "40px" }}>
          ถ่ายรูป
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

function compressImage(dataUrl: string, callback: (compressed: string) => void) {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement("canvas")
    const maxW = 800
    const maxH = 600
    let w = img.width
    let h = img.height

    if (w > maxW) {
      h = (h * maxW) / w
      w = maxW
    }
    if (h > maxH) {
      w = (w * maxH) / h
      h = maxH
    }

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0, w, h)
    callback(canvas.toDataURL("image/jpeg", 0.7))
  }
  img.src = dataUrl
}
