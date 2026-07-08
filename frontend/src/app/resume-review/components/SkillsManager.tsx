"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SourceBadge } from "./SourceBadge"
import { Plus, X, Cpu, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface SkillsManagerProps {
  skills: any[]
  onRefresh: () => void
  isLoading: boolean
}

const SKILL_CATEGORIES = [
  "Backend",
  "Frontend",
  "AI/ML",
  "DevOps",
  "Database",
  "Cloud",
  "Mobile",
  "Languages",
  "Tools",
  "Other",
]

const categoryColors: Record<string, string> = {
  Backend: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Frontend: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "AI/ML": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  DevOps: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Database: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Cloud: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Mobile: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Languages: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Tools: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  Other: "bg-secondary text-muted-foreground border-border",
}

export function SkillsManager({ skills, onRefresh, isLoading }: SkillsManagerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const [newCategory, setNewCategory] = useState("Other")
  const [isAdding, setIsAdding] = useState(false)

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {}
    for (const skill of skills) {
      const cat = skill.category || "Other"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(skill)
    }
    return groups
  }, [skills])

  const handleAdd = useCallback(async () => {
    if (!newSkill.trim()) return
    setIsAdding(true)
    try {
      await api.createSkill({ name: newSkill.trim(), category: newCategory })
      setNewSkill("")
      onRefresh()
    } catch (err: any) {
      console.error("Failed to add skill:", err)
    } finally {
      setIsAdding(false)
    }
  }, [newSkill, newCategory, onRefresh])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.deleteSkill(id)
      onRefresh()
    } catch (err: any) {
      console.error("Failed to delete skill:", err)
    }
  }, [onRefresh])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }, [handleAdd])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Skills</h3>
          <p className="text-xs text-muted-foreground">{skills.length} skill{skills.length !== 1 ? "s" : ""} across {Object.keys(grouped).length} categor{Object.keys(grouped).length !== 1 ? "ies" : "y"}</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm" variant={showAdd ? "secondary" : "default"} className="gap-1.5">
          {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAdd ? "Close" : "Add Skill"}
        </Button>
      </div>

      {/* Add Skill Form */}
      {showAdd && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 animate-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="skill-name" className="text-xs">Skill Name</Label>
                <Input
                  id="skill-name"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., React, Python, Docker"
                  className="h-9"
                />
              </div>
              <div className="w-36 space-y-1.5">
                <Label htmlFor="skill-cat" className="text-xs">Category</Label>
                <Select
                  id="skill-cat"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-9"
                >
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={!newSkill.trim() || isAdding} className="h-9">
                {isAdding ? "Adding…" : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills by Category */}
      {skills.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-secondary p-4 mb-4">
              <Cpu className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No skills added</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[300px]">
              Add your technical skills or upload a resume to extract them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categorySkills]) => (
            <Card key={category} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-medium">{category}</h4>
                  <span className="text-xs text-muted-foreground">({categorySkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill: any) => (
                    <div
                      key={skill.id}
                      className={cn(
                        "group relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105",
                        categoryColors[category] || categoryColors.Other
                      )}
                    >
                      {skill.verified && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      )}
                      <span>{skill.name}</span>
                      <button
                        onClick={() => handleDelete(skill.id)}
                        className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-white/10 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
