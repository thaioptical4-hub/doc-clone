"use client"

import Link from "next/link"
import { signOut, useSession } from "next-auth/react"

export type NavKey = "send" | "receive" | "history" | "dashboard"

const ITEMS: { key: NavKey; href: string; label: string; adminOnly?: boolean; icon: React.ReactNode }[] = [
  {
    key: "send",
    href: "/?tab=send",
    label: "ส่งเอกสาร",
    icon: <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />,
  },
  {
    key: "receive",
    href: "/?tab=receive",
    label: "รับเอกสาร",
    icon: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </>
    ),
  },
  {
    key: "history",
    href: "/history",
    label: "ประวัติ",
    adminOnly: true,
    icon: (
      <>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8" />
      </>
    ),
  },
  {
    key: "dashboard",
    href: "/dashboard",
    label: "แดชบอร์ด",
    adminOnly: true,
    icon: <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />,
  },
]

export function AppNav({ active }: { active: NavKey }) {
  const { data } = useSession()
  const isAdmin = data?.role === "admin"
  const items = ITEMS.filter((item) => !item.adminOnly || isAdmin)
  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link href="/" className="app-brand" aria-label="Doc Delivery หน้าแรก">
          <img src="/logo.svg" alt="CRAFT" />
          <span className="app-brand-text">
            <strong>Doc Delivery</strong>
            <small>ระบบส่งเอกสารภายใน</small>
          </span>
        </Link>
        <nav aria-label="เมนูหลัก" className="app-nav-links">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={item.key === active ? "nav-link active" : "nav-link"}
              aria-current={item.key === active ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        {data && (
          <div className="app-user">
            <span className={isAdmin ? "badge badge-info" : "badge badge-confirmed"}>{isAdmin ? "ผู้ดูแลระบบ" : "พนักงาน"}</span>
            <button type="button" className="btn-ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
