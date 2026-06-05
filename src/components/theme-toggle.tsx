"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Basculer le thème"
      onClick={toggle}
      className={className}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      <span className="sr-only">Basculer le thème</span>
    </Button>
  );
}
