import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ContainerProps = ComponentProps<"div"> & {
  as?: "div" | "section" | "main";
};

export function Container({
  as: Comp = "div",
  className,
  ...props
}: ContainerProps) {
  return (
    <Comp
      className={cn("mx-auto w-full max-w-5xl px-6 sm:px-8", className)}
      {...props}
    />
  );
}
