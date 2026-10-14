"use client"

import { PhotoPicker } from "./PhotoPicker"

interface CameraCaptureProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
}

export default function CameraCapture({ value, onChange }: CameraCaptureProps) {
  return (
    <div>
      {value ? (
        <div>
          <div className="camera-area">
            <img src={value} alt="รูปที่แนบ" />
          </div>
          <button type="button" onClick={() => onChange(null)} className="btn-outline">
            เปลี่ยนรูป
          </button>
        </div>
      ) : (
        <PhotoPicker onPicked={(photos) => onChange(photos[0] ?? null)} />
      )}
    </div>
  )
}
