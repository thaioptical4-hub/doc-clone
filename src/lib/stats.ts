import { departmentLabel } from "./departments"
import type { Document } from "./types"

/** A document still waiting this many minutes after being sent counts as overdue. */
export const OVERDUE_MINUTES = 60

export type Period = "today" | "week" | "month"

export const PERIOD_LABEL: Record<Period, string> = {
  today: "วันนี้",
  week: "7 วันล่าสุด",
  month: "เดือนนี้",
}

const PREV_LABEL: Record<Period, string> = {
  today: "เมื่อวาน",
  week: "7 วันก่อนหน้า",
  month: "ช่วงเดียวกันเดือนก่อน",
}

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000 // Asia/Bangkok has no daylight saving
const DAY_MS = 24 * 60 * 60 * 1000
const TH_WEEKDAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

/** Wall-clock parts in Bangkok for an instant. */
export function bangkokParts(date: Date) {
  const shifted = new Date(date.getTime() + BKK_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    weekday: shifted.getUTCDay(),
  }
}

/** The instant of Bangkok midnight for the given Bangkok calendar date. */
export function bangkokMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - BKK_OFFSET_MS)
}

export function periodRange(period: Period, now: Date) {
  const p = bangkokParts(now)
  const todayStart = bangkokMidnight(p.year, p.month, p.day)
  if (period === "today") {
    return { start: todayStart, prevStart: new Date(todayStart.getTime() - DAY_MS), prevEnd: new Date(now.getTime() - DAY_MS) }
  }
  if (period === "week") {
    const start = new Date(todayStart.getTime() - 6 * DAY_MS)
    return { start, prevStart: new Date(start.getTime() - 7 * DAY_MS), prevEnd: new Date(now.getTime() - 7 * DAY_MS) }
  }
  const start = bangkokMidnight(p.year, p.month, 1)
  const prevStart = bangkokMidnight(p.year, p.month - 1, 1)
  const elapsed = now.getTime() - start.getTime()
  const prevEnd = new Date(Math.min(prevStart.getTime() + elapsed, start.getTime()))
  return { start, prevStart, prevEnd }
}

export function thaiShortDate(date: Date): string {
  const p = bangkokParts(date)
  return `${p.day} ${TH_MONTH[p.month]} ${String((p.year + 543) % 100).padStart(2, "0")}`
}

export function minutesBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - new Date(fromIso).getTime()) / 60000))
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} นาที`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h < 24) return m ? `${h} ชม. ${m} นาที` : `${h} ชม.`
  const d = Math.floor(h / 24)
  return `${d} วัน ${h % 24} ชม.`
}

export interface DashboardData {
  period: Period
  periodLabel: string
  prevLabel: string
  generatedAt: string
  total: number
  confirmed: number
  pending: number
  confirmRate: number | null
  avgMinutes: number | null
  prevTotal: number
  deltaPct: number | null
  overdueCount: number
  pendingAllCount: number
  byDepartment: { name: string; count: number; confirmed: number }[]
  routes: { from: string; to: string; count: number }[]
  trend: { label: string; count: number }[]
  trendTitle: string
  peakLabel: string | null
  waiting: {
    id: number
    doc_type: string
    sender_name: string
    recipient_name: string
    sender_department: string
    recipient_department: string
    minutes: number
    overdue: boolean
  }[]
  summary: string
  chips: string[]
}

/**
 * Builds every number the dashboard shows from plain rows, so it can be tested without a database.
 * `docs` must include everything created since the previous comparison window (periodRange().prevStart).
 */
export function computeDashboard(docs: Document[], pendingAll: Document[], period: Period, now: Date): DashboardData {
  const { start, prevStart, prevEnd } = periodRange(period, now)
  const inPeriod = docs.filter((d) => new Date(d.created_at) >= start && new Date(d.created_at) <= now)
  const prevTotal = docs.filter((d) => {
    const t = new Date(d.created_at)
    return t >= prevStart && t < prevEnd
  }).length

  const confirmedDocs = inPeriod.filter((d) => d.status === "confirmed")
  const total = inPeriod.length
  const confirmed = confirmedDocs.length
  const pending = total - confirmed
  const durations = confirmedDocs.map((d) => minutesBetween(d.created_at, new Date(d.updated_at)))
  const avgMinutes = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null
  const confirmRate = total ? Math.round((confirmed / total) * 1000) / 10 : null
  const deltaPct = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : null

  const deptMap = new Map<string, { count: number; confirmed: number }>()
  const routeMap = new Map<string, number>()
  for (const d of inPeriod) {
    const from = departmentLabel(d.sender_department)
    const to = departmentLabel(d.recipient_department)
    const entry = deptMap.get(from) || { count: 0, confirmed: 0 }
    entry.count++
    if (d.status === "confirmed") entry.confirmed++
    deptMap.set(from, entry)
    const key = `${from}\u0000${to}`
    routeMap.set(key, (routeMap.get(key) || 0) + 1)
  }
  const byDepartment = Array.from(deptMap, ([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"))
  const routes = Array.from(routeMap, ([k, count]) => {
    const [from, to] = k.split("\u0000")
    return { from, to, count }
  })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Trend buckets
  let trend: { label: string; count: number }[] = []
  let trendTitle = ""
  if (period === "today") {
    trendTitle = "เอกสารรายชั่วโมง"
    const hours = inPeriod.map((d) => bangkokParts(new Date(d.created_at)).hour)
    const first = Math.min(8, ...hours)
    const last = Math.max(17, ...hours)
    for (let h = first; h <= last; h++) {
      trend.push({ label: `${String(h).padStart(2, "0")}:00`, count: hours.filter((x) => x === h).length })
    }
  } else {
    trendTitle = "เอกสารรายวัน"
    const days = Math.round((bangkokMidnightOf(now).getTime() - start.getTime()) / DAY_MS) + 1
    trend = Array.from({ length: days }, (_, i) => {
      const dayStart = new Date(start.getTime() + i * DAY_MS)
      const p = bangkokParts(dayStart)
      const label = period === "week" ? `${TH_WEEKDAY[p.weekday]} ${p.day}` : String(p.day)
      const dayEnd = dayStart.getTime() + DAY_MS
      const count = inPeriod.filter((d) => {
        const t = new Date(d.created_at).getTime()
        return t >= dayStart.getTime() && t < dayEnd
      }).length
      return { label, count }
    })
  }
  const peak = trend.reduce<{ label: string; count: number } | null>((best, t) => (t.count > (best?.count ?? 0) ? t : best), null)
  const peakLabel = peak ? (period === "today" ? `${peak.label}–${String(Number(peak.label.slice(0, 2)) + 1).padStart(2, "0")}:00 น.` : peak.label) : null

  const waiting = pendingAll
    .map((d) => {
      const minutes = minutesBetween(d.created_at, now)
      return {
        id: d.id,
        doc_type: d.doc_type,
        sender_name: d.sender_name,
        recipient_name: d.recipient_name,
        sender_department: departmentLabel(d.sender_department),
        recipient_department: departmentLabel(d.recipient_department),
        minutes,
        overdue: minutes > OVERDUE_MINUTES,
      }
    })
    .sort((a, b) => b.minutes - a.minutes)
  const overdueCount = waiting.filter((w) => w.overdue).length

  const label = PERIOD_LABEL[period]
  const parts: string[] = []
  const chips: string[] = []
  if (total === 0) {
    parts.push(`${label}ยังไม่มีการส่งเอกสาร`)
  } else {
    parts.push(`${label}มีเอกสาร ${total.toLocaleString("th-TH")} ฉบับ รับแล้ว ${confirmed.toLocaleString("th-TH")} ฉบับ (${confirmRate}%)`)
    if (byDepartment[0]) {
      parts.push(`${byDepartment[0].name}ส่งมากที่สุด ${byDepartment[0].count} ฉบับ`)
      chips.push(`${byDepartment[0].name} ${byDepartment[0].count} ฉบับ`)
    }
    if (peak && peak.count > 0) {
      parts.push(period === "today" ? `ช่วงที่ยุ่งที่สุดคือ ${peakLabel}` : `วันที่มีเอกสารมากที่สุดคือวันที่ ${peak.label} (${peak.count} ฉบับ)`)
      chips.push(period === "today" ? `ช่วงพีค ${peakLabel}` : `วันพีค: ${peak.label}`)
    }
    if (avgMinutes !== null) {
      parts.push(`ใช้เวลาเฉลี่ย ${formatDuration(avgMinutes)} ต่อฉบับ`)
      chips.push(`เฉลี่ย ${formatDuration(avgMinutes)}/ฉบับ`)
    }
  }
  if (overdueCount > 0) {
    parts.push(`ตอนนี้มี ${overdueCount} ฉบับที่รอรับเกิน ${OVERDUE_MINUTES} นาที ควรติดตาม`)
    chips.push(`รอรับเกินเวลา ${overdueCount} ฉบับ`)
  } else if (total > 0) {
    chips.push("ไม่มีเอกสารค้างเกินเวลา")
  }

  return {
    period,
    periodLabel: label,
    prevLabel: PREV_LABEL[period],
    generatedAt: now.toISOString(),
    total,
    confirmed,
    pending,
    confirmRate,
    avgMinutes,
    prevTotal,
    deltaPct,
    overdueCount,
    pendingAllCount: waiting.length,
    byDepartment,
    routes,
    trend,
    trendTitle,
    peakLabel,
    waiting: waiting.slice(0, 20),
    summary: parts.join(" · "),
    chips,
  }
}

function bangkokMidnightOf(date: Date): Date {
  const p = bangkokParts(date)
  return bangkokMidnight(p.year, p.month, p.day)
}
