import { NextResponse } from "next/server"
import { getHistory } from "@/lib/db"
import { bangkokMidnight } from "@/lib/stats"
import type { DocStatus } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Parses YYYY-MM-DD as a Bangkok calendar day; returns that day's Bangkok midnight. */
function parseDay(value: string | null): Date | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (!m) return null
  return bangkokMidnight(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = parseDay(searchParams.get("from"))
    const toDay = parseDay(searchParams.get("to"))
    if (!from || !toDay) {
      return NextResponse.json({ error: "ต้องระบุช่วงวันที่ (from, to)" }, { status: 400 })
    }
    const to = new Date(toDay.getTime() + 24 * 60 * 60 * 1000) // inclusive end day
    const statusParam = searchParams.get("status")
    const status: DocStatus | null = statusParam === "sent" || statusParam === "confirmed" ? statusParam : null

    const rows = await getHistory({
      from,
      to,
      department: searchParams.get("dept"),
      status,
      q: searchParams.get("q")?.trim() || null,
    })
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET /api/history error:", error)
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 })
  }
}
