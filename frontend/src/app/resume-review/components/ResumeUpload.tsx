"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ResumeUploadProps {
  onUploadComplete?: (data: any) => void
}

type UploadState = "idle" | "dragging" | "uploading" | "processing" | "complete" | "error"

export function ResumeUpload({ onUploadComplete }: ResumeUploadProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")
  const [documentId, setDocumentId] = useState<number | null>(null)
  const [extractedSummary, setExtractedSummary] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const pollStatus = useCallback((docId: number) => {
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const status = await api.getDocumentStatus(docId)
        if (status.processing_status === "complete" || status.processing_status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current)
          setState("complete")
          setProgress(100)
          setExtractedSummary(
            status.summary || `Extracted ${status.sections_count || 0} sections from your resume.`
          )
          onUploadComplete?.(status)
        } else if (status.processing_status === "error" || status.processing_status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current)
          setState("error")
          setError(status.error_message || status.error || "Processing failed. Please try again.")
        } else {
          // Still processing
          setProgress(Math.min(30 + attempts * 10, 90))
        }
      } catch {
        // Silently retry until max attempts
        if (attempts > 30) {
          if (pollRef.current) clearInterval(pollRef.current)
          setState("error")
          setError("Timed out waiting for processing. Please try again.")
        }
      }
    }, 2000)
  }, [onUploadComplete])

  const handleUpload = useCallback(async (file: File) => {
    // Validate
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setState("error")
      setError("Only PDF files are supported.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setState("error")
      setError("File size must be under 10MB.")
      return
    }

    setFileName(file.name)
    setState("uploading")
    setProgress(10)
    setError("")

    try {
      setProgress(25)
      const result = await api.uploadResumePdf(file)
      setProgress(30)
      setState("processing")
      setDocumentId(result.id || result.document_id)
      pollStatus(result.id || result.document_id)
    } catch (err: any) {
      setState("error")
      setError(err.message || "Upload failed. Please try again.")
    }
  }, [pollStatus])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState("idle")
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState("dragging")
  }, [])

  const handleDragLeave = useCallback(() => {
    setState("idle")
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const reset = useCallback(() => {
    setState("idle")
    setProgress(0)
    setFileName("")
    setError("")
    setDocumentId(null)
    setExtractedSummary("")
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => state === "idle" && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer",
          state === "dragging"
            ? "border-blue-400 bg-blue-500/5 scale-[1.01]"
            : state === "error"
            ? "border-destructive/50 bg-destructive/5"
            : state === "complete"
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-border/50 bg-muted/30 hover:border-border hover:bg-muted/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {state === "idle" || state === "dragging" ? (
          <>
            <div className="rounded-full bg-secondary p-3 mb-3">
              <UploadCloud className={cn(
                "h-6 w-6 transition-colors",
                state === "dragging" ? "text-blue-400" : "text-muted-foreground"
              )} />
            </div>
            <p className="text-sm font-medium">
              {state === "dragging" ? "Drop your PDF here" : "Drop your resume PDF here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF only · Max 10MB</p>
          </>
        ) : state === "uploading" || state === "processing" ? (
          <>
            <Loader2 className="h-6 w-6 text-blue-400 animate-spin mb-3" />
            <p className="text-sm font-medium">
              {state === "uploading" ? "Uploading" : "Extracting data from"} {fileName}
            </p>
            <div className="w-full max-w-xs mt-3">
              <Progress value={progress} className="h-1.5" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {state === "processing" ? "AI is parsing your resume…" : "Sending file…"}
            </p>
          </>
        ) : state === "complete" ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-3" />
            <p className="text-sm font-medium text-emerald-400">Resume Processed Successfully</p>
            <p className="text-xs text-muted-foreground mt-1">{extractedSummary}</p>
            <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={(e) => { e.stopPropagation(); reset(); }}>
              Upload Another
            </Button>
          </>
        ) : (
          <>
            <AlertCircle className="h-6 w-6 text-destructive mb-3" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={(e) => { e.stopPropagation(); reset(); }}>
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
