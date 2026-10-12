"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { AppNav } from "@/components/AppNav"
import SendPage from "@/app/send/page"
import ReceivePage from "@/app/receive/page"

function HomeContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") === "receive" ? "receive" : "send"

  return (
    <>
      <AppNav active={tab} />
      <div className="container">
        {tab === "send" ? <SendPage /> : <ReceivePage />}
      </div>
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container" style={{ marginTop: 24 }}>กำลังโหลด...</div>}>
      <HomeContent />
    </Suspense>
  )
}
