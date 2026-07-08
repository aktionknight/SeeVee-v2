"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Plus,
  Pencil,
  Trash2,
  Briefcase,
  Building2,
  Calendar,
} from "lucide-react"
import { api } from "@/lib/api"

interface ExperienceListProps {
  experiences: any[]
  onRefresh: () => void
  isLoading: boolean
}

const emptyExperience = {
  company: "",
  role: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description: "",
  bullet_points: "",
  location: "",
}

export function ExperienceList({ experiences, onRefresh, isLoading }: ExperienceListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExp, setEditingExp] = useState<any>(null)
  const [formData, setFormData] = useState(emptyExperience)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const openAddDialog = useCallback(() => {
    setEditingExp(null)
    setFormData(emptyExperience)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((exp: any) => {
    setEditingExp(exp)
    setFormData({
      company: exp.company || "",
      role: exp.role || "",
      start_date: exp.start_date || "",
      end_date: exp.end_date || "",
      is_current: exp.is_current || false,
      description: exp.description || "",
      bullet_points: Array.isArray(exp.bullet_points) ? exp.bullet_points.join("\n") : (exp.bullet_points || ""),
      location: exp.location || "",
    })
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        bullet_points: formData.bullet_points.split("\n").map((b: string) => b.trim()).filter(Boolean),
      }
      if (editingExp) {
        await api.updateExperience(editingExp.id, payload)
      } else {
        await api.createExperience(payload)
      }
      setDialogOpen(false)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to save experience:", err)
    } finally {
      setIsSaving(false)
    }
  }, [formData, editingExp, onRefresh])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.deleteExperience(id)
      setDeleteConfirm(null)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to delete experience:", err)
    }
  }, [onRefresh])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Work Experience</h3>
          <p className="text-xs text-muted-foreground">{experiences.length} position{experiences.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Experience
        </Button>
      </div>

      {experiences.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No experience added</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
              Add your work experience or upload a resume to extract it automatically.
            </p>
            <Button variant="outline" size="sm" onClick={openAddDialog} className="mt-4 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Experience
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border/50" />

          {experiences.map((exp, index) => (
            <div key={exp.id} className="relative flex gap-4 pb-6 group">
              {/* Timeline dot */}
              <div className="relative z-10 mt-1.5 shrink-0">
                <div className="h-[10px] w-[10px] rounded-full border-2 border-blue-400 bg-background ring-4 ring-background" />
              </div>

              <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border/50 hover:border-border transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm tracking-tight">{exp.role || "Role"}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {exp.company || "Company"}
                        </span>
                        {exp.location && (
                          <span>· {exp.location}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {exp.start_date || "Start"} — {exp.is_current ? "Present" : (exp.end_date || "End")}
                      </div>
                      {exp.source && (
                        <div className="mt-1.5">
                          <SourceBadge source={exp.source} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(exp)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {deleteConfirm === exp.id ? (
                        <div className="flex gap-1">
                          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(exp.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(null)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(exp.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{exp.description}</p>
                  )}

                  {Array.isArray(exp.bullet_points) && exp.bullet_points.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {exp.bullet_points.map((bp: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                          <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                          <span>{bp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExp ? "Edit Experience" : "Add Experience"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp-role">Role *</Label>
                <Input
                  id="exp-role"
                  value={formData.role}
                  onChange={(e) => setFormData((d) => ({ ...d, role: e.target.value }))}
                  placeholder="Senior Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-company">Company *</Label>
                <Input
                  id="exp-company"
                  value={formData.company}
                  onChange={(e) => setFormData((d) => ({ ...d, company: e.target.value }))}
                  placeholder="Google"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp-start">Start Date</Label>
                <Input
                  id="exp-start"
                  value={formData.start_date}
                  onChange={(e) => setFormData((d) => ({ ...d, start_date: e.target.value }))}
                  placeholder="Jan 2022"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-end">End Date</Label>
                <Input
                  id="exp-end"
                  value={formData.end_date}
                  onChange={(e) => setFormData((d) => ({ ...d, end_date: e.target.value }))}
                  placeholder="Present"
                  disabled={formData.is_current}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_current}
                    onChange={(e) => setFormData((d) => ({ ...d, is_current: e.target.checked, end_date: "" }))}
                    className="rounded"
                  />
                  Currently working here
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-location">Location</Label>
              <Input
                id="exp-location"
                value={formData.location}
                onChange={(e) => setFormData((d) => ({ ...d, location: e.target.value }))}
                placeholder="Mountain View, CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-desc">Description</Label>
              <Textarea
                id="exp-desc"
                value={formData.description}
                onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
                placeholder="Brief role description…"
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-bullets">Key Achievements (one per line)</Label>
              <Textarea
                id="exp-bullets"
                value={formData.bullet_points}
                onChange={(e) => setFormData((d) => ({ ...d, bullet_points: e.target.value }))}
                placeholder="Led team of 5 engineers&#10;Improved API performance by 3x"
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.role.trim() || !formData.company.trim() || isSaving}>
              {isSaving ? "Saving…" : editingExp ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
