/**
 * Departments are managed by admins on the settings page and stored in the `departments` table
 * (see departmentStore.ts). This list only seeds that table the first time it is used.
 */
export const DEFAULT_DEPARTMENTS = [
  "ฝ่ายบัญชี-การเงิน",
  "ฝ่ายจัดซื้อ",
  "ฝ่ายบุคคล (HR)",
  "ฝ่ายผลิต",
  "ฝ่ายคุณภาพ (QA)",
  "ฝ่ายวิศวกรรม",
  "ฝ่ายขาย",
  "ฝ่ายธุรการ",
  "สำนักผู้บริหาร",
  "อื่นๆ",
] as const

export const UNKNOWN_DEPARTMENT = "ไม่ระบุ"

export interface Department {
  id: number
  name: string
  active: boolean
  sort_order: number
}

export function departmentLabel(value: string | null | undefined): string {
  return value && value.trim() ? value : UNKNOWN_DEPARTMENT
}

/** Accepts only a currently active department name, so reports never split one department into spelling variants. */
export function normalizeDepartment(value: unknown, activeNames: readonly string[]): string | null {
  if (typeof value !== "string") return null
  return activeNames.includes(value) ? value : null
}

/** Cleans a department name typed by an admin. Returns the name or a Thai error message. */
export function cleanDepartmentName(raw: unknown, existing: readonly Department[], editingId?: number): { name: string } | { error: string } {
  const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : ""
  if (!name) return { error: "กรุณาใส่ชื่อหน่วยงาน" }
  if (name.length > 100) return { error: "ชื่อหน่วยงานยาวเกิน 100 ตัวอักษร" }
  if (name === UNKNOWN_DEPARTMENT) return { error: `ใช้ชื่อ "${UNKNOWN_DEPARTMENT}" ไม่ได้ เพราะระบบใช้กับเอกสารที่ไม่มีหน่วยงาน` }
  const clash = existing.find((d) => d.id !== editingId && d.name.toLowerCase() === name.toLowerCase())
  if (clash) return { error: clash.active ? "มีหน่วยงานชื่อนี้อยู่แล้ว" : "มีหน่วยงานชื่อนี้ที่ถูกซ่อนไว้ ให้กดแสดงแทนการเพิ่มใหม่" }
  return { name }
}
