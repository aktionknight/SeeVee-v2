import "./globals.css"
import type { Metadata } from "next"
import { AuthProvider } from "@/context/AuthContext"

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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
