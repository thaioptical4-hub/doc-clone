"use client"

import { useRef, useEffect, useState, useCallback } from "react"

interface SignaturePadProps {
  value: string | null
  onChange: (svg: string | null) => void
}

export default function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  const getPos = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 2.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }

    resize()
    window.addEventListener("resize", resize)

    function start(e: PointerEvent) {
      e.preventDefault()
      const pos = getPos(e)
      ctx!.beginPath()
      ctx!.moveTo(pos.x, pos.y)
      lastPoint.current = pos
      setIsDrawing(true)
      canvas!.setPointerCapture(e.pointerId)
    }

    function move(e: PointerEvent) {
      if (!isDrawing) return
      e.preventDefault()
      const pos = getPos(e)
      if (lastPoint.current) {
        const prev = lastPoint.current
        const mid = { x: (prev.x + pos.x) / 2, y: (prev.y + pos.y) / 2 }
        ctx!.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y)
        ctx!.stroke()
        ctx!.beginPath()
        ctx!.moveTo(mid.x, mid.y)
      }
      lastPoint.current = pos
    }

    function end() {
      if (isDrawing) {
        setIsDrawing(false)
        lastPoint.current = null
        setHasContent(true)
        const svg = toSVG(canvas!)
        onChange(svg)
      }
    }

    canvas.addEventListener("pointerdown", start)
    canvas.addEventListener("pointermove", move)
    canvas.addEventListener("pointerup", end)
    canvas.addEventListener("pointerleave", end)

    return () => {
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("pointerdown", start)
      canvas.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerup", end)
      canvas.removeEventListener("pointerleave", end)
    }
  }, [isDrawing, getPos, onChange])

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasContent(false)
    onChange(null)
  }

  return (
    <div>
      <div className="signature-area">
        <canvas ref={canvasRef} />
      </div>
      {hasContent && (
        <button type="button" onClick={clear} className="btn-danger" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
          Clear Signature
        </button>
      )}
    </div>
  )
}

function toSVG(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width / window.devicePixelRatio}" height="${canvas.height / window.devicePixelRatio}"><image href="${dataUrl}" width="100%" height="100%"/></svg>`
}
