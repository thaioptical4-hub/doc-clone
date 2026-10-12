"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AppNav } from "@/components/AppNav"
import { formatDuration, OVERDUE_MINUTES, type DashboardData, type Period } from "@/lib/stats"

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "วันนี้" },
  { key: "week", label: "7 วันล่าสุด" },
  { key: "month", label: "เดือนนี้" },
]

const REFRESH_MS = 30_000

function fmt(n: number) {
  return n.toLocaleString("th-TH")
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("today")
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState("")
  const [view, setView] = useState<"chart" | "table">("chart")

  const load = useCallback(async (p: Period) => {
    try {
      const res = await fetch(`/api/stats?period=${p}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      setData(await res.json())
      setError("")
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ กำลังลองใหม่...")
    }
  }, [])

  useEffect(() => {
    load(period)
    const t = setInterval(() => load(period), REFRESH_MS)
    return () => clearInterval(t)
  }, [period, load])

  const maxDept = Math.max(1, ...(data?.byDepartment.map((d) => d.count) ?? [1]))
  const maxTrend = Math.max(1, ...(data?.trend.map((t) => t.count) ?? [1]))
  const maxRoute = Math.max(1, ...(data?.routes.map((r) => r.count) ?? [1]))

  return (
    <>
      <AppNav active="dashboard" />
      <main className="container-wide">
        <div className="dash-head">
          <div>
            <h1>ภาพรวมการส่งเอกสาร</h1>
            <p className="muted">
              <span className="live-dot" aria-hidden="true" />
              อัปเดตอัตโนมัติทุก 30 วินาที{data ? ` · ล่าสุด ${timeLabel(data.generatedAt)}` : ""}
            </p>
          </div>
          <div className="toolbar">
            <div className="segmented" role="group" aria-label="ช่วงเวลา">
              {PERIODS.map((p) => (
                <button key={p.key} type="button" aria-pressed={period === p.key} onClick={() => { setData(null); setPeriod(p.key) }}>
                  {p.label}
                </button>
              ))}
            </div>
            <Link href="/history" className="btn-outline" style={{ textDecoration: "none", borderRadius: 8 }}>
              ดูประวัติ &amp; ดาวน์โหลด
            </Link>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {!data && !error && <p className="muted">กำลังโหลด...</p>}

        {data && (
          <>
            <section className="hero" aria-label="สรุป">
              <div className="hero-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 3v4M21 5h-4" /></svg>
              </div>
              <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                <div className="hero-label">สรุปอัตโนมัติ · {data.periodLabel}</div>
                <p className="hero-text">{data.summary}</p>
                <div className="hero-chips">
                  {data.chips.map((c) => (
                    <span key={c} className="hero-chip">{c}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="kpi-grid" aria-label="ตัวชี้วัดหลัก">
              <Kpi label="เอกสารทั้งหมด" value={fmt(data.total)} unit="ฉบับ"
                sub={data.deltaPct === null ? `${data.prevLabel} ${fmt(data.prevTotal)} ฉบับ` : `${data.deltaPct >= 0 ? "+" : ""}${data.deltaPct}% จาก${data.prevLabel}`}
                pill={data.deltaPct === null ? undefined : data.deltaPct >= 0 ? "เพิ่มขึ้น" : "ลดลง"} tone="info" />
              <Kpi label="รับแล้ว" value={fmt(data.confirmed)} unit="ฉบับ"
                sub={data.confirmRate === null ? "ยังไม่มีเอกสาร" : `${data.confirmRate}% ของทั้งหมด`}
                pill={data.confirmRate === null ? undefined : data.confirmRate >= 85 ? "ดี" : "ติดตาม"} tone={data.confirmRate !== null && data.confirmRate >= 85 ? "success" : "warning"} />
              <Kpi label="รอรับ (ทั้งหมด)" value={fmt(data.pendingAllCount)} unit="ฉบับ" sub="ทุกวันที่ยังไม่ยืนยันรับ" tone="info" />
              <Kpi label="รอรับเกินเวลา" value={fmt(data.overdueCount)} unit="ฉบับ" sub={`เกิน ${OVERDUE_MINUTES} นาทีหลังส่ง`}
                pill={data.overdueCount > 0 ? "ต้องติดตาม" : "ปกติ"} tone={data.overdueCount > 0 ? "danger" : "success"} />
              <Kpi label="เวลาเฉลี่ยต่อฉบับ" value={data.avgMinutes === null ? "–" : formatDuration(data.avgMinutes)} sub="ตั้งแต่ส่งจนผู้รับเซ็น" tone="info" />
            </section>

            <div className="dash-grid">
              <section className="card">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">เอกสารแยกตามหน่วยงานผู้ส่ง</h2>
                    <p className="muted">{data.periodLabel} · รวม {fmt(data.total)} ฉบับ</p>
                  </div>
                  <div className="segmented" role="group" aria-label="รูปแบบการแสดงผล">
                    <button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")}>กราฟ</button>
                    <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>ตาราง</button>
                  </div>
                </div>
                {data.byDepartment.length === 0 && <p className="empty-note">ยังไม่มีข้อมูลในช่วงนี้</p>}
                {view === "chart" &&
                  data.byDepartment.map((d) => (
                    <div key={d.name} className="hbar-row">
                      <span className="hbar-name" title={d.name}>{d.name}</span>
                      <div className="hbar-track"><div className="hbar-fill" style={{ width: `${(d.count / maxDept) * 100}%` }} /></div>
                      <span className="hbar-val"><b>{fmt(d.count)}</b> <span className="muted">· {Math.round((d.count / Math.max(1, data.total)) * 100)}%</span></span>
                    </div>
                  ))}
                {view === "table" && data.byDepartment.length > 0 && (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr><th scope="col">หน่วยงาน</th><th scope="col">ทั้งหมด</th><th scope="col">รับแล้ว</th><th scope="col">รอรับ</th></tr>
                      </thead>
                      <tbody>
                        {data.byDepartment.map((d) => (
                          <tr key={d.name}><td>{d.name}</td><td>{fmt(d.count)}</td><td>{fmt(d.confirmed)}</td><td>{fmt(d.count - d.confirmed)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="card">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">{data.trendTitle}</h2>
                    <p className="muted">{data.peakLabel ? `ช่วงสูงสุด: ${data.peakLabel}` : "จำนวนเอกสารที่ส่ง"}</p>
                  </div>
                </div>
                <div className="vbars" role="img" aria-label={`${data.trendTitle}: ${data.trend.map((t) => `${t.label} ${t.count} ฉบับ`).join(", ")}`}>
                  {data.trend.map((t) => (
                    <div key={t.label} className="vbar-col">
                      <span style={{ fontWeight: t.count === maxTrend && t.count > 0 ? 600 : 400 }}>{t.count || ""}</span>
                      <div className={t.count === maxTrend && t.count > 0 ? "vbar peak" : "vbar"} style={{ height: `${(t.count / maxTrend) * 170}px` }} />
                    </div>
                  ))}
                </div>
                <div className="vbar-labels" aria-hidden="true">
                  {data.trend.map((t) => <span key={t.label}>{t.label}</span>)}
                </div>
              </section>
            </div>

            <div className="dash-grid">
              <section className="card">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">เอกสารที่รอรับตอนนี้</h2>
                    <p className="muted">เรียงจากรอนานที่สุด</p>
                  </div>
                  {data.overdueCount > 0 && <span className="badge badge-overdue">เกินเวลา {data.overdueCount} ฉบับ</span>}
                </div>
                {data.waiting.length === 0 ? (
                  <p className="empty-note">ไม่มีเอกสารค้างรับ</p>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr><th scope="col">เลขที่</th><th scope="col">เอกสาร</th><th scope="col">เส้นทาง</th><th scope="col">รอมาแล้ว</th></tr>
                      </thead>
                      <tbody>
                        {data.waiting.map((w) => (
                          <tr key={w.id}>
                            <td><Link className="doc-no" href={`/receive/${w.id}`}>#{w.id}</Link></td>
                            <td>{w.doc_type}<div className="muted">{w.sender_name} → {w.recipient_name}</div></td>
                            <td className="muted">{w.sender_department} → {w.recipient_department}</td>
                            <td><span className={w.overdue ? "badge badge-overdue" : "badge badge-sent"}>{formatDuration(w.minutes)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="card">
                <div className="panel-head">
                  <div>
                    <h2 className="panel-title">เส้นทางเอกสารที่ใช้บ่อย</h2>
                    <p className="muted">{data.periodLabel} · ใช้วางรอบเดินเอกสาร</p>
                  </div>
                </div>
                {data.routes.length === 0 && <p className="empty-note">ยังไม่มีข้อมูลในช่วงนี้</p>}
                {data.routes.map((r) => (
                  <div key={`${r.from}-${r.to}`} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8, fontSize: "0.875rem", marginBottom: 4 }}>
                      <span>{r.from} → {r.to}</span>
                      <b style={{ marginLeft: "auto" }}>{fmt(r.count)}</b>
                    </div>
                    <div className="hbar-track" style={{ height: 8 }}><div className="hbar-fill" style={{ width: `${(r.count / maxRoute) * 100}%`, background: "var(--chart-1)" }} /></div>
                  </div>
                ))}
              </section>
            </div>
          </>
        )}
      </main>
    </>
  )
}

function Kpi({ label, value, unit, sub, pill, tone }: { label: string; value: string; unit?: string; sub: string; pill?: string; tone: "info" | "success" | "warning" | "danger" }) {
  const cls = { info: "badge badge-info", success: "badge badge-confirmed", warning: "badge badge-sent", danger: "badge badge-overdue" }[tone]
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}{unit && <span className="kpi-unit">{unit}</span>}</div>
      <div className="kpi-foot">
        <span className="kpi-sub">{sub}</span>
        {pill && <span className={cls}>{pill}</span>}
      </div>
    </div>
  )
}
