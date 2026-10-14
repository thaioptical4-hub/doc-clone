"use client"

import { PhotoPicker } from "./PhotoPicker"

const MAX_PHOTOS = 5

interface MultiCameraCaptureProps {
  value: string[]
  onChange: (photos: string[]) => void
}

export default function MultiCameraCapture({ value, onChange }: MultiCameraCaptureProps) {
  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  const remaining = MAX_PHOTOS - value.length

  return (
    <div>
      {value.length > 0 && (
        <div className="photo-grid">
          {value.map((photo, i) => (
            <div key={i} className="photo-grid-item">
              <img src={photo} alt={`รูปที่ ${i + 1}`} />
              <button type="button" onClick={() => handleRemove(i)} className="photo-grid-remove" aria-label={`ลบรูปที่ ${i + 1}`}>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 ? (
        <PhotoPicker
          remaining={remaining}
          compact={value.length > 0}
          takeLabel={value.length > 0 ? `ถ่ายเพิ่ม (${value.length}/${MAX_PHOTOS})` : "ถ่ายรูป"}
          onPicked={(photos) => onChange([...value, ...photos].slice(0, MAX_PHOTOS))}
        />
      ) : (
        <p className="muted">ครบ {MAX_PHOTOS} รูปแล้ว</p>
      )}
    </div>
  )
}
