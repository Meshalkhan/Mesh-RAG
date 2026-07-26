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
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium uppercase tracking-[0.16em] transition-colors duration-300 outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground",
        variant === "secondary" &&
          "border border-border text-foreground hover:border-accent hover:text-accent",
        variant === "ghost" && "text-muted-foreground hover:text-accent",
        size === "default" && "h-11 px-6 text-[0.7rem]",
        size === "sm" && "h-9 px-4 text-[0.65rem]",
        size === "lg" && "h-12 px-8 text-[0.72rem]",
        className,
      )}
      {...props}
    />
  );
}
