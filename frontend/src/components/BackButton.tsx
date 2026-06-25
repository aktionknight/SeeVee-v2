"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Optionally hide on main pages like dashboard root, login, signup
  if (pathname === "/dashboard" || pathname === "/login" || pathname === "/signup" || pathname === "/") {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => router.back()}
      className="mb-4 text-muted-foreground hover:text-primary transition-colors"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  );
}
