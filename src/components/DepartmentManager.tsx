"use client"

import { useEffect, useState } from "react"
import type { Department } from "@/lib/departments"

/** Admin list of departments: add, rename, hide/show and reorder. */
export function DepartmentManager() {
  const [items, setItems] = useState<Department[] | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [newName, setNewName] = useState("")
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: number; name: string; renameDocuments: boolean } | null>(null)

  useEffect(() => {
    fetch("/api/departments?all=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setItems)
      .catch(() => setError("โหลดรายชื่อหน่วยงานไม่สำเร็จ"))
  }, [])

  async function call(url: string, method: string, body: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || "บันทึกไม่สำเร็จ")
        return null
      }
      return data
    } catch {
      setError("บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่")
      return null
    } finally {
      setBusy(false)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const data = await call("/api/departments", "POST", { name: newName })
    if (data && items) {
      setItems([...items, data as unknown as Department])
      setNewName("")
      setNotice(`เพิ่ม "${(data as unknown as Department).name}" แล้ว`)
    }
  }

  async function toggle(d: Department) {
    const data = await call(`/api/departments/${d.id}`, "PATCH", { active: !d.active })
    if (data) {
      setItems(data.departments as Department[])
      setNotice(d.active ? `ซ่อน "${d.name}" แล้ว เอกสารเก่ายังแสดงชื่อเดิม` : `แสดง "${d.name}" แล้ว`)
    }
  }

  async function saveRename() {
    if (!editing) return
    const data = await call(`/api/departments/${editing.id}`, "PATCH", { name: editing.name, renameDocuments: editing.renameDocuments })
    if (data) {
      setItems(data.departments as Department[])
      const moved = Number(data.updatedDocuments) || 0
      setNotice(moved ? `เปลี่ยนชื่อแล้ว และย้ายเอกสารเก่า ${moved} ฉบับไปชื่อใหม่` : "เปลี่ยนชื่อแล้ว")
      setEditing(null)
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!items) return
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
    const data = await call("/api/departments/reorder", "POST", { ids: next.map((d) => d.id) })
    if (data) setItems(data.departments as Department[])
  }

  return (
    <section className="card form-card" style={{ marginTop: 20 }} aria-labelledby="dept-title">
      <div className="step-title" id="dept-title">
        <span className="step-num">2</span> หน่วยงาน
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        รายชื่อนี้ใช้ในช่องเลือกหน่วยงานของฟอร์มส่งเอกสาร · หน่วยงานที่ไม่ใช้แล้วให้กด &quot;ซ่อน&quot; แทนการลบ เพื่อให้ประวัติและรายงานเดิมยังครบ
      </p>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="progress-note" role="status">{notice}</p>}
      {!items && !error && <p className="muted">กำลังโหลด...</p>}

      {items && (
        <ul className="dept-list">
          {items.map((d, i) => (
            <li key={d.id} className={d.active ? "dept-row" : "dept-row hidden"}>
              {editing?.id === d.id ? (
                <div className="dept-edit">
                  <label className="sr-only" htmlFor={`dept-${d.id}`}>ชื่อหน่วยงานใหม่</label>
                  <input
                    id={`dept-${d.id}`}
                    className="field"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    autoFocus
                  />
                  <label className="dept-check">
                    <input
                      type="checkbox"
                      checked={editing.renameDocuments}
                      onChange={(e) => setEditing({ ...editing, renameDocuments: e.target.checked })}
                    />
                    เปลี่ยนชื่อในเอกสารเก่าด้วย (รายงานจะรวมเป็นหน่วยงานเดียวกัน)
                  </label>
                  <div className="toolbar">
                    <button type="button" className="btn-export" onClick={saveRename} disabled={busy}>บันทึก</button>
                    <button type="button" className="btn-outline" onClick={() => setEditing(null)} disabled={busy}>ยกเลิก</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="dept-order">
                    <button type="button" className="icon-button" aria-label={`เลื่อน ${d.name} ขึ้น`} onClick={() => move(i, -1)} disabled={busy || i === 0}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
                    </button>
                    <button type="button" className="icon-button" aria-label={`เลื่อน ${d.name} ลง`} onClick={() => move(i, 1)} disabled={busy || i === items.length - 1}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                  <span className="dept-name">
                    {d.name}
                    {!d.active && <span className="badge badge-sent" style={{ marginLeft: 8 }}>ซ่อนอยู่</span>}
                  </span>
                  <div className="toolbar">
                    <button type="button" className="btn-outline" onClick={() => setEditing({ id: d.id, name: d.name, renameDocuments: true })} disabled={busy}>แก้ชื่อ</button>
                    <button type="button" className="btn-outline" onClick={() => toggle(d)} disabled={busy}>{d.active ? "ซ่อน" : "แสดง"}</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="dept-add">
        <label htmlFor="new-dept" className="sr-only">ชื่อหน่วยงานใหม่</label>
        <input id="new-dept" className="field" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ชื่อหน่วยงานใหม่ เช่น ฝ่ายไอที" />
        <button type="submit" className="btn-primary" style={{ width: "auto", minHeight: 48, padding: "0 20px" }} disabled={busy || !newName.trim()}>
          + เพิ่มหน่วยงาน
        </button>
      </form>
    </section>
  )
}
