"use client"

import { useRef } from "react"
import { compressImage } from "@/lib/image"

const hidden: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  border: 0,
}

function readCompressed(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => compressImage(reader.result as string, resolve)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface PhotoPickerProps {
  /** Called with compressed JPEG data URLs, in the order picked. */
  onPicked: (photos: string[]) => void
  /** How many photos may still be added; >1 lets the library picker select several at once. */
  remaining?: number
  compact?: boolean
  takeLabel?: string
}

/** Two buttons: open the camera directly, or choose existing photos from the device's library. */
export function PhotoPicker({ onPicked, remaining = 1, compact = false, takeLabel = "ถ่ายรูป" }: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(1, remaining))
    e.target.value = ""
    if (!files.length) return
    const photos = await Promise.all(files.map(readCompressed))
    onPicked(photos)
  }

  return (
    <div className={compact ? "photo-picker compact" : "photo-picker"}>
      <button type="button" className="capture-button" onClick={() => cameraRef.current?.click()}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
        {takeLabel}
      </button>
      <button type="button" className="capture-button secondary" onClick={() => libraryRef.current?.click()}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
        เลือกจากคลังรูป
      </button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handle} style={hidden} tabIndex={-1} aria-hidden="true" />
      <input ref={libraryRef} type="file" accept="image/*" multiple={remaining > 1} onChange={handle} style={hidden} tabIndex={-1} aria-hidden="true" />
    </div>
  )
}
