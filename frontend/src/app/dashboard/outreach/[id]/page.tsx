"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Send, Sparkles, User, Briefcase, Mail, CheckCircle2, Target, Lightbulb, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";

export default function OutreachPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = parseInt(params.id as string);

  const [lead, setLead] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchData();
    }
  }, [leadId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // We don't have a getLead endpoint, so we fetch all and find it
      const leads = await api.listLeads();
      const currentLead = leads.find(l => l.id === leadId);
      setLead(currentLead);

      try {
        const ins = await api.getInsights(leadId);
        setInsights(ins);
      } catch (e) {
        console.warn("No insights found yet");
      }

      try {
        const cont = await api.getGeneratedContent(leadId);
        setContent(cont);
      } catch (e) {
        console.warn("No content found yet");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!lead?.email || !content?.email?.content) return;
    setSending(true);
    try {
      await api.sendEmail({
        to: lead.email,
        subject: content.email.metadata?.subject || "Reaching out",
        body_html: content.email.content.replace(/\n/g, "<br />"),
        body_text: content.email.content,
      });
      alert("Email sent successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to send email. Check if Gmail is connected.");
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    if (!lead) return;
    setGenerating(true);
    try {
      const res = await api.generateIntelligence({
        lead_id: lead.id,
        user_profile: { name: "User", company: "SeeVee", product: "AI Sales Engine" },
        company_data: { name: lead.company_name },
        founder_data: { name: lead.person_name, role: lead.person_role },
        product_data: { description: "Outbound AI outreach generator" },
        query: query
      });
      if (res?.data?.status === "unqualified") {
        alert(`Lead Unqualified: ${res.data.reason}`);
      }
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to generate outreach.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-24 flex justify-center"><Sparkles className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!lead) {
    return <div className="p-24 text-center text-white">Lead not found</div>;
  }

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-16 lg:p-24 space-y-8 animate-in fade-in duration-500 relative">
      <div className="fixed top-[-20%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="flex items-center gap-4 z-10">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Outreach Intelligence
          </h1>
          <p className="text-muted-foreground font-medium">
            AI-generated personalized outreach for {lead.person_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
        
        {/* Left Column: Lead Info & Insights */}
        <div className="space-y-8 lg:col-span-1">
          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Name</p>
                <p className="text-base font-semibold text-white">{lead.person_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Role</p>
                <p className="text-base font-medium text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" /> {lead.person_role}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-base font-medium text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-400" /> {lead.email || "Unknown"}
                </p>
              </div>
            </CardContent>
          </Card>

          {insights && (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" /> Insights & Signals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Match Score: <span className="text-xl text-white">{insights.score}/10</span></p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-300 mb-3">AI Personalization Hooks</p>
                  <ul className="space-y-2">
                    {insights.hooks?.map((hook: any, idx: number) => (
                      <li key={idx} className="bg-white/5 p-3 rounded-lg text-sm text-gray-200 border border-white/5 flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> {hook.text || hook.hook || JSON.stringify(hook)}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Generated Content */}
        <div className="space-y-8 lg:col-span-2">

          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl text-white">Generation Intent</CardTitle>
              <CardDescription className="text-gray-400">Specify the intent of the cold outreach (e.g. asking for internship, selling a product).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Request an internship opportunity"
                className="bg-black/50 border-white/10 text-white focus-visible:ring-primary flex-1"
              />
              <Button onClick={handleRegenerate} disabled={generating} className="bg-primary hover:bg-primary/90 text-white sm:min-w-[140px]">
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate
              </Button>
            </CardContent>
          </Card>

          {!content ? (
            <Card className="border-white/10 bg-black/40 backdrop-blur-xl h-full flex flex-col items-center justify-center p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Outreach Generated</h3>
              <p className="text-muted-foreground mb-6">Click "Generate AI Outreach" on the Leads page first.</p>
              <Link href="/dashboard/leads">
                <Button variant="outline" className="border-primary text-primary">Go to Leads</Button>
              </Link>
            </Card>
          ) : (
            <>
              {/* Email Content */}
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-xl text-white flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Cold Email Draft</CardTitle>
                  <Button onClick={handleSendEmail} disabled={sending || !lead.email} className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Email
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Subject</p>
                    <p className="text-lg font-bold text-white">{content.email?.metadata?.subject || "No Subject"}</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-xl border border-white/10 whitespace-pre-wrap text-gray-200 text-sm md:text-base leading-relaxed">
                    {content.email?.content || "No body generated."}
                  </div>
                </CardContent>
              </Card>

              {/* LinkedIn Content */}
              <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[#0077b5]" /> LinkedIn Connection Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#0077b5]/10 p-6 rounded-xl border border-[#0077b5]/30 whitespace-pre-wrap text-gray-200 text-sm md:text-base leading-relaxed relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#0077b5] rounded-l-xl"></div>
                    {content.linkedin?.content || "No message generated."}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
