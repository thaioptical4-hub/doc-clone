import { NextResponse } from "next/server"
import { deleteDocuments } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 })
    }
    await deleteDocuments(ids.map(Number))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/documents/batch-delete error:", error)
    return NextResponse.json({ error: "Failed to delete documents" }, { status: 500 })
  }
}
