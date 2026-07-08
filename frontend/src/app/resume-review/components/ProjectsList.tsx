"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  ExternalLink,
  FolderKanban,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ProjectsListProps {
  projects: any[]
  onRefresh: () => void
  isLoading: boolean
}

const emptyProject = {
  title: "",
  description: "",
  technologies: "",
  bullet_points: "",
  url: "",
  source: "user_added",
}

export function ProjectsList({ projects, onRefresh, isLoading }: ProjectsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [formData, setFormData] = useState(emptyProject)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const openAddDialog = useCallback(() => {
    setEditingProject(null)
    setFormData(emptyProject)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((project: any) => {
    setEditingProject(project)
    setFormData({
      title: project.title || "",
      description: project.description || "",
      technologies: Array.isArray(project.technologies) ? project.technologies.join(", ") : (project.technologies || ""),
      bullet_points: Array.isArray(project.bullet_points) ? project.bullet_points.join("\n") : (project.bullet_points || ""),
      url: project.url || "",
      source: project.source || "user_added",
    })
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        technologies: formData.technologies.split(",").map((t: string) => t.trim()).filter(Boolean),
        bullet_points: formData.bullet_points.split("\n").map((b: string) => b.trim()).filter(Boolean),
      }
      if (editingProject) {
        await api.updateProject(editingProject.id, payload)
      } else {
        await api.createProject(payload)
      }
      setDialogOpen(false)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to save project:", err)
    } finally {
      setIsSaving(false)
    }
  }, [formData, editingProject, onRefresh])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.deleteProject(id)
      setDeleteConfirm(null)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to delete project:", err)
    }
  }, [onRefresh])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Projects</h3>
          <p className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""} in your profile</p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No projects yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
              Add your projects manually or upload a resume to auto-extract them.
            </p>
            <Button variant="outline" size="sm" onClick={openAddDialog} className="mt-4 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group bg-card/50 backdrop-blur-sm border-border/50 hover:border-border transition-all duration-300 hover:scale-[1.01] hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base tracking-tight leading-tight truncate">
                      {project.title}
                    </CardTitle>
                    {project.source && (
                      <SourceBadge source={project.source} />
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(project)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {deleteConfirm === project.id ? (
                      <div className="flex gap-1">
                        <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(project.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(project.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                {/* Technologies */}
                {((Array.isArray(project.technologies) && project.technologies.length > 0) ||
                  (typeof project.technologies === "string" && project.technologies)) && (
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(project.technologies)
                      ? project.technologies
                      : project.technologies.split(",").map((t: string) => t.trim())
                    ).slice(0, 6).map((tech: string) => (
                      <Badge key={tech} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tech}
                      </Badge>
                    ))}
                    {(Array.isArray(project.technologies) ? project.technologies.length : 0) > 6 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        +{project.technologies.length - 6}
                      </Badge>
                    )}
                  </div>
                )}
                {/* Bullet Points */}
                {Array.isArray(project.bullet_points) && project.bullet_points.length > 0 && (
                  <ul className="space-y-1">
                    {project.bullet_points.slice(0, 3).map((bp: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        <span className="line-clamp-1">{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Project
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)} className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="proj-title">Title *</Label>
              <Input
                id="proj-title"
                value={formData.title}
                onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))}
                placeholder="My Awesome Project"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-desc">Description</Label>
              <Textarea
                id="proj-desc"
                value={formData.description}
                onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
                placeholder="Brief description of the project…"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-tech">Technologies (comma-separated)</Label>
              <Input
                id="proj-tech"
                value={formData.technologies}
                onChange={(e) => setFormData((d) => ({ ...d, technologies: e.target.value }))}
                placeholder="React, TypeScript, Node.js"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-bullets">Bullet Points (one per line)</Label>
              <Textarea
                id="proj-bullets"
                value={formData.bullet_points}
                onChange={(e) => setFormData((d) => ({ ...d, bullet_points: e.target.value }))}
                placeholder="Built a scalable API serving 10k req/s&#10;Reduced load time by 40%"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proj-url">URL</Label>
              <Input
                id="proj-url"
                value={formData.url}
                onChange={(e) => setFormData((d) => ({ ...d, url: e.target.value }))}
                placeholder="https://github.com/…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.title.trim() || isSaving}>
              {isSaving ? "Saving…" : editingProject ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
