"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ResumeUpload } from "./ResumeUpload"
import {
  User,
  FolderKanban,
  Cpu,
  Briefcase,
  Pencil,
  Check,
  X,
  Sparkles,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ProfileOverviewProps {
  profile: any
  stats: { skills: number; projects: number; experiences: number; education: number; achievements: number }
  onProfileUpdate: (data: any) => void
  onUploadComplete?: (data: any) => void
  isLoading: boolean
}

export function ProfileOverview({ profile, stats, onProfileUpdate, onUploadComplete, isLoading }: ProfileOverviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    full_name: "",
    headline: "",
    summary: "",
    location: "",
    website: "",
    linkedin_url: "",
    github_url: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setEditData({
        full_name: profile.full_name || "",
        headline: profile.headline || "",
        summary: profile.summary || "",
        location: profile.location || "",
        website: profile.website || "",
        linkedin_url: profile.linkedin_url || "",
        github_url: profile.github_url || "",
      })
    }
  }, [profile])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const updated = await api.updateCareerProfile(editData)
      onProfileUpdate(updated)
      setIsEditing(false)
    } catch (err: any) {
      console.error("Failed to update profile:", err)
    } finally {
      setIsSaving(false)
    }
  }, [editData, onProfileUpdate])

  const statCards = [
    { label: "Skills", value: stats.skills, icon: Cpu, color: "text-blue-400" },
    { label: "Projects", value: stats.projects, icon: FolderKanban, color: "text-emerald-400" },
    { label: "Experience", value: stats.experiences, icon: Briefcase, color: "text-amber-400" },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-border transition-all duration-300 hover:scale-[1.02]"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("rounded-lg bg-secondary p-2.5", stat.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Profile Info */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 p-2.5">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg tracking-tight">Profile Information</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your career identity</p>
            </div>
          </div>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
                <Check className="h-3.5 w-3.5" />
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={editData.full_name}
                  onChange={(e) => setEditData((d) => ({ ...d, full_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={editData.headline}
                  onChange={(e) => setEditData((d) => ({ ...d, headline: e.target.value }))}
                  placeholder="Senior Software Engineer"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={editData.summary}
                  onChange={(e) => setEditData((d) => ({ ...d, summary: e.target.value }))}
                  placeholder="A brief professional summary…"
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editData.location}
                  onChange={(e) => setEditData((d) => ({ ...d, location: e.target.value }))}
                  placeholder="San Francisco, CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={editData.website}
                  onChange={(e) => setEditData((d) => ({ ...d, website: e.target.value }))}
                  placeholder="https://yoursite.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  value={editData.linkedin_url}
                  onChange={(e) => setEditData((d) => ({ ...d, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github_url">GitHub</Label>
                <Input
                  id="github_url"
                  value={editData.github_url}
                  onChange={(e) => setEditData((d) => ({ ...d, github_url: e.target.value }))}
                  placeholder="https://github.com/…"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">{profile?.full_name || "Your Name"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{profile?.headline || "Add a headline"}</p>
              </div>
              {profile?.summary && (
                <>
                  <Separator className="bg-border/50" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{profile.summary}</p>
                </>
              )}
              {(profile?.location || profile?.website) && (
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {profile?.location && <span>📍 {profile.location}</span>}
                  {profile?.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">🌐 {profile.website}</a>}
                  {profile?.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LinkedIn</a>}
                  {profile?.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>}
                </div>
              )}
              {!profile?.full_name && !profile?.headline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Sparkles className="h-4 w-4" />
                  Upload a resume to auto-fill your profile, or click Edit to add details manually.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Resume */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Import from Resume</CardTitle>
          <p className="text-xs text-muted-foreground">Upload a PDF to auto-extract your profile data</p>
        </CardHeader>
        <CardContent>
          <ResumeUpload onUploadComplete={onUploadComplete} />
        </CardContent>
      </Card>
    </div>
  )
}
