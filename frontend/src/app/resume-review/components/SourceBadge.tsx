"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, FileText, UserPlus, Sparkles } from "lucide-react"

type SourceType = "extracted" | "user_added" | "verified" | "ai_generated" | string

interface SourceBadgeProps {
  source: SourceType
  className?: string
}

const sourceConfig: Record<string, { label: string; variant: "success" | "warning" | "info" | "secondary"; icon: React.ElementType }> = {
  extracted: { label: "Extracted", variant: "warning", icon: FileText },
  user_added: { label: "User Added", variant: "info", icon: UserPlus },
  verified: { label: "Verified", variant: "success", icon: CheckCircle2 },
  ai_generated: { label: "AI Generated", variant: "secondary", icon: Sparkles },
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config = sourceConfig[source] || { label: source, variant: "secondary" as const, icon: FileText }
  const Icon = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn("gap-1 text-[10px] font-medium", className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
