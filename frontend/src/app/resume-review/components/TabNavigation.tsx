"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  Cpu,
  GraduationCap,
  Trophy,
  Wand2,
  FileStack,
} from "lucide-react"

export type TabId =
  | "overview"
  | "projects"
  | "experience"
  | "skills"
  | "education"
  | "achievements"
  | "generate"
  | "resumes"

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
}

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "skills", label: "Skills", icon: Cpu },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "generate", label: "Generate Resume", icon: Wand2 },
  { id: "resumes", label: "Generated Resumes", icon: FileStack },
]

interface TabNavigationProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="relative">
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none md:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none md:hidden" />

      <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  isActive ? "text-blue-400" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-400" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
