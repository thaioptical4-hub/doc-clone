import { describe, expect, it } from "vitest"
import ExcelJS from "exceljs"
import { exportExcel, docNo, photosOf } from "./exportHistory"
import type { HistoryRow } from "./types"

// 1x1 white PNG / JPEG-labelled stand-ins for real photos
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="

function row(id: number, confirmed: boolean, dept: string | null): HistoryRow {
  const attachments: HistoryRow["attachments"] = [{ id: id * 10 + 1, kind: "photo_sender" }, { id: id * 10 + 4, kind: "signature_sender" }]
  if (confirmed) {
    attachments.push({ id: id * 10 + 2, kind: "photo_recipient" }, { id: id * 10 + 3, kind: "signature_recipient" })
  }
  return {
    id,
    doc_type: "เอกสารภายใน",
    sender_name: "สมชาย",
    recipient_name: "พรทิพย์",
    sender_department: dept,
    recipient_department: "ฝ่ายบัญชี-การเงิน",
    description: null,
    status: confirmed ? "confirmed" : "sent",
    created_at: "2026-10-12T06:58:00Z",
    updated_at: "2026-10-12T07:33:00Z",
    sheet_row: null,
    attachments,
  }
}

describe("exportExcel", () => {
  it("writes one row per document with embedded images and a department summary", async () => {
    const rows = [row(1, true, "ฝ่ายจัดซื้อ"), row(2, true, "ฝ่ายจัดซื้อ"), row(3, false, null)]
    const loaded: number[] = []
    const progress: [number, number][] = []
    const blob = await exportExcel(rows, "วันที่ 12 ต.ค. 2569", (d, t) => progress.push([d, t]), async (id) => {
      loaded.push(id)
      return { dataUrl: PNG, w: 100, h: 60 }
    })

    // 2 confirmed rows x 4 images + 1 pending row x 2 images (before photo + sender signature)
    expect(loaded.sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 21, 22, 23, 24, 31, 34])
    expect(progress.at(-1)).toEqual([10, 10])

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await blob.arrayBuffer())
    const ws = wb.getWorksheet("รายการส่งเอกสาร")!
    expect(ws.getCell("A5").value).toBe(docNo(1))
    expect(ws.getCell("E7").value).toBe("ไม่ระบุ")
    expect(ws.getCell("J4").value).toBe("ลายเซ็นผู้ส่ง")
    expect(ws.getCell("N5").value).toBe("รับแล้ว")
    expect(ws.getCell("N7").value).toBe("รอรับ")
    expect(ws.getImages()).toHaveLength(10)

    const sum = wb.getWorksheet("สรุปตามหน่วยงาน")!
    const values = [5, 6, 7].map((r) => [sum.getCell(r, 1).value, (sum.getCell(r, 2).value as { result: number }).result])
    expect(values).toContainEqual(["ฝ่ายจัดซื้อ", 2])
    expect(values).toContainEqual(["ไม่ระบุ", 1])
    expect((sum.getCell("B7").value as { formula: string }).formula).toBe("SUM(B5:B6)")
    expect((sum.getCell("C5").value as { formula: string }).formula).toContain("$N$5:$N$7")
  })

  it("splits attachments into before / after / signature", () => {
    const p = photosOf(row(4, true, "ฝ่ายขาย"))
    expect(p.before.map((a) => a.id)).toEqual([41])
    expect(p.after.map((a) => a.id)).toEqual([42])
    expect(p.signature.map((a) => a.id)).toEqual([43])
    expect(p.senderSignature.map((a) => a.id)).toEqual([44])
  })
})
