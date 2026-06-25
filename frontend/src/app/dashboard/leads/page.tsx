"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Search, Loader2, Trash2, Mail, Edit2, Building, Briefcase, Link as LinkIcon, Check, X, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Lead {
  id: number;
  person_name: string;
  person_role: string;
  company_name: string;
  linkedin_url: string;
  email: string | null;
  region: string | null;
  status: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapeQuery, setScrapeQuery] = useState("");
  const [scrapeMax, setScrapeMax] = useState("10");
  const [scraping, setScraping] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await api.listLeads();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeQuery) return;
    setScraping(true);
    try {
      const response = await api.scrapeLeads({ query: scrapeQuery, max_results: parseInt(scrapeMax) || 10 });
      setScrapeQuery("");

      if (response?.job_id) {
        let elapsed = 0;
        const interval = setInterval(async () => {
          try {
            const job = await api.getJob(response.job_id);
            if (job.status === "completed" || job.status === "failed") {
              clearInterval(interval);
              setScraping(false);
              if (job.status === "completed") {
                await fetchLeads();
              }
            }
          } catch (err) {
            console.error("Failed to check job status", err);
          }

          elapsed += 5000;
          if (elapsed >= 180000) { // Poll for 3 minutes max
            clearInterval(interval);
            setScraping(false);
          }
        }, 5000);
      } else {
        setScraping(false);
      }

    } catch (err) {
      console.error("Scrape failed", err);
      setScraping(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteLead(id);
      setLeads(leads.filter(l => l.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const startEmailEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditEmail(lead.email || "");
  };

  const saveEmailEdit = async (id: number) => {
    try {
      await api.updateLeadEmail(id, editEmail);
      setLeads(leads.map(l => l.id === id ? { ...l, email: editEmail } : l));
      setEditingId(null);
    } catch (err) {
      console.error("Update email failed", err);
    }
  };

  const cancelEmailEdit = () => {
    setEditingId(null);
  };

  const handleGenerate = async (lead: Lead) => {
    setGeneratingFor(lead.id);
    try {
      await api.generateIntelligence({
        lead_id: lead.id,
        user_profile: { name: "User", company: "SeeVee", product: "AI Sales Engine" },
        company_data: { name: lead.company_name },
        founder_data: { name: lead.person_name, role: lead.person_role },
        product_data: { description: "Outbound AI outreach generator" }
      });
      alert("Intelligence generation complete! Insights have been securely saved to your database.");
    } catch (err) {
      console.error("Generate failed", err);
      alert("Failed to generate intelligence.");
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-16 lg:p-24 space-y-12 animate-in fade-in duration-500 relative">

      {/* Background elements for rich aesthetics */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
        <div>
          <h1 className="text-2xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-3  drop-shadow-sm">
            Leads Intelligence
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl font-medium">
            Discover, manage, and refine high-quality prospects with our Apify integration and dynamic pipeline.
          </p>
        </div>
      </div>

      {/* Scraper Form Card */}
      <Card className="z-10 border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-colors duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3 text-white">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Search className="w-5 h-5" />
            </div>
            Source New Leads
          </CardTitle>
          <CardDescription className="text-base text-gray-400">
            Enter a role or industry to trigger an automated Apify search and populate your pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScrape} className="flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-3 w-full">
              <Label htmlFor="query" className="text-sm font-semibold text-gray-300">Search Query</Label>
              <Input
                id="query"
                placeholder="e.g. Software Engineer at Google in San Francisco"
                value={scrapeQuery}
                onChange={e => setScrapeQuery(e.target.value)}
                className="bg-black/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary text-base h-14 transition-all duration-300 shadow-inner"
              />
            </div>
            <div className="w-full md:w-32 space-y-3">
              <Label htmlFor="max" className="text-sm font-semibold text-gray-300">Max Results</Label>
              <Input
                id="max"
                type="number"
                min="1"
                max="100"
                value={scrapeMax}
                onChange={e => setScrapeMax(e.target.value)}
                className="bg-black/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary text-base h-14 transition-all duration-300 shadow-inner text-center"
              />
            </div>
            <Button
              type="submit"
              disabled={scraping || !scrapeQuery}
              className="w-full md:w-auto h-14 px-10 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.2)] hover:shadow-[0_0_35px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 transition-all duration-300"
            >
              {scraping ? (
                <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Scraping...</>
              ) : (
                "Run Scraper"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Leads Grid */}
      <div className="z-10 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Your Pipeline
            <span className="bg-primary/20 text-primary text-sm font-semibold py-1 px-4 rounded-full border border-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.2)]">{leads.length} leads</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-24 px-6 border-2 border-dashed border-white/10 rounded-3xl bg-black/20 backdrop-blur-sm">
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No leads found</h3>
            <p className="text-muted-foreground font-medium">Run a new scrape above to start building your pipeline.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-12 duration-1000 fill-mode-both">
            {leads.map((lead, idx) => (
              <Card
                key={lead.id}
                className="group relative border-white/10 bg-black/40 hover:bg-black/60 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40 flex flex-col justify-between overflow-hidden rounded-2xl"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Delete Action (Hidden until hover) */}
                <div className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-400/20 h-9 w-9 rounded-full bg-black/50 backdrop-blur-md" onClick={() => handleDelete(lead.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <CardHeader className="pb-5 pt-6 px-6">
                  <CardTitle className="text-xl font-bold line-clamp-1 pr-10 text-gray-100" title={lead.person_name}>{lead.person_name}</CardTitle>
                  <div className="flex flex-col space-y-2 mt-3">
                    <div className="flex items-center text-sm font-medium text-gray-400 gap-3">
                      <Briefcase className="w-4 h-4 text-primary shrink-0" />
                      <span className="line-clamp-1">{lead.person_role || "Unknown Role"}</span>
                    </div>
                    <div className="flex items-center text-sm font-medium text-gray-400 gap-3">
                      <Building className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="line-clamp-1">{lead.company_name || "Unknown Company"}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 px-6 flex-grow flex flex-col justify-end space-y-5">

                  {/* Email Section */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 group/email transition-all duration-300 hover:bg-white/10 hover:border-white/20">
                    {editingId === lead.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="h-9 text-sm bg-black/60 border-primary/50 focus-visible:ring-primary text-white"
                          placeholder="Email address..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEmailEdit(lead.id);
                            if (e.key === 'Escape') cancelEmailEdit();
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-green-400 hover:text-green-300 hover:bg-green-400/20 rounded-lg" onClick={() => saveEmailEdit(lead.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg" onClick={cancelEmailEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-sm max-w-[80%]">
                          <div className={`p-1.5 rounded-md ${lead.email ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'}`}>
                            <Mail className="w-4 h-4 shrink-0" />
                          </div>
                          <span className={`truncate font-medium ${lead.email ? 'text-gray-200' : 'text-gray-500 italic'}`}>
                            {lead.email || "No email added"}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover/email:opacity-100 transition-all duration-300 bg-white/5 hover:bg-white/20 rounded-lg scale-90 group-hover/email:scale-100"
                          onClick={() => startEmailEdit(lead)}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-300" />
                        </Button>
                      </div>
                    )}
                  </div>

                </CardContent>

                {lead.linkedin_url ? (
                  <CardFooter className="pt-0 pb-5 px-6 flex-col gap-3">
                    <a
                      href={lead.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center w-full py-2.5 rounded-xl bg-[#0077b5]/10 hover:bg-[#0077b5]/20 border border-[#0077b5]/20 text-sm font-semibold text-[#0077b5] transition-all duration-300 gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      View LinkedIn Profile
                    </a>
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 border-primary/40 hover:bg-primary/20 text-primary transition-all duration-300 rounded-xl"
                        disabled={generatingFor === lead.id}
                        onClick={() => handleGenerate(lead)}
                        title="Generate AI Outreach"
                      >
                        {generatingFor === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </Button>
                      <Link href={`/dashboard/outreach/${lead.id}`} className="w-full">
                        <Button 
                          variant="secondary" 
                          className="w-full flex items-center justify-center gap-2 transition-all duration-300 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                        >
                          View Outreach <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                ) : (
                  <CardFooter className="pt-0 pb-5 px-6 flex-col gap-3">
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2 border-primary/40 hover:bg-primary/20 text-primary transition-all duration-300 rounded-xl"
                        disabled={generatingFor === lead.id}
                        onClick={() => handleGenerate(lead)}
                        title="Generate AI Outreach"
                      >
                        {generatingFor === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </Button>
                      <Link href={`/dashboard/outreach/${lead.id}`} className="w-full">
                        <Button 
                          variant="secondary" 
                          className="w-full flex items-center justify-center gap-2 transition-all duration-300 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                        >
                          View Outreach <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                )}

                {/* Bottom Glow Accent */}
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center opacity-70" />
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
