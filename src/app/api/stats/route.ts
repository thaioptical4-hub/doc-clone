import { NextResponse } from "next/server"
import { getDocumentsSince, getPendingDocuments } from "@/lib/db"
import { computeDashboard, periodRange, type Period } from "@/lib/stats"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get("period")
    const period: Period = raw === "week" || raw === "month" ? raw : "today"
    const now = new Date()
    const { prevStart } = periodRange(period, now)
    const [docs, pending] = await Promise.all([getDocumentsSince(prevStart), getPendingDocuments()])
    return NextResponse.json(computeDashboard(docs, pending, period, now))
  } catch (error) {
    console.error("GET /api/stats error:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
