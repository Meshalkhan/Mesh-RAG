"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, uploadDocument } from "@/lib/api";
import type { DocumentUploadData } from "@/types/api";

type UploadState = "idle" | "uploading" | "success" | "error";

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [result, setResult] = useState<DocumentUploadData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF file to upload.");
      setState("error");
      return;
    }
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Only PDF files are supported.");
      setState("error");
      return;
    }

    setState("uploading");
    setError(null);
    setResult(null);

    try {
      const response = await uploadDocument(file);
      setResult(response.data);
      setState("success");
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Upload failed. Please try again.";
      setError(message);
      setState("error");
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Upload a PDF</CardTitle>
        <CardDescription>
          Upload a document to extract text, create chunks, and index them for
          chat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="pdf-upload" className="text-sm font-medium">
              PDF file
            </label>
            <input
              id="pdf-upload"
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="block w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setError(null);
                setResult(null);
                setState("idle");
              }}
            />
            {file ? (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({formatBytes(file.size)})
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={state === "uploading" || !file}>
            {state === "uploading" ? "Uploading…" : "Upload document"}
          </Button>
        </form>

        <div className="mt-6 space-y-3" aria-live="polite">
          {state === "uploading" ? (
            <p className="text-sm text-muted-foreground">
              Uploading and indexing document…
            </p>
          ) : null}

          {state === "error" && error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {state === "success" && result ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
              <p className="font-medium text-foreground">Upload complete</p>
              <dl className="mt-2 space-y-1 text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <dt>Filename</dt>
                  <dd className="text-foreground">{result.filename}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Size</dt>
                  <dd className="text-foreground">
                    {formatBytes(result.size)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Status</dt>
                  <dd className="text-foreground">{result.status}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Chunks indexed</dt>
                  <dd className="text-foreground">{result.indexed_count}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
