"use client"

import { useEffect, useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { AppNav } from "@/components/AppNav"

interface AdminInfo {
  managedByEnv: boolean
  username: string | null
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [info, setInfo] = useState<AdminInfo | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedAs, setSavedAs] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/settings/admin", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setInfo)
      .catch(() => setError("โหลดการตั้งค่าไม่สำเร็จ"))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const form = new FormData(e.currentTarget)
    const res = await fetch("/api/settings/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
        confirm: form.get("confirm"),
      }),
    })
    const data = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok) {
      setError(data?.error || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง")
      return
    }
    setSavedAs(data.username)
  }

  // Signed in with the shared iPad login: once an admin exists this login becomes staff.
  const signedInAsNewAdmin = savedAs && session?.username === savedAs

  return (
    <>
      <AppNav active="settings" />
      <main className="container">
        <h1 className="page-title">ตั้งค่าผู้ดูแลระบบ</h1>
        <p className="page-sub">
          บัญชี Admin เห็นประวัติ แดชบอร์ด และลบเอกสารได้ · บัญชีของ iPad จะเหลือแค่ส่งและรับเอกสาร
        </p>

        {!info && !error && <p className="muted">กำลังโหลด...</p>}
        {error && !savedAs && <p className="form-error" role="alert">{error}</p>}

        {savedAs && (
          <div className="card success-card">
            <div className="success-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <h2>บันทึกบัญชี Admin แล้ว</h2>
            <p className="muted" style={{ margin: "8px 0 20px" }}>
              ชื่อผู้ใช้ <b>{savedAs}</b> · ภายใน 1 นาที บัญชีของ iPad จะเป็นบัญชีพนักงานโดยอัตโนมัติ
            </p>
            {!signedInAsNewAdmin && (
              <button type="button" className="btn-primary btn-xl" onClick={() => signOut({ callbackUrl: "/login" })}>
                ออกจากระบบ แล้วล็อกอินด้วยบัญชี Admin
              </button>
            )}
          </div>
        )}

        {info && !savedAs && info.managedByEnv && (
          <div className="card">
            <p>บัญชี Admin (<b>{info.username}</b>) ถูกตั้งไว้ใน Vercel Environment Variables จึงแก้จากหน้านี้ไม่ได้</p>
          </div>
        )}

        {info && !savedAs && !info.managedByEnv && (
          <form className="card form-card" onSubmit={handleSubmit}>
            <div className="step-title">
              <span className="step-num">1</span>
              {info.username ? `เปลี่ยนบัญชี Admin (ตอนนี้: ${info.username})` : "สร้างบัญชี Admin"}
            </div>
            {!info.username && (
              <p className="progress-note">ยังไม่มีบัญชี Admin ตอนนี้ทุกคนที่ล็อกอินเห็นทุกเมนู</p>
            )}
            <div className="form-group">
              <label htmlFor="username">ชื่อผู้ใช้ Admin (ภาษาอังกฤษ)</label>
              <input id="username" name="username" type="text" required autoComplete="username" autoCapitalize="none" defaultValue={info.username ?? ""} placeholder="เช่น hamee" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label>
                <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label htmlFor="confirm">ยืนยันรหัสผ่าน</label>
                <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="muted" style={{ marginBottom: 16 }}>
              รหัสผ่านถูกเข้ารหัสแบบทางเดียวก่อนเก็บ ไม่มีใครเปิดดูรหัสจริงได้ ถ้าลืมให้ตั้งใหม่จากหน้านี้ขณะล็อกอินเป็น Admin
            </p>
            <button type="submit" className="btn-primary btn-xl" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกบัญชี Admin"}
            </button>
          </form>
        )}
      </main>
    </>
  )
}
