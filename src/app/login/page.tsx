"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1 style={{ textAlign: "center", marginBottom: 24 }}>Doc Delivery</h1>
        <form
          action={async (formData) => {
            await signIn("credentials", {
              username: formData.get("username") as string,
              password: formData.get("password") as string,
              redirect: true,
              callbackUrl: "/",
            })
          }}
        >
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
