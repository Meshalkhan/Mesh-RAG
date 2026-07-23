"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      whileTap={{ scale: 0.92 }}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -40, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </motion.span>
    </motion.button>
  );
}
