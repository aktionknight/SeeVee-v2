"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Sparkles, FileText, Briefcase, CheckCircle2 } from "lucide-react";

export function ResumeGenerator() {
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setErrorMsg("Please paste a job description.");
      return;
    }
    
    setIsGenerating(true);
    setErrorMsg(null);
    setResumeData(null);
    
    try {
      // 1. Analyze Job Description
      const jdAnalysis = await api.analyzeJobDescription({ raw_text: jobDescription });
      
      // 2. Generate Resume
      const generated = await api.generateTailoredResume({ 
        job_description_id: jdAnalysis.id 
      });
      
      setResumeData(generated);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to generate resume.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
          <CardDescription>Paste the job description to tailor your resume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jd" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Job Description
              </Label>
              <Textarea 
                id="jd" 
                placeholder="Paste Job Description here..." 
                className="min-h-[300px]"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleGenerate} 
            disabled={isGenerating || !jobDescription.trim()}
          >
            {isGenerating ? "Analyzing & Generating..." : "Generate Tailored Resume"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" /> Generated Resume
          </CardTitle>
          <CardDescription>Your AI-tailored resume will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          {resumeData ? (
            <div className="space-y-4">
              <div className="flex gap-2 mb-2">
                <Button className="flex-1" variant="outline" onClick={() => api.downloadResume(resumeData.id, "pdf").catch(e => console.error(e))}>
                  Download PDF
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => api.downloadResume(resumeData.id, "latex").catch(e => console.error(e))}>
                  Download LaTeX
                </Button>
              </div>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2">Professional Summary</h3>
                  <p className="text-sm text-muted-foreground">{resumeData.resume_json?.summary}</p>
                  
                  <h3 className="font-semibold text-lg mt-4 mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.resume_json?.skills?.map((skill: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-semibold text-lg mt-4 mb-2">Projects</h3>
                  <div className="space-y-3">
                    {resumeData.resume_json?.projects?.map((proj: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary/50 pl-3">
                        <div className="font-medium">{proj.title}</div>
                        <div className="text-xs text-muted-foreground mb-1">{proj.technologies?.join(", ")}</div>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {proj.bullets?.map((b: string, j: number) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <h3 className="font-semibold text-lg mt-4 mb-2">Experience</h3>
                  <div className="space-y-3">
                    {resumeData.resume_json?.experience?.map((exp: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary/50 pl-3">
                        <div className="font-medium">{exp.title}</div>
                        <div className="text-sm text-muted-foreground">{exp.company} | {exp.dates}</div>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                          {exp.bullets?.map((b: string, j: number) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm max-w-[250px]">Paste a job description and generate to see your tailored resume.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
