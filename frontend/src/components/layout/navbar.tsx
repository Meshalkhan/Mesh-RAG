import Link from "next/link";

import { Container } from "@/components/layout/container";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Mesh RAG
        </Link>
      </Container>
    </header>
  );
}
