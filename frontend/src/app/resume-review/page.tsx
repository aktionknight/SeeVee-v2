"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, CheckCircle2, Sparkles } from "lucide-react"

export default function ResumeReviewPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setReviewResult(null)
    }
  }

  const handleReview = () => {
    if (!file) return
    setIsReviewing(true)
    // Simulate API call
    setTimeout(() => {
      setIsReviewing(false)
      setReviewResult("Your resume looks great! However, you could improve the action verbs in your recent experience section. Let me generate a tailored version for your next application.")
    }, 2000)
  }

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-24 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tailored Resume & Email Review</h1>
        <p className="text-muted-foreground">Upload your resume to get AI-powered feedback and customized cold emails.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle>Upload Resume</CardTitle>
            <CardDescription>PDF, DOCX up to 5MB</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <Label htmlFor="resume-upload" className="cursor-pointer">
              <div className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors">
                Select File
              </div>
              <Input id="resume-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
            </Label>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" /> {file.name}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={!file || isReviewing} onClick={handleReview}>
              {isReviewing ? "Analyzing..." : "Review Resume"}
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
                <div className="flex items-start gap-3 rounded-lg border p-4 bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <p className="text-sm leading-relaxed">{reviewResult}</p>
                </div>
                <Button variant="outline" className="w-full">Generate Tailored Cold Email</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center space-y-2 text-muted-foreground">
                <Sparkles className="h-8 w-8 opacity-20" />
                <p className="text-sm">Upload and review your resume to generate insights.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
