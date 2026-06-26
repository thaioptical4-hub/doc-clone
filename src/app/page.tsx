"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import TabBar from "@/components/TabBar"
import SendPage from "@/app/send/page"
import ReceivePage from "@/app/receive/page"

function HomeContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "receive" ? "receive" : "send"
  const [tab, setTab] = useState<"send" | "receive">(initialTab)

  return (
    <>
      <TabBar active={tab} onChange={setTab} />
      <div className="container">
        {tab === "send" ? <SendPage /> : <ReceivePage />}
      </div>
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container" style={{ marginTop: 24 }}>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
