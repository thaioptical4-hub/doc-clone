/**
 * Department list used by the send form and the executive dashboard.
 * Edit this list to match the organisation — order here is the order shown in the dropdown.
 * Documents created before departments existed have `null` and are reported as UNKNOWN_DEPARTMENT.
 */
export const DEPARTMENTS = [
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

export function departmentLabel(value: string | null | undefined): string {
  return value && value.trim() ? value : UNKNOWN_DEPARTMENT
}

/** Accepts only values from DEPARTMENTS so reports never split one department into spelling variants. */
export function normalizeDepartment(value: unknown): string | null {
  if (typeof value !== "string") return null
  return (DEPARTMENTS as readonly string[]).includes(value) ? value : null
}
