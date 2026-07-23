import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_var(--glow)] hover:brightness-105",
        variant === "secondary" &&
          "border border-border bg-card/80 text-foreground hover:border-primary/35 hover:bg-muted",
        variant === "ghost" && "text-muted-foreground hover:bg-muted hover:text-foreground",
        size === "default" && "h-10 px-4 text-sm",
        size === "sm" && "h-8 px-3 text-xs",
        size === "lg" && "h-12 px-6 text-base",
        className,
      )}
      {...props}
    />
  );
}
