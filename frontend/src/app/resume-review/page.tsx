"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Sparkles, FileText, Briefcase, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

export default function ResumeReviewPage() {
  const [resumeText, setResumeText] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleReview = async () => {
    if (!resumeText.trim()) {
      setErrorMsg("Please paste your resume text to get a review.")
      return
    }
    
    setIsReviewing(true)
    setReviewResult(null)
    setErrorMsg(null)
    
    try {
      const response = await api.reviewResumeText({
        resume_text: resumeText,
        job_description: jobDescription,
      })
      
      setReviewResult(response.review)
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to generate review. Please try again.")
    } finally {
      setIsReviewing(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-24 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tailored Resume & Email Review</h1>
        <p className="text-muted-foreground">Paste your resume text to get AI-powered feedback and customized cold emails.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Input Details</CardTitle>
            <CardDescription>Paste your resume and target job description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="resume-text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Resume Text
              </Label>
              <Textarea 
                id="resume-text" 
                placeholder="Paste the raw text of your resume here..." 
                className="min-h-[200px]"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="job-description" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Target Job Description (Optional)
              </Label>
              <Textarea 
                id="job-description" 
                placeholder="Paste the job description you are targeting..." 
                className="min-h-[120px]"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            {errorMsg && (
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMsg}
              </div>
            )}
            <Button className="w-full" disabled={!resumeText.trim() || isReviewing} onClick={handleReview}>
              {isReviewing ? "Analyzing with AI..." : "Review Resume"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI Feedback
            </CardTitle>
            <CardDescription>Your tailored review will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/50 max-h-[500px] overflow-y-auto">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <h3 className="font-semibold text-lg">Review Complete</h3>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {reviewResult}
                  </div>
                </div>
                <Button variant="outline" className="w-full">Generate Tailored Cold Email</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4 text-muted-foreground border-2 border-dashed rounded-lg">
                <Sparkles className="h-12 w-12 opacity-20" />
                <p className="text-sm max-w-[250px]">Paste your resume and click review to generate AI insights.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

