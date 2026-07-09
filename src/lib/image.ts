export function compressImage(dataUrl: string, callback: (compressed: string) => void) {
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
