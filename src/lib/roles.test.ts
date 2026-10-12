import { describe, expect, it } from "vitest"
import { checkCredentials, isAdminOnly, roleFor, validateNewAdmin, type StoredAdmin } from "./roles"
import { hashPassword, verifyPassword } from "./password"

const shared = { APP_USER: "ipad", APP_PASS: "p1" }
const withEnvAdmin = { ...shared, ADMIN_USER: "boss", ADMIN_PASS: "p2" }

async function stored(username = "hamee", password = "secret-123"): Promise<StoredAdmin> {
  return { username, passwordHash: await hashPassword(password) }
}

describe("password hashing", () => {
  it("verifies the right password only and never stores it in clear", async () => {
    const hash = await hashPassword("secret-123")
    expect(hash).not.toContain("secret-123")
    expect(hash.startsWith("pbkdf2$")).toBe(true)
    expect(await verifyPassword("secret-123", hash)).toBe(true)
    expect(await verifyPassword("secret-124", hash)).toBe(false)
    expect(await verifyPassword("secret-123", "garbage")).toBe(false)
  })

  it("salts each hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"))
  })
})

describe("roleFor", () => {
  it("keeps the shared login as admin until any admin exists", () => {
    expect(roleFor("ipad", null, shared)).toBe("admin")
  })

  it("uses the admin saved in settings", async () => {
    const s = await stored()
    expect(roleFor("ipad", s, shared)).toBe("staff")
    expect(roleFor("hamee", s, shared)).toBe("admin")
    expect(roleFor(undefined, s, shared)).toBe("staff")
  })

  it("lets environment variables take priority over settings", async () => {
    const s = await stored()
    expect(roleFor("boss", s, withEnvAdmin)).toBe("admin")
    expect(roleFor("hamee", s, withEnvAdmin)).toBe("staff")
  })
})

describe("checkCredentials", () => {
  it("accepts the saved admin and the shared login with their own passwords", async () => {
    const s = await stored()
    expect(await checkCredentials("hamee", "secret-123", s, shared)).toBe("hamee")
    expect(await checkCredentials("hamee", "p1", s, shared)).toBeNull()
    expect(await checkCredentials("ipad", "p1", s, shared)).toBe("ipad")
    expect(await checkCredentials("ipad", "secret-123", s, shared)).toBeNull()
    expect(await checkCredentials("ipad", undefined, s, shared)).toBeNull()
  })

  it("ignores the saved admin when an environment admin exists", async () => {
    const s = await stored()
    expect(await checkCredentials("hamee", "secret-123", s, withEnvAdmin)).toBeNull()
    expect(await checkCredentials("boss", "p2", s, withEnvAdmin)).toBe("boss")
  })
})

describe("validateNewAdmin", () => {
  it("rejects weak or clashing accounts", () => {
    expect(validateNewAdmin("ipad", "longenough", "longenough", shared)).toContain("ไม่ซ้ำ")
    expect(validateNewAdmin("hamee", "short", "short", shared)).toContain("8")
    expect(validateNewAdmin("hamee", "longenough", "different", shared)).toContain("ไม่ตรง")
    expect(validateNewAdmin("ฮามี", "longenough", "longenough", shared)).toContain("ภาษาอังกฤษ")
    expect(validateNewAdmin("hamee", "p1p1p1p1", "p1p1p1p1", { ...shared, APP_PASS: "p1p1p1p1" })).toContain("iPad")
    expect(validateNewAdmin("hamee", "longenough", "longenough", shared)).toBeNull()
  })
})

describe("isAdminOnly", () => {
  it("protects reports, photos, settings and deleting", () => {
    for (const p of ["/dashboard", "/history", "/settings", "/api/stats", "/api/history", "/api/attachments/5", "/api/settings/admin"]) {
      expect(isAdminOnly(p, "GET")).toBe(true)
    }
    expect(isAdminOnly("/api/documents/batch-delete", "POST")).toBe(true)
    expect(isAdminOnly("/api/documents/5", "DELETE")).toBe(true)
  })

  it("leaves sending and receiving open to staff", () => {
    expect(isAdminOnly("/", "GET")).toBe(false)
    expect(isAdminOnly("/receive/5", "GET")).toBe(false)
    expect(isAdminOnly("/api/documents", "POST")).toBe(false)
    expect(isAdminOnly("/api/documents", "GET")).toBe(false)
    expect(isAdminOnly("/api/documents/5", "GET")).toBe(false)
    expect(isAdminOnly("/api/documents/5", "PATCH")).toBe(false)
  })
})
