import type { Metadata, Viewport } from "next"
import "@fontsource/ibm-plex-sans-thai/400.css"
import "@fontsource/ibm-plex-sans-thai/500.css"
import "@fontsource/ibm-plex-sans-thai/600.css"
import "./globals.css"
import { Providers } from "@/components/Providers"

export const metadata: Metadata = {
  title: "Doc Delivery",
  description: "Internal document delivery and confirmation system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Doc Delivery",
  },
  other: {
    google: "notranslate",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="notranslate">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
