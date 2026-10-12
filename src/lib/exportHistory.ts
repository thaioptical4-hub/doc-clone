import { departmentLabel } from "./departments"
import type { HistoryRow } from "./types"

/** Helpers for the history page's downloads. Runs in the browser so large files never hit server response limits. */

export type Progress = (done: number, total: number) => void

export const docNo = (id: number) => `DOC-${String(id).padStart(6, "0")}`

export function thaiDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function thaiTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" })
}

export function photosOf(row: HistoryRow) {
  return {
    before: row.attachments.filter((a) => a.kind === "photo_sender"),
    after: row.attachments.filter((a) => a.kind === "photo_recipient"),
    signature: row.attachments.filter((a) => a.kind === "signature_recipient"),
    senderSignature: row.attachments.filter((a) => a.kind === "signature_sender"),
  }
}

export const attachmentUrl = (id: number) => `/api/attachments/${id}`

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let i = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++]
      await worker(item)
    }
  })
  await Promise.all(runners)
}

/** Downloads an attachment and shrinks it so a month of rows still makes a manageable Excel file. */
async function thumbnail(id: number, maxW: number, maxH: number, png: boolean): Promise<{ dataUrl: string; w: number; h: number } | null> {
  const res = await fetch(attachmentUrl(id))
  if (!res.ok) return null
  const bitmap = await createImageBitmap(await res.blob())
  const scale = Math.min(1, (maxW * 2) / bitmap.width, (maxH * 2) / bitmap.height) // 2x for sharp display
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const fit = Math.min(maxW / canvas.width, maxH / canvas.height)
  return {
    dataUrl: canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.8),
    w: Math.round(canvas.width * fit),
    h: Math.round(canvas.height * fit),
  }
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const NAVY = "FF0B1B33"
const COLS = [
  { header: "เลขที่", width: 14 },
  { header: "วันที่ส่ง", width: 18 },
  { header: "ประเภทเอกสาร", width: 16 },
  { header: "คำอธิบาย", width: 20 },
  { header: "หน่วยงานผู้ส่ง", width: 18 },
  { header: "ผู้ส่ง", width: 16 },
  { header: "หน่วยงานผู้รับ", width: 18 },
  { header: "ผู้รับ", width: 16 },
  { header: "รูปก่อนส่ง", width: 22 },
  { header: "ลายเซ็นผู้ส่ง", width: 22 },
  { header: "เวลารับ", width: 10 },
  { header: "รูปหลังส่ง", width: 22 },
  { header: "ลายเซ็นผู้รับ", width: 22 },
  { header: "สถานะ", width: 12 },
]
const IMG_COL = { before: 9, senderSignature: 10, after: 12, signature: 13 } // 1-based
const ROW_H_PT = 84
const HEADER_ROW = 4

export type ImageLoader = typeof thumbnail

export async function exportExcel(rows: HistoryRow[], rangeLabel: string, onProgress: Progress, loadImage: ImageLoader = thumbnail) {
  const ExcelJS = (await import("exceljs")).default
  const wb = new ExcelJS.Workbook()
  wb.creator = "Doc Delivery"
  wb.created = new Date()
  const ws = wb.addWorksheet("รายการส่งเอกสาร", {
    views: [{ state: "frozen", ySplit: HEADER_ROW, xSplit: 1 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}` },
    headerFooter: { oddFooter: "หน้า &P / &N" },
  })
  const font = { name: "Tahoma", size: 10 }
  const thin = { style: "thin" as const, color: { argb: "FFDCE4EF" } }
  const border = { top: thin, left: thin, bottom: thin, right: thin }

  ws.columns = COLS.map((c) => ({ width: c.width }))
  ws.mergeCells(1, 1, 1, COLS.length)
  ws.getCell(1, 1).value = "รายงานการส่งเอกสาร (Doc Delivery)"
  ws.getCell(1, 1).font = { name: "Tahoma", size: 16, bold: true, color: { argb: NAVY } }
  ws.getRow(1).height = 28
  ws.mergeCells(2, 1, 2, COLS.length)
  ws.getCell(2, 1).value = `${rangeLabel} · ${rows.length.toLocaleString("th-TH")} รายการ · ดาวน์โหลดเมื่อ ${thaiDateTime(new Date().toISOString())}`
  ws.getCell(2, 1).font = { ...font, color: { argb: "FF56657B" } }

  const header = ws.getRow(HEADER_ROW)
  COLS.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c.header
    cell.font = { ...font, bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = border
  })
  header.height = 26

  // Embed images: collect jobs first so progress is accurate.
  type Job = { id: number; row: number; col: number; png: boolean }
  const jobs: Job[] = []
  rows.forEach((r, i) => {
    const rowNum = HEADER_ROW + 1 + i
    const p = photosOf(r)
    if (p.before[0]) jobs.push({ id: p.before[0].id, row: rowNum, col: IMG_COL.before, png: false })
    if (p.senderSignature[0]) jobs.push({ id: p.senderSignature[0].id, row: rowNum, col: IMG_COL.senderSignature, png: true })
    if (p.after[0]) jobs.push({ id: p.after[0].id, row: rowNum, col: IMG_COL.after, png: false })
    if (p.signature[0]) jobs.push({ id: p.signature[0].id, row: rowNum, col: IMG_COL.signature, png: true })
  })

  rows.forEach((r, i) => {
    const rowNum = HEADER_ROW + 1 + i
    const confirmed = r.status === "confirmed"
    const p = photosOf(r)
    const values = [
      docNo(r.id),
      thaiDateTime(r.created_at),
      r.doc_type,
      r.description ?? "",
      departmentLabel(r.sender_department),
      r.sender_name,
      departmentLabel(r.recipient_department),
      r.recipient_name,
      p.before.length ? "" : "—",
      p.senderSignature.length ? "" : "—",
      confirmed ? thaiTime(r.updated_at) : "—",
      p.after.length ? "" : "—",
      p.signature.length ? "" : "—",
      confirmed ? "รับแล้ว" : "รอรับ",
    ]
    const row = ws.getRow(rowNum)
    values.forEach((v, c) => {
      const cell = row.getCell(c + 1)
      cell.value = v
      cell.font = font
      cell.border = border
      const centered = [2, 9, 10, 11, 12, 13, 14].includes(c + 1)
      cell.alignment = { vertical: "middle", horizontal: centered ? "center" : "left", wrapText: true }
    })
    row.getCell(1).font = { name: "Consolas", size: 10, bold: true, color: { argb: "FF10458E" } }
    const st = row.getCell(14)
    st.font = { ...font, bold: true, color: { argb: confirmed ? "FF15803D" : "FFC2410C" } }
    st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: confirmed ? "FFE8F5EC" : "FFFDF0E8" } }
    row.height = ROW_H_PT
  })

  let done = 0
  onProgress(0, jobs.length)
  await runPool(jobs, 6, async (job) => {
    const maxW = job.png ? 150 : 140
    const maxH = job.png ? 56 : 96
    const img = await loadImage(job.id, maxW, maxH, job.png).catch(() => null)
    if (img) {
      const imageId = wb.addImage({ base64: img.dataUrl, extension: job.png ? "png" : "jpeg" })
      const colPx = (COLS[job.col - 1].width ?? 10) * 7 + 5
      const rowPx = (ROW_H_PT * 96) / 72
      ws.addImage(imageId, {
        tl: { col: job.col - 1 + Math.max(0, (colPx - img.w) / 2) / colPx, row: job.row - 1 + Math.max(0, (rowPx - img.h) / 2) / rowPx },
        ext: { width: img.w, height: img.h },
        editAs: "oneCell",
      } as Parameters<typeof ws.addImage>[1])
    }
    onProgress(++done, jobs.length)
  })

  ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW + rows.length, column: COLS.length } }

  // Summary by sender department
  const sum = wb.addWorksheet("สรุปตามหน่วยงาน")
  sum.columns = [{ width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }]
  sum.getCell("A1").value = "สรุปจำนวนเอกสารตามหน่วยงานผู้ส่ง"
  sum.getCell("A1").font = { name: "Tahoma", size: 14, bold: true, color: { argb: NAVY } }
  sum.getCell("A2").value = rangeLabel
  sum.getCell("A2").font = { ...font, color: { argb: "FF56657B" } }
  const heads = ["หน่วยงานผู้ส่ง", "ทั้งหมด", "รับแล้ว", "รอรับ"]
  heads.forEach((h, i) => {
    const cell = sum.getCell(4, i + 1)
    cell.value = h
    cell.font = { ...font, bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
    cell.alignment = { horizontal: "center" }
    cell.border = border
  })
  const last = HEADER_ROW + rows.length
  const fromRange = `'รายการส่งเอกสาร'!$E$${HEADER_ROW + 1}:$E$${Math.max(last, HEADER_ROW + 1)}`
  const statusRange = `'รายการส่งเอกสาร'!$N$${HEADER_ROW + 1}:$N$${Math.max(last, HEADER_ROW + 1)}`
  const depts = Array.from(new Set(rows.map((r) => departmentLabel(r.sender_department)))).sort((a, b) => a.localeCompare(b, "th"))
  depts.forEach((d, i) => {
    const r = 5 + i
    const count = rows.filter((x) => departmentLabel(x.sender_department) === d).length
    const confirmed = rows.filter((x) => departmentLabel(x.sender_department) === d && x.status === "confirmed").length
    sum.getCell(r, 1).value = d
    sum.getCell(r, 2).value = { formula: `COUNTIF(${fromRange},A${r})`, result: count }
    sum.getCell(r, 3).value = { formula: `COUNTIFS(${fromRange},A${r},${statusRange},"รับแล้ว")`, result: confirmed }
    sum.getCell(r, 4).value = { formula: `B${r}-C${r}`, result: count - confirmed }
  })
  const totalRow = 5 + depts.length
  sum.getCell(totalRow, 1).value = "รวม"
  ;["B", "C", "D"].forEach((L, i) => {
    const result = i === 0 ? rows.length : i === 1 ? rows.filter((x) => x.status === "confirmed").length : rows.filter((x) => x.status !== "confirmed").length
    sum.getCell(`${L}${totalRow}`).value = { formula: `SUM(${L}5:${L}${totalRow - 1})`, result }
  })
  for (let r = 5; r <= totalRow; r++) {
    for (let c = 1; c <= 4; c++) {
      const cell = sum.getCell(r, c)
      cell.font = { ...font, bold: r === totalRow }
      cell.border = border
      cell.alignment = { horizontal: c === 1 ? "left" : "center" }
      if (r === totalRow) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF4FC" } }
    }
  }
  wb.calcProperties.fullCalcOnLoad = true

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

export async function exportZip(rows: HistoryRow[], onProgress: Progress) {
  const JSZip = (await import("jszip")).default
  const zip = new JSZip()
  type Job = { id: number; name: string }
  const jobs: Job[] = []
  for (const r of rows) {
    const p = photosOf(r)
    const folder = `${docNo(r.id)}_${r.doc_type}`.replace(/[\\/:*?"<>|]/g, "-")
    p.before.forEach((a, i) => jobs.push({ id: a.id, name: `${folder}/${docNo(r.id)}_ก่อนส่ง_${i + 1}` }))
    p.after.forEach((a, i) => jobs.push({ id: a.id, name: `${folder}/${docNo(r.id)}_หลังส่ง_${i + 1}` }))
    p.signature.forEach((a) => jobs.push({ id: a.id, name: `${folder}/${docNo(r.id)}_ลายเซ็นผู้รับ` }))
    p.senderSignature.forEach((a) => jobs.push({ id: a.id, name: `${folder}/${docNo(r.id)}_ลายเซ็นผู้ส่ง` }))
  }
  let done = 0
  onProgress(0, jobs.length)
  await runPool(jobs, 6, async (job) => {
    const res = await fetch(attachmentUrl(job.id))
    if (res.ok) {
      const blob = await res.blob()
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"
      zip.file(`${job.name}.${ext}`, blob)
    }
    onProgress(++done, jobs.length)
  })
  return zip.generateAsync({ type: "blob" })
}
