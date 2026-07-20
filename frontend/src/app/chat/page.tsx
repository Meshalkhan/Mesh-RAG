import type { Metadata } from "next";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Chat",
  description: "Ask grounded questions over your uploaded documents.",
};

export default function ChatPage() {
  return (
    <main className="py-10 sm:py-14">
      <Container className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Ask a question and get an answer grounded in your indexed documents,
            with source citations.
          </p>
        </div>
        <ChatPanel />
      </Container>
    </main>
  );
}
