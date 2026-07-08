"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";

export function GeneratedResumesList() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const data = await api.listGeneratedResumes();
        setResumes(data);
      } catch (error) {
        console.error("Failed to load generated resumes", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResumes();
  }, []);

  if (isLoading) {
    return <div className="text-center py-8">Loading history...</div>;
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
        <FileText className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
        <h3 className="text-lg font-medium">No resumes generated yet</h3>
        <p className="text-sm text-muted-foreground mt-2">Go to the Generate Resume tab to create one.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {resumes.map((resume) => (
        <Card key={resume.id} className="bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Resume v{resume.version}
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-normal">
                {resume.match_score > 0 ? `${(resume.match_score * 100).toFixed(0)}% Match` : "Generated"}
              </span>
            </CardTitle>
            <CardDescription>
              {new Date(resume.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground line-clamp-2">
              {resume.resume_json?.summary || "No summary available"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                <Eye className="w-4 h-4" /> View
              </Button>
              <Button variant="secondary" size="sm" className="w-full flex items-center gap-2">
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
