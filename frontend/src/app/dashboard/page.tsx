"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Webhook, ArrowRight, LogOut, Settings, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email: string } | null>(null);

  useEffect(() => {
    api.getGmailStatus()
      .then((data) => setGmailStatus({ connected: data.gmail_connected, email: data.email }))
      .catch(() => setGmailStatus({ connected: false, email: "" }));
  }, []);

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-24 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ''}. Manage your integrations and campaigns.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/discover">
            <Button variant="outline">Discover Leads <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
          <Link href="/resume-review">
            <Button variant="outline">Resume Review <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="outline" size="icon" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Gmail Integration</CardTitle>
              <CardDescription>Read, send emails, and manage drafts</CardDescription>
            </div>
            <Mail className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {gmailStatus?.connected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">Connected</span>
                    {gmailStatus.email && (
                      <span className="text-xs text-muted-foreground">({gmailStatus.email})</span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-500">Not Connected</span>
                  </>
                )}
              </div>
              {!gmailStatus?.connected && (
                <Button
                  onClick={() => {
                    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/google/login`;
                  }}
                >
                  Connect Gmail
                </Button>
              )}
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
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground/50"></span>
                </span>
                <span className="text-sm font-medium text-muted-foreground">Check settings</span>
              </div>
              <Link href="/dashboard/settings">
                <Button variant="secondary">Manage API Key</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            No recent activity. Connect your integrations to start reaching out!
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
