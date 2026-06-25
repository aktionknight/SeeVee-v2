import "./globals.css"
import type { Metadata } from "next"
import { AuthProvider } from "@/context/AuthContext"
import { BackButton } from "@/components/BackButton"

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
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <BackButton />
          </div>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
