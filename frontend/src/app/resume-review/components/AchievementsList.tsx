"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { SourceBadge } from "./SourceBadge"
import { Plus, Trash2, Trophy, Award, Medal, Star } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AchievementsListProps {
  achievements: any[]
  onRefresh: () => void
  isLoading: boolean
}

const ACHIEVEMENT_TYPES = [
  "Award",
  "Certification",
  "Hackathon",
  "Publication",
  "Patent",
  "Speaking",
  "Open Source",
  "Other",
]

const typeIcons: Record<string, React.ElementType> = {
  Award: Award,
  Certification: Medal,
  Hackathon: Trophy,
  Publication: Star,
}

const typeColors: Record<string, string> = {
  Award: "from-amber-500/20 to-transparent",
  Certification: "from-emerald-500/20 to-transparent",
  Hackathon: "from-purple-500/20 to-transparent",
  Publication: "from-blue-500/20 to-transparent",
}

const emptyAchievement = {
  title: "",
  type: "Award",
  issuer: "",
  date: "",
  description: "",
  url: "",
}

export function AchievementsList({ achievements, onRefresh, isLoading }: AchievementsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState(emptyAchievement)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {}
    for (const a of achievements) {
      const type = a.type || "Other"
      if (!groups[type]) groups[type] = []
      groups[type].push(a)
    }
    return groups
  }, [achievements])

  const openAddDialog = useCallback(() => {
    setFormData(emptyAchievement)
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await api.createAchievement(formData)
      setDialogOpen(false)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to save achievement:", err)
    } finally {
      setIsSaving(false)
    }
  }, [formData, onRefresh])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.deleteAchievement(id)
      setDeleteConfirm(null)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to delete achievement:", err)
    }
  }, [onRefresh])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Achievements</h3>
          <p className="text-xs text-muted-foreground">{achievements.length} achievement{achievements.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Achievement
        </Button>
      </div>

      {achievements.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No achievements added</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
              Add awards, certifications, hackathon wins, and more.
            </p>
            <Button variant="outline" size="sm" onClick={openAddDialog} className="mt-4 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Achievement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = typeIcons[type] || Trophy
            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">{type}</h4>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((achievement: any) => (
                    <Card
                      key={achievement.id}
                      className={cn(
                        "group bg-card/50 backdrop-blur-sm border-border/50 hover:border-border transition-all duration-300 overflow-hidden"
                      )}
                    >
                      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none", typeColors[type] || "from-secondary to-transparent")} />
                      <CardContent className="relative p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h5 className="font-semibold text-sm tracking-tight">{achievement.title}</h5>
                            {achievement.issuer && (
                              <p className="text-xs text-muted-foreground mt-0.5">{achievement.issuer}</p>
                            )}
                            {achievement.date && (
                              <p className="text-xs text-muted-foreground mt-0.5">{achievement.date}</p>
                            )}
                            {achievement.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{achievement.description}</p>
                            )}
                            {achievement.source && (
                              <div className="mt-1.5">
                                <SourceBadge source={achievement.source} />
                              </div>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {deleteConfirm === achievement.id ? (
                              <div className="flex gap-1">
                                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDelete(achievement.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm(null)}>
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(achievement.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Achievement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ach-title">Title *</Label>
              <Input
                id="ach-title"
                value={formData.title}
                onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))}
                placeholder="Best Paper Award"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ach-type">Type</Label>
                <Select
                  id="ach-type"
                  value={formData.type}
                  onChange={(e) => setFormData((d) => ({ ...d, type: e.target.value }))}
                >
                  {ACHIEVEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ach-date">Date</Label>
                <Input
                  id="ach-date"
                  value={formData.date}
                  onChange={(e) => setFormData((d) => ({ ...d, date: e.target.value }))}
                  placeholder="Dec 2023"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ach-issuer">Issuer / Organization</Label>
              <Input
                id="ach-issuer"
                value={formData.issuer}
                onChange={(e) => setFormData((d) => ({ ...d, issuer: e.target.value }))}
                placeholder="ACM, AWS, MLH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ach-desc">Description</Label>
              <Input
                id="ach-desc"
                value={formData.description}
                onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
                placeholder="Brief description…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.title.trim() || isSaving}>
              {isSaving ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
