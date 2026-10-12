import { sql, ensureSchema } from "./db"
import { DEFAULT_DEPARTMENTS, type Department } from "./departments"

let ready: Promise<void> | null = null

/** Creates the departments table and fills it with the default list the first time. */
function ensureDepartments(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureSchema()
      await sql`
        CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      const count = (await sql`SELECT COUNT(*)::int AS n FROM departments`) as { n: number }[]
      if (count[0].n === 0) {
        for (const [i, name] of DEFAULT_DEPARTMENTS.entries()) {
          await sql`INSERT INTO departments (name, sort_order) VALUES (${name}, ${i + 1}) ON CONFLICT (name) DO NOTHING`
        }
      }
    })().catch((error) => {
      ready = null
      throw error
    })
  }
  return ready
}

export async function listDepartments(includeHidden = false): Promise<Department[]> {
  await ensureDepartments()
  const rows = (await sql`SELECT id, name, active, sort_order FROM departments ORDER BY sort_order, id`) as Department[]
  return includeHidden ? rows : rows.filter((d) => d.active)
}

export async function activeDepartmentNames(): Promise<string[]> {
  return (await listDepartments()).map((d) => d.name)
}

export async function addDepartment(name: string): Promise<Department> {
  await ensureDepartments()
  const rows = (await sql`
    INSERT INTO departments (name, sort_order)
    VALUES (${name}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM departments))
    RETURNING id, name, active, sort_order
  `) as Department[]
  return rows[0]
}

export async function setDepartmentActive(id: number, active: boolean): Promise<void> {
  await ensureDepartments()
  await sql`UPDATE departments SET active = ${active} WHERE id = ${id}`
}

/** Renames a department; with `renameDocuments`, documents already filed under the old name move to the new one. */
export async function renameDepartment(id: number, name: string, renameDocuments: boolean): Promise<{ updatedDocuments: number }> {
  await ensureDepartments()
  const rows = (await sql`SELECT name FROM departments WHERE id = ${id}`) as { name: string }[]
  if (!rows.length) throw new Error("Department not found")
  const old = rows[0].name
  await sql`UPDATE departments SET name = ${name} WHERE id = ${id}`
  if (!renameDocuments || old === name) return { updatedDocuments: 0 }
  const a = (await sql`UPDATE documents SET sender_department = ${name} WHERE sender_department = ${old} RETURNING id`) as unknown[]
  const b = (await sql`UPDATE documents SET recipient_department = ${name} WHERE recipient_department = ${old} RETURNING id`) as unknown[]
  return { updatedDocuments: new Set([...(a as { id: number }[]), ...(b as { id: number }[])].map((r) => r.id)).size }
}

/** Saves a new display order; ids not listed keep their place after the listed ones. */
export async function reorderDepartments(ids: number[]): Promise<void> {
  await ensureDepartments()
  for (const [i, id] of ids.entries()) {
    await sql`UPDATE departments SET sort_order = ${i + 1} WHERE id = ${id}`
  }
}
