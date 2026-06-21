import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Webhook, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col p-8 md:p-24 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Manage your integrations and campaigns.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/discover">
            <Button variant="outline">Discover Leads <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
          <Link href="/resume-review">
            <Button variant="outline">Resume Review <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Gmail Integration</CardTitle>
              <CardDescription>Connect to send automated outreach</CardDescription>
            </div>
            <Mail className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm font-medium">Not Connected</span>
              </div>
              <Button>Connect Gmail</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Apify Integration</CardTitle>
              <CardDescription>Connect to scrape jobs and leads</CardDescription>
            </div>
            <Webhook className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium">Connected</span>
              </div>
              <Button variant="secondary">Manage Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            No recent activity. Connect your Gmail to start reaching out!
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
