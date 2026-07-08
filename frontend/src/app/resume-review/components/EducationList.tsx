"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { SourceBadge } from "./SourceBadge"
import { Plus, Trash2, GraduationCap, Calendar } from "lucide-react"
import { api } from "@/lib/api"

interface EducationListProps {
  education: any[]
  onRefresh: () => void
  isLoading: boolean
}

const emptyEducation = {
  institution: "",
  degree: "",
  field: "",
  start_date: "",
  end_date: "",
  gpa: "",
  description: "",
}

export function EducationList({ education, onRefresh, isLoading }: EducationListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState(emptyEducation)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const openAddDialog = useCallback(() => {
    setFormData(emptyEducation)
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await api.createEducation(formData)
      setDialogOpen(false)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to save education:", err)
    } finally {
      setIsSaving(false)
    }
  }, [formData, onRefresh])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.deleteEducation(id)
      setDeleteConfirm(null)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to delete education:", err)
    }
  }, [onRefresh])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Education</h3>
          <p className="text-xs text-muted-foreground">{education.length} entr{education.length !== 1 ? "ies" : "y"}</p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Education
        </Button>
      </div>

      {education.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No education added</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
              Add your educational background or upload a resume.
            </p>
            <Button variant="outline" size="sm" onClick={openAddDialog} className="mt-4 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Education
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {education.map((edu) => (
            <Card
              key={edu.id}
              className="group bg-card/50 backdrop-blur-sm border-border/50 hover:border-border transition-all duration-300 hover:scale-[1.01]"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3">
                    <div className="rounded-lg bg-secondary p-2 h-fit shrink-0">
                      <GraduationCap className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm tracking-tight">{edu.institution || "Institution"}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[edu.degree, edu.field].filter(Boolean).join(" in ") || "Degree"}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {edu.start_date || "Start"} — {edu.end_date || "End"}
                      </div>
                      {edu.gpa && (
                        <p className="text-xs text-muted-foreground mt-1">GPA: {edu.gpa}</p>
                      )}
                      {edu.source && (
                        <div className="mt-1.5">
                          <SourceBadge source={edu.source} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {deleteConfirm === edu.id ? (
                      <div className="flex gap-1">
                        <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(edu.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(edu.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Education</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edu-institution">Institution *</Label>
              <Input
                id="edu-institution"
                value={formData.institution}
                onChange={(e) => setFormData((d) => ({ ...d, institution: e.target.value }))}
                placeholder="MIT"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edu-degree">Degree</Label>
                <Input
                  id="edu-degree"
                  value={formData.degree}
                  onChange={(e) => setFormData((d) => ({ ...d, degree: e.target.value }))}
                  placeholder="B.S."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edu-field">Field of Study</Label>
                <Input
                  id="edu-field"
                  value={formData.field}
                  onChange={(e) => setFormData((d) => ({ ...d, field: e.target.value }))}
                  placeholder="Computer Science"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edu-start">Start Date</Label>
                <Input
                  id="edu-start"
                  value={formData.start_date}
                  onChange={(e) => setFormData((d) => ({ ...d, start_date: e.target.value }))}
                  placeholder="Aug 2018"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edu-end">End Date</Label>
                <Input
                  id="edu-end"
                  value={formData.end_date}
                  onChange={(e) => setFormData((d) => ({ ...d, end_date: e.target.value }))}
                  placeholder="May 2022"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edu-gpa">GPA (optional)</Label>
              <Input
                id="edu-gpa"
                value={formData.gpa}
                onChange={(e) => setFormData((d) => ({ ...d, gpa: e.target.value }))}
                placeholder="3.9 / 4.0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.institution.trim() || isSaving}>
              {isSaving ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
