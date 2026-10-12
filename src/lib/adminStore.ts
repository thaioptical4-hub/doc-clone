import { sql } from "./db"
import { hashPassword } from "./password"
import type { StoredAdmin } from "./roles"

/**
 * The admin account created from the settings page, kept in an `app_settings` table.
 * Read on every request (middleware), so it's cached briefly per server instance.
 */
const CACHE_MS = 30_000
let cache: { value: StoredAdmin | null; at: number } | null = null

export async function getStoredAdmin(): Promise<StoredAdmin | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
  let value: StoredAdmin | null = null
  try {
    const rows = (await sql`
      SELECT key, value FROM app_settings WHERE key IN ('admin_user', 'admin_pass_hash')
    `) as { key: string; value: string }[]
    const user = rows.find((r) => r.key === "admin_user")?.value
    const hash = rows.find((r) => r.key === "admin_pass_hash")?.value
    value = user && hash ? { username: user, passwordHash: hash } : null
  } catch (error) {
    // Table not created yet means no admin has been set up.
    if (!(error instanceof Error && /app_settings/.test(error.message) && /does not exist/.test(error.message))) {
      throw error
    }
  }
  cache = { value, at: Date.now() }
  return value
}

export async function saveStoredAdmin(username: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password)
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    INSERT INTO app_settings (key, value, updated_at) VALUES
      ('admin_user', ${username}, NOW()),
      ('admin_pass_hash', ${passwordHash}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `
  cache = null
}
