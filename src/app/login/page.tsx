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
        <h1 style={{ textAlign: "center", marginBottom: 24 }}>Doc Delivery</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
          {error && <p style={{ color: "#ff3b30", marginBottom: 16 }}>Invalid credentials</p>}
          <button type="submit" className="btn-primary">Sign In</button>
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
