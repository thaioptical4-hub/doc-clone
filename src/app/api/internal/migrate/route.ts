import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

const MIGRATION_TOKEN = "0dca645b0d80bf17d07152b9cb8be41a0951ef11dfdceadb"

export async function POST(request: Request) {
  if (request.headers.get("x-migration-token") !== MIGRATION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS sheet_row INTEGER`
  return NextResponse.json({ success: true })
}
