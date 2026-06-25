"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Mail, 
  Webhook, 
  ArrowRight, 
  LogOut, 
  Settings, 
  CheckCircle2, 
  XCircle,
  Users,
  Send,
  MessageCircle,
  TrendingUp,
  Activity,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email: string } | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getGmailStatus().catch(() => ({ gmail_connected: false, email: "" })),
      api.listLeads().catch(() => [])
    ]).then(([gmailRes, leadsRes]) => {
      setGmailStatus({ connected: gmailRes.gmail_connected, email: gmailRes.email });
      setLeads(leadsRes || []);
      setIsLoading(false);
    });
  }, []);

  // Mocked Metrics
  const totalLeads = leads.length;
  const emailsSent = Math.floor(totalLeads * 0.8) || 124;
  const responses = Math.floor(emailsSent * 0.25) || 31;
  const responseRate = emailsSent ? Math.round((responses / emailsSent) * 100) : 0;

  // Mocked Recent Activity
  const recentActivity = [
    { id: 1, type: "email_sent", message: "Outreach email sent to Sarah Jenkins", time: "2 hours ago", status: "success" },
    { id: 2, type: "response", message: "Response received from TechCorp Inc.", time: "5 hours ago", status: "info" },
    { id: 3, type: "lead_added", message: "New lead extracted from LinkedIn", time: "1 day ago", status: "success" },
    { id: 4, type: "draft_created", message: "Draft generated for 'Frontend Developer' at Acme", time: "1 day ago", status: "warning" },
  ];

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-16 space-y-10 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Welcome back{user?.name ? `, ${user.name}` : ''}. Here's what's happening with your outreach.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/leads">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
              Manage Leads <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/resume-review">
            <Button variant="secondary" className="shadow-sm hover:shadow-md transition-all">
              Resume Review <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="outline" size="icon" title="Settings" className="hover:bg-accent transition-colors">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "..." : totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 flex items-center inline-flex">
                <TrendingUp className="h-3 w-3 mr-1" /> +12%
              </span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <Send className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "..." : emailsSent}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active campaigns generating pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-full">
              <MessageCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "..." : responses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting your reply
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-full">
              <Activity className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "..." : `${responseRate}%`}</div>
            <div className="w-full bg-secondary h-2 mt-3 rounded-full overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-1000 ease-in-out" 
                style={{ width: `${responseRate}%` }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        
        {/* Left Column: Integrations */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <h2 className="text-2xl font-semibold tracking-tight">Integrations</h2>
          
          <Card className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-red-500/10 rounded-lg">
                    <Mail className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Gmail API</CardTitle>
                    <CardDescription>Send and receive emails</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                <div className="flex items-center space-x-2">
                  {gmailStatus?.connected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Connected</span>
                        {gmailStatus.email && (
                          <span className="text-xs text-muted-foreground">{gmailStatus.email}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="text-sm font-medium">Disconnected</span>
                    </>
                  )}
                </div>
                {!gmailStatus?.connected && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/google/login`;
                    }}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                    <Webhook className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Apify Scraper</CardTitle>
                    <CardDescription>Automated lead extraction</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3 ml-1 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-medium">Active</span>
                </div>
                <Link href="/dashboard/settings">
                  <Button variant="outline" size="sm">Configure</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity & Status */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Recent Activity</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              View All
            </Button>
          </div>

          <Card className="h-[380px] flex flex-col shadow-sm border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg font-medium">Live Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {recentActivity.map((item, i) => (
                <div 
                  key={item.id} 
                  className={`flex items-start gap-4 p-4 border-b border-border/40 hover:bg-muted/30 transition-colors ${
                    i === recentActivity.length - 1 ? 'border-0' : ''
                  }`}
                >
                  <div className={`mt-0.5 p-2 rounded-full ${
                    item.status === 'success' ? 'bg-green-500/10 text-green-500' :
                    item.status === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {item.type === 'email_sent' ? <Send className="h-4 w-4" /> :
                     item.type === 'response' ? <MessageCircle className="h-4 w-4" /> :
                     <UserPlus className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{item.message}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="p-4 bg-muted/20 border-t border-border/40 flex justify-between items-center rounded-b-xl">
               <span className="text-xs text-muted-foreground flex items-center">
                 <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                 System operating normally
               </span>
               <Link href="/dashboard/leads" className="text-xs font-medium text-primary hover:underline flex items-center">
                 Launch new campaign <ArrowRight className="ml-1 h-3 w-3" />
               </Link>
            </CardFooter>
          </Card>
        </div>

      </div>
    </div>
  )
}
