import { describe, expect, it } from "vitest"
import { computeDashboard, periodRange, bangkokParts, formatDuration, thaiShortDate } from "./stats"
import type { Document } from "./types"

// 2026-10-12 14:30 in Bangkok (UTC+7) = 07:30 UTC
const NOW = new Date("2026-10-12T07:30:00Z")

let nextId = 1
function doc(createdBkk: string, opts: Partial<Document> & { confirmedAfterMin?: number } = {}): Document {
  const created = new Date(`${createdBkk}+07:00`)
  const confirmed = opts.confirmedAfterMin !== undefined
  const updated = confirmed ? new Date(created.getTime() + opts.confirmedAfterMin! * 60000) : created
  return {
    id: nextId++,
    doc_type: "เอกสารภายใน",
    sender_name: "ก",
    recipient_name: "ข",
    sender_department: "ฝ่ายจัดซื้อ",
    recipient_department: "ฝ่ายบัญชี-การเงิน",
    description: null,
    status: confirmed ? "confirmed" : "sent",
    created_at: created.toISOString(),
    updated_at: updated.toISOString(),
    sheet_row: null,
    ...opts,
  }
}

describe("periodRange", () => {
  it("starts today at Bangkok midnight", () => {
    const { start } = periodRange("today", NOW)
    expect(start.toISOString()).toBe("2026-10-11T17:00:00.000Z")
  })

  it("covers the last 7 Bangkok days for week", () => {
    const { start, prevStart } = periodRange("week", NOW)
    expect(bangkokParts(start)).toMatchObject({ day: 6, hour: 0 })
    expect(bangkokParts(prevStart)).toMatchObject({ month: 8, day: 29 })
  })

  it("starts the month on the 1st and compares with the same span last month", () => {
    const { start, prevStart, prevEnd } = periodRange("month", NOW)
    expect(bangkokParts(start)).toMatchObject({ month: 9, day: 1, hour: 0 })
    expect(bangkokParts(prevStart)).toMatchObject({ month: 8, day: 1 })
    expect(bangkokParts(prevEnd)).toMatchObject({ month: 8, day: 12, hour: 14 })
  })
})

describe("computeDashboard", () => {
  const docs = [
    doc("2026-10-12T09:10:00", { confirmedAfterMin: 20 }),
    doc("2026-10-12T09:40:00", { confirmedAfterMin: 40 }),
    doc("2026-10-12T13:00:00", { sender_department: "ฝ่ายบุคคล (HR)" }), // waiting 90 min → overdue
    doc("2026-10-12T14:10:00", { sender_department: null }), // waiting 20 min, old-style row
    doc("2026-10-11T10:00:00", { confirmedAfterMin: 30 }), // yesterday
  ]
  const pending = docs.filter((d) => d.status === "sent")
  const data = computeDashboard(docs, pending, "today", NOW)

  it("counts only today's documents", () => {
    expect(data.total).toBe(4)
    expect(data.confirmed).toBe(2)
    expect(data.pending).toBe(2)
    expect(data.confirmRate).toBe(50)
  })

  it("averages receive time over confirmed documents", () => {
    expect(data.avgMinutes).toBe(30)
  })

  it("compares with yesterday up to the same time", () => {
    expect(data.prevTotal).toBe(1)
    expect(data.deltaPct).toBe(300)
  })

  it("groups by sender department and labels missing ones", () => {
    expect(data.byDepartment[0]).toEqual({ name: "ฝ่ายจัดซื้อ", count: 2, confirmed: 2 })
    expect(data.byDepartment.map((d) => d.name)).toContain("ไม่ระบุ")
  })

  it("flags waiting documents older than the threshold", () => {
    expect(data.overdueCount).toBe(1)
    expect(data.waiting[0]).toMatchObject({ minutes: 90, overdue: true })
    expect(data.waiting[1]).toMatchObject({ minutes: 20, overdue: false })
  })

  it("buckets today by hour and finds the peak", () => {
    expect(data.trend.find((t) => t.label === "09:00")?.count).toBe(2)
    expect(data.peakLabel).toBe("09:00–10:00 น.")
  })

  it("builds a Thai summary", () => {
    expect(data.summary).toContain("วันนี้มีเอกสาร 4 ฉบับ")
    expect(data.summary).toContain("รอรับเกิน 60 นาที")
  })

  it("handles an empty day", () => {
    const empty = computeDashboard([], [], "today", NOW)
    expect(empty.total).toBe(0)
    expect(empty.confirmRate).toBeNull()
    expect(empty.summary).toContain("ยังไม่มีการส่งเอกสาร")
  })

  it("has one bucket per day for week", () => {
    const week = computeDashboard(docs, pending, "week", NOW)
    expect(week.trend).toHaveLength(7)
    expect(week.trend[6]).toEqual({ label: "จ. 12", count: 4 })
    expect(week.total).toBe(5)
  })
})

describe("formatting", () => {
  it("formats durations in Thai", () => {
    expect(formatDuration(25)).toBe("25 นาที")
    expect(formatDuration(90)).toBe("1 ชม. 30 นาที")
    expect(formatDuration(60 * 26)).toBe("1 วัน 2 ชม.")
  })

  it("formats Buddhist-era short dates", () => {
    expect(thaiShortDate(NOW)).toBe("12 ต.ค. 69")
  })
})
