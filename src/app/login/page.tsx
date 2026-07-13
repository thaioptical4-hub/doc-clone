"use client"

import { signIn } from "next-auth/react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function LoginForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await signIn("credentials", {
      username: form.get("username") as string,
      password: form.get("password") as string,
      redirect: true,
      callbackUrl: "/",
    })
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <img src="/logo.svg" alt="CRAFT" className="login-logo" />
        <div className="brand-stripe" style={{ borderRadius: 4, marginBottom: 20 }} />
        <h1 style={{ textAlign: "center", marginBottom: 24 }}>ระบบส่งเอกสาร</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">ชื่อผู้ใช้</label>
            <input id="username" name="username" type="text" required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="password">รหัสผ่าน</label>
            <input id="password" name="password" type="password" required />
          </div>
          {error && <p style={{ color: "#ff3b30", marginBottom: 16 }}>ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง</p>}
          <button type="submit" className="btn-primary">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
