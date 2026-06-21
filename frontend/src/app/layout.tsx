import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SeeVee SaaS",
  description: "Modern Resume Review and Cold Reach Automation",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  )
}
