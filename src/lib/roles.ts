export type Role = "admin" | "staff"

type RoleEnv = Record<string, string | undefined> & {
  APP_USER?: string
  APP_PASS?: string
  ADMIN_USER?: string
  ADMIN_PASS?: string
}

/** Admin only exists once both ADMIN_USER and ADMIN_PASS are set in the environment. */
export function adminConfigured(env: RoleEnv = process.env): boolean {
  return !!env.ADMIN_USER && !!env.ADMIN_PASS
}

/**
 * Role for a signed-in username. Decided on every request (not frozen into the session),
 * so adding ADMIN_USER/ADMIN_PASS in Vercel takes effect immediately for existing logins.
 * Until an admin account is configured, the single shared login keeps full access as before.
 */
export function roleFor(username: string | null | undefined, env: RoleEnv = process.env): Role {
  if (!adminConfigured(env)) return "admin"
  return username && username === env.ADMIN_USER ? "admin" : "staff"
}

/** Checks a login attempt; returns the username that signed in, or null. */
export function checkCredentials(username: unknown, password: unknown, env: RoleEnv = process.env): string | null {
  if (typeof username !== "string" || typeof password !== "string") return null
  if (adminConfigured(env) && username === env.ADMIN_USER && password === env.ADMIN_PASS) return username
  if (env.APP_USER && env.APP_PASS && username === env.APP_USER && password === env.APP_PASS) return username
  return null
}

/** Pages and API calls only an admin may use. */
export function isAdminOnly(pathname: string, method: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true
  if (pathname === "/history" || pathname.startsWith("/history/")) return true
  if (pathname.startsWith("/api/stats") || pathname.startsWith("/api/history") || pathname.startsWith("/api/attachments")) return true
  if (pathname.startsWith("/api/documents/batch-delete")) return true
  if (pathname.startsWith("/api/documents/") && method === "DELETE") return true
  return false
}
