"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, askQuestion } from "@/lib/api";
import type { ChatResponse } from "@/types/api";

export function ChatPanel() {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChatResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Enter a question.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await askQuestion(trimmed);
      setResult(response);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to get an answer. Please try again.";
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ask a question</CardTitle>
          <CardDescription>
            Answers are grounded in your uploaded documents and include source
            citations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="question" className="text-sm font-medium">
                Question
              </label>
              <textarea
                id="question"
                rows={4}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What does the document say about…?"
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? "Thinking…" : "Ask"}
            </Button>
          </form>

          {error ? (
            <div
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              aria-live="polite"
            >
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {result.answer}
            </p>

            <div className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-medium">Sources</h3>
              {result.sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sources available for this answer.
                </p>
              ) : (
                <ul className="space-y-2">
                  {result.sources.map((source) => (
                    <li
                      key={`${source.filename}-${source.page_number}`}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {source.filename}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · page {source.page_number}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
