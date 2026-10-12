import { describe, expect, it } from "vitest"
import { checkCredentials, isAdminOnly, roleFor } from "./roles"

const shared = { APP_USER: "ipad", APP_PASS: "p1" }
const withAdmin = { ...shared, ADMIN_USER: "boss", ADMIN_PASS: "p2" }

describe("roleFor", () => {
  it("keeps the shared login as admin until an admin account is configured", () => {
    expect(roleFor("ipad", shared)).toBe("admin")
  })

  it("splits staff and admin once ADMIN_USER/ADMIN_PASS exist", () => {
    expect(roleFor("ipad", withAdmin)).toBe("staff")
    expect(roleFor("boss", withAdmin)).toBe("admin")
  })

  it("treats sessions from before roles existed as staff once admin is configured", () => {
    expect(roleFor(undefined, withAdmin)).toBe("staff")
  })

  it("needs both admin variables", () => {
    expect(roleFor("ipad", { ...shared, ADMIN_USER: "boss" })).toBe("admin")
  })
})

describe("checkCredentials", () => {
  it("accepts either account with its own password only", () => {
    expect(checkCredentials("ipad", "p1", withAdmin)).toBe("ipad")
    expect(checkCredentials("boss", "p2", withAdmin)).toBe("boss")
    expect(checkCredentials("boss", "p1", withAdmin)).toBeNull()
    expect(checkCredentials("ipad", "p2", withAdmin)).toBeNull()
    expect(checkCredentials("ipad", undefined, withAdmin)).toBeNull()
  })
})

describe("isAdminOnly", () => {
  it("protects reports, photos and deleting", () => {
    expect(isAdminOnly("/dashboard", "GET")).toBe(true)
    expect(isAdminOnly("/history", "GET")).toBe(true)
    expect(isAdminOnly("/api/stats", "GET")).toBe(true)
    expect(isAdminOnly("/api/history", "GET")).toBe(true)
    expect(isAdminOnly("/api/attachments/5", "GET")).toBe(true)
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
