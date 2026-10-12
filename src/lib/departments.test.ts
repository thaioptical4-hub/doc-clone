import { describe, expect, it } from "vitest"
import { cleanDepartmentName, normalizeDepartment, type Department } from "./departments"

const list: Department[] = [
  { id: 1, name: "ฝ่ายจัดซื้อ", active: true, sort_order: 1 },
  { id: 2, name: "Sales", active: true, sort_order: 2 },
  { id: 3, name: "ฝ่ายเก่า", active: false, sort_order: 3 },
]

describe("cleanDepartmentName", () => {
  it("trims and collapses spaces", () => {
    expect(cleanDepartmentName("  ฝ่าย   ไอที ", list)).toEqual({ name: "ฝ่าย ไอที" })
  })

  it("rejects empty, reserved and too-long names", () => {
    expect(cleanDepartmentName("   ", list)).toHaveProperty("error")
    expect(cleanDepartmentName("ไม่ระบุ", list)).toHaveProperty("error")
    expect(cleanDepartmentName("ก".repeat(101), list)).toHaveProperty("error")
  })

  it("rejects duplicates (case-insensitive) and points to hidden ones", () => {
    expect(cleanDepartmentName("sales", list)).toEqual({ error: "มีหน่วยงานชื่อนี้อยู่แล้ว" })
    expect((cleanDepartmentName("ฝ่ายเก่า", list) as { error: string }).error).toContain("ซ่อน")
  })

  it("allows keeping the same name when renaming that department", () => {
    expect(cleanDepartmentName("Sales", list, 2)).toEqual({ name: "Sales" })
  })
})

describe("normalizeDepartment", () => {
  it("accepts only active names", () => {
    const active = list.filter((d) => d.active).map((d) => d.name)
    expect(normalizeDepartment("ฝ่ายจัดซื้อ", active)).toBe("ฝ่ายจัดซื้อ")
    expect(normalizeDepartment("ฝ่ายเก่า", active)).toBeNull()
    expect(normalizeDepartment(5, active)).toBeNull()
  })
})
