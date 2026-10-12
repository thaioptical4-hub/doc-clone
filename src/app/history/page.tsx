"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AppNav } from "@/components/AppNav"
import { DEPARTMENTS, UNKNOWN_DEPARTMENT, departmentLabel } from "@/lib/departments"
import { attachmentUrl, docNo, exportExcel, exportZip, photosOf, saveBlob, thaiDateTime, thaiTime } from "@/lib/exportHistory"
import type { AttachmentRef, HistoryRow } from "@/lib/types"

const PAGE_SIZE = 50

function bangkokToday(offsetDays = 0) {
  const d = new Date(Date.now() + 7 * 3600_000 + offsetDays * 86400_000)
  return d.toISOString().slice(0, 10)
}

function thaiDay(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })
}

type Preview = { row: HistoryRow; title: string; attachment: AttachmentRef; meta: string }

export default function HistoryPage() {
  const [from, setFrom] = useState(bangkokToday())
  const [to, setTo] = useState(bangkokToday())
  const [dept, setDept] = useState("")
  const [status, setStatus] = useState("")
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<HistoryRow[] | null>(null)
  const [error, setError] = useState("")
  const [page, setPage] = useState(0)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState<null | { label: string; done: number; total: number }>(null)

  const load = useCallback(async () => {
    setRows(null)
    setError("")
    const params = new URLSearchParams({ from, to })
    if (dept) params.set("dept", dept)
    if (status) params.set("status", status)
    if (q.trim()) params.set("q", q.trim())
    try {
      const res = await fetch(`/api/history?${params}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      setRows(await res.json())
      setPage(0)
    } catch {
      setRows([])
      setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง")
    }
  }, [from, to, dept, status, q])

  // Load once on open; later loads come from the search button, not from every filter keystroke.
  const [initialLoad] = useState(() => load)
  useEffect(() => {
    initialLoad()
  }, [initialLoad])

  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [preview])

  const rangeLabel = from === to ? `วันที่ ${thaiDay(from)}` : `${thaiDay(from)} – ${thaiDay(to)}`
  const counts = useMemo(() => {
    const list = rows ?? []
    const confirmed = list.filter((r) => r.status === "confirmed").length
    return { total: list.length, confirmed, pending: list.length - confirmed }
  }, [rows])
  const pageRows = (rows ?? []).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE))

  function setQuickRange(kind: "today" | "7d" | "month") {
    const today = bangkokToday()
    setTo(today)
    if (kind === "today") setFrom(today)
    if (kind === "7d") setFrom(bangkokToday(-6))
    if (kind === "month") setFrom(`${today.slice(0, 8)}01`)
  }

  async function runExport(kind: "excel" | "zip") {
    if (!rows?.length || busy) return
    const stamp = from === to ? from : `${from}_ถึง_${to}`
    const label = kind === "excel" ? "กำลังสร้างไฟล์ Excel" : "กำลังรวมรูปเป็น ZIP"
    setBusy({ label, done: 0, total: 0 })
    try {
      const onProgress = (done: number, total: number) => setBusy({ label, done, total })
      if (kind === "excel") {
        saveBlob(await exportExcel(rows, rangeLabel, onProgress), `DocDelivery_${stamp}.xlsx`)
      } else {
        saveBlob(await exportZip(rows, onProgress), `DocDelivery_รูป_${stamp}.zip`)
      }
    } catch (e) {
      console.error(e)
      setError("สร้างไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง หรือเลือกช่วงวันที่ให้สั้นลง")
    } finally {
      setBusy(null)
    }
  }

  function open(row: HistoryRow, title: string, attachment: AttachmentRef | undefined, meta: string) {
    if (attachment) setPreview({ row, title, attachment, meta })
  }

  return (
    <>
      <AppNav active="history" />
      <main className="container-wide">
        <div className="dash-head">
          <div>
            <h1>ประวัติการส่งเอกสาร</h1>
            <p className="muted">
              {rows ? `${rangeLabel} · พบ ${counts.total.toLocaleString("th-TH")} รายการ · รับแล้ว ${counts.confirmed} · รอรับ ${counts.pending} · กดที่รูปเพื่อดูภาพเต็ม` : "กำลังโหลด..."}
            </p>
          </div>
          <div className="toolbar">
            <button type="button" className="btn-export" onClick={() => runExport("excel")} disabled={!rows?.length || !!busy}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              Excel (มีรูป)
            </button>
            <button type="button" className="btn-outline" onClick={() => runExport("zip")} disabled={!rows?.length || !!busy}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v4M12 9v2M12 13v2" /></svg>
              ZIP รูปทั้งหมด
            </button>
          </div>
        </div>

        <form
          className="card filters"
          onSubmit={(e) => {
            e.preventDefault()
            load()
          }}
        >
          <label>
            ตั้งแต่วันที่
            <input className="field" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required />
          </label>
          <label>
            ถึงวันที่
            <input className="field" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required />
          </label>
          <label>
            หน่วยงาน (ผู้ส่งหรือผู้รับ)
            <select className="field" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">ทุกหน่วยงาน</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label>
            สถานะ
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">ทั้งหมด</option>
              <option value="confirmed">รับแล้ว</option>
              <option value="sent">รอรับ</option>
            </select>
          </label>
          <label>
            ค้นหา
            <input className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อ, ประเภท, เลขที่" />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
            <div className="toolbar">
              <button type="button" className="btn-ghost" onClick={() => setQuickRange("today")}>วันนี้</button>
              <button type="button" className="btn-ghost" onClick={() => setQuickRange("7d")}>7 วัน</button>
              <button type="button" className="btn-ghost" onClick={() => setQuickRange("month")}>เดือนนี้</button>
            </div>
            <button type="submit" className="btn-primary" style={{ minHeight: 48, padding: "0 16px" }}>ค้นหา</button>
          </div>
        </form>

        {busy && (
          <p className="progress-note" role="status">
            {busy.label}... {busy.total ? `เตรียมรูป ${busy.done}/${busy.total}` : ""}
          </p>
        )}
        {error && <p className="form-error">{error}</p>}

        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: 1200 }}>
              <thead>
                <tr>
                  <th scope="col">เลขที่</th>
                  <th scope="col">วันที่ส่ง</th>
                  <th scope="col">เอกสาร</th>
                  <th scope="col">จาก → ถึง</th>
                  <th scope="col">รูปก่อนส่ง</th>
                  <th scope="col">ลายเซ็นผู้ส่ง</th>
                  <th scope="col">เวลารับ</th>
                  <th scope="col">รูปหลังส่ง</th>
                  <th scope="col">ลายเซ็นผู้รับ</th>
                  <th scope="col">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows === null && (
                  <tr><td colSpan={10} className="empty-note">กำลังโหลด...</td></tr>
                )}
                {rows?.length === 0 && (
                  <tr><td colSpan={10} className="empty-note">ไม่พบเอกสารในช่วงนี้</td></tr>
                )}
                {pageRows.map((r) => {
                  const p = photosOf(r)
                  const confirmed = r.status === "confirmed"
                  const route = `${departmentLabel(r.sender_department)} → ${departmentLabel(r.recipient_department)}`
                  return (
                    <tr key={r.id}>
                      <td><Link className="doc-no" href={`/receive/${r.id}`}>{docNo(r.id)}</Link></td>
                      <td style={{ whiteSpace: "nowrap" }}>{thaiDateTime(r.created_at)}</td>
                      <td>{r.doc_type}{r.description && <div className="muted">{r.description}</div>}</td>
                      <td>
                        {r.sender_name} → {r.recipient_name}
                        <div className="muted">{route}</div>
                      </td>
                      <td>
                        {p.before.length ? (
                          <div className="thumb-stack">
                            <button type="button" className="thumb" aria-label={`ดูรูปก่อนส่ง ${docNo(r.id)}`} onClick={() => open(r, "รูปก่อนส่ง", p.before[0], `ส่งโดย ${r.sender_name} · ${thaiDateTime(r.created_at)}`)}>
                              <img src={attachmentUrl(p.before[0].id)} alt="" loading="lazy" />
                            </button>
                            {p.before.length > 1 && <span className="thumb-more">+{p.before.length - 1}</span>}
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>
                        {p.senderSignature[0] ? (
                          <button type="button" className="thumb sig" aria-label={`ดูลายเซ็นผู้ส่ง ${docNo(r.id)}`} onClick={() => open(r, "ลายเซ็นผู้ส่ง", p.senderSignature[0], `${r.sender_name} · ${thaiDateTime(r.created_at)}`)}>
                            <img src={attachmentUrl(p.senderSignature[0].id)} alt="" loading="lazy" />
                          </button>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>{confirmed ? thaiTime(r.updated_at) : <span className="muted">—</span>}</td>
                      <td>
                        {p.after[0] ? (
                          <button type="button" className="thumb" aria-label={`ดูรูปหลังส่ง ${docNo(r.id)}`} onClick={() => open(r, "รูปหลังส่ง", p.after[0], `รับโดย ${r.recipient_name} · ${thaiDateTime(r.updated_at)}`)}>
                            <img src={attachmentUrl(p.after[0].id)} alt="" loading="lazy" />
                          </button>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td>
                        {p.signature[0] ? (
                          <button type="button" className="thumb sig" aria-label={`ดูลายเซ็นผู้รับ ${docNo(r.id)}`} onClick={() => open(r, "ลายเซ็นผู้รับ", p.signature[0], `${r.recipient_name} · ${thaiDateTime(r.updated_at)}`)}>
                            <img src={attachmentUrl(p.signature[0].id)} alt="" loading="lazy" />
                          </button>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td><span className={confirmed ? "badge badge-confirmed" : "badge badge-sent"}>{confirmed ? "รับแล้ว" : "รอรับ"}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {rows && rows.length > PAGE_SIZE && (
            <div className="table-foot">
              <span>แสดง {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} จาก {rows.length.toLocaleString("th-TH")} รายการ</span>
              <div className="toolbar">
                <button type="button" className="btn-outline" disabled={page === 0} onClick={() => setPage(page - 1)}>ก่อนหน้า</button>
                <span style={{ alignSelf: "center" }}>หน้า {page + 1}/{pages}</span>
                <button type="button" className="btn-outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button>
              </div>
            </div>
          )}
        </section>
        <p className="muted" style={{ marginTop: 12 }}>
          เอกสารที่สร้างก่อนเพิ่มช่องหน่วยงาน จะแสดงหน่วยงานเป็น &quot;{UNKNOWN_DEPARTMENT}&quot;
        </p>
      </main>

      {preview && (
        <div className="overlay" onClick={() => setPreview(null)}>
          <div className="lightbox" role="dialog" aria-modal="true" aria-label={preview.title} onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-head">
              <div>
                <div style={{ fontWeight: 600 }}>{preview.title}</div>
                <div className="muted"><span className="doc-no">{docNo(preview.row.id)}</span> · {preview.row.doc_type} · {preview.meta}</div>
              </div>
              <div className="toolbar">
                <a className="btn-outline" style={{ textDecoration: "none", borderRadius: 8 }} href={attachmentUrl(preview.attachment.id)} download={`${docNo(preview.row.id)}_${preview.title}`}>ดาวน์โหลด</a>
                <button type="button" className="icon-button" aria-label="ปิด" onClick={() => setPreview(null)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="lightbox-body">
              <img src={attachmentUrl(preview.attachment.id)} alt={`${preview.title} ${docNo(preview.row.id)}`} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
