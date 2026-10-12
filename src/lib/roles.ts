import { verifyPassword } from "./password"

export type Role = "admin" | "staff"

type RoleEnv = Record<string, string | undefined> & {
  APP_USER?: string
  APP_PASS?: string
  ADMIN_USER?: string
  ADMIN_PASS?: string
}

/** Admin account saved from the in-app settings page (password stored as a hash only). */
export interface StoredAdmin {
  username: string
  passwordHash: string
}

/** Admin set through Vercel environment variables (takes priority over the settings page). */
export function envAdminConfigured(env: RoleEnv = process.env): boolean {
  return !!env.ADMIN_USER && !!env.ADMIN_PASS
}

export function adminConfigured(stored: StoredAdmin | null, env: RoleEnv = process.env): boolean {
  return envAdminConfigured(env) || !!stored
}

/**
 * Role for a signed-in username, decided on every request (not frozen into the session), so
 * creating an admin turns the shared iPad login into staff without anyone logging in again.
 * Until an admin exists, the single shared login keeps full access as before.
 */
export function roleFor(username: string | null | undefined, stored: StoredAdmin | null, env: RoleEnv = process.env): Role {
  if (envAdminConfigured(env)) return username && username === env.ADMIN_USER ? "admin" : "staff"
  if (stored) return username && username === stored.username ? "admin" : "staff"
  return "admin"
}

/** Checks a login attempt; returns the username that signed in, or null. */
export async function checkCredentials(
  username: unknown,
  password: unknown,
  stored: StoredAdmin | null,
  env: RoleEnv = process.env,
): Promise<string | null> {
  if (typeof username !== "string" || typeof password !== "string" || !username || !password) return null
  if (envAdminConfigured(env)) {
    if (username === env.ADMIN_USER && password === env.ADMIN_PASS) return username
  } else if (stored && username === stored.username && (await verifyPassword(password, stored.passwordHash))) {
    return username
  }
  if (env.APP_USER && env.APP_PASS && username === env.APP_USER && password === env.APP_PASS) return username
  return null
}

/** Rules for a new admin account set from the settings page. Returns a Thai error, or null if fine. */
export function validateNewAdmin(username: string, password: string, confirm: string, env: RoleEnv = process.env): string | null {
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) return "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ . _ - ยาว 3–40 ตัว"
  if (username === env.APP_USER) return "ชื่อผู้ใช้ Admin ต้องไม่ซ้ำกับชื่อผู้ใช้ของ iPad"
  if (password.length < 8) return "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว"
  if (password === env.APP_PASS) return "รหัสผ่าน Admin ต้องไม่ซ้ำกับรหัสของ iPad"
  if (password !== confirm) return "ยืนยันรหัสผ่านไม่ตรงกัน"
  return null
}

/** Pages and API calls only an admin may use. */
export function isAdminOnly(pathname: string, method: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true
  if (pathname === "/history" || pathname.startsWith("/history/")) return true
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true
  if (pathname.startsWith("/api/stats") || pathname.startsWith("/api/history") || pathname.startsWith("/api/attachments")) return true
  if (pathname.startsWith("/api/settings")) return true
  if (pathname.startsWith("/api/documents/batch-delete")) return true
  if (pathname.startsWith("/api/documents/") && method === "DELETE") return true
  return false
}
