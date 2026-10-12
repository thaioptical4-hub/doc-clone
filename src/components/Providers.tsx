"use client"

import { SessionProvider, useSession } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

/** True when the signed-in user may see reports and delete documents. The server enforces this too. */
export function useIsAdmin(): boolean {
  const { data } = useSession()
  return data?.role === "admin"
}
