import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0.01_250)_0%,_transparent_55%)]"
      />
      <Container className="flex flex-col items-start gap-8">
        <div className="max-w-2xl space-y-5">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Document intelligence
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Mesh RAG
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            A document intelligence system that enables grounded AI
            conversations over your data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/upload" className={cn(buttonVariants({ size: "lg" }))}>
            Upload document
          </Link>
          <Link
            href="/chat"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Open chat
          </Link>
        </div>
      </Container>
    </section>
  );
}
