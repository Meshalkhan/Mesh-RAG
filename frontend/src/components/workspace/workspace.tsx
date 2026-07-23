"use client";

import { FileText, LoaderCircle, Send, Trash2, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { FormEvent, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  askQuestion,
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "@/lib/api";
import type { ChatResponse, DocumentSummary } from "@/types/api";

type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  sources: ChatResponse["sources"];
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Workspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const refreshDocuments = useCallback(async (preferFilename?: string) => {
    try {
      const response = await listDocuments();
      const next = response.data.documents;
      setDocuments(next);
      setListError(null);
      setSelectedFilename((current) => {
        if (preferFilename && next.some((doc) => doc.filename === preferFilename)) {
          return preferFilename;
        }
        if (current && next.some((doc) => doc.filename === current)) {
          return current;
        }
        return next[0]?.filename ?? null;
      });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not load documents.";
      setListError(message);
    }
  }, []);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  useEffect(() => {
    setTurns([]);
    setChatError(null);
    setQuestion("");
  }, [selectedFilename]);

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadMessage("Only PDF files are supported.");
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      const response = await uploadDocument(file);
      setUploadMessage(
        `Indexed ${response.data.filename} · ${response.data.indexed_count} chunks · ${formatSize(response.data.size)}`,
      );
      await refreshDocuments(response.data.filename);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Upload failed.";
      setUploadMessage(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(
    event: MouseEvent<HTMLButtonElement>,
    filename: string,
  ) {
    event.stopPropagation();
    if (deletingFilename) return;

    const confirmed = window.confirm(
      `Delete "${filename}" from the index? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingFilename(filename);
    setUploadMessage(null);
    try {
      const response = await deleteDocument(filename);
      setUploadMessage(
        `Deleted ${response.data.filename} · ${response.data.deleted_chunks} chunks`,
      );
      await refreshDocuments();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Delete failed.";
      setUploadMessage(message);
    } finally {
      setDeletingFilename(null);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !selectedFilename || asking) return;

    setAsking(true);
    setChatError(null);
    try {
      const response = await askQuestion(trimmed, selectedFilename);
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          question: trimmed,
          answer: response.answer,
          sources: response.sources,
        },
      ]);
      setQuestion("");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not get an answer.";
      setChatError(message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex items-center justify-between gap-4"
      >
        <div>
          <p className="font-display text-xs tracking-[0.28em] text-accent uppercase">
            Mesh AI
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Mesh RAG
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Upload a PDF, select it, ask only against that document.
          </p>
        </div>
        <ThemeToggle />
      </motion.header>

      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col rounded-3xl border border-border bg-card/75 p-4 shadow-[0_20px_60px_-40px_var(--glow)] backdrop-blur-xl"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-medium">Documents</h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
              {documents.length}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files)}
          />

          <Button
            variant="primary"
            className="mb-3 w-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? "Indexing…" : "Upload PDF"}
          </Button>

          {uploadMessage ? (
            <p className="mb-3 rounded-2xl bg-muted/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {uploadMessage}
            </p>
          ) : null}

          {listError ? (
            <p className="mb-3 text-sm text-destructive">{listError}</p>
          ) : null}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {documents.map((doc, index) => {
                const selected = doc.filename === selectedFilename;
                const deleting = deletingFilename === doc.filename;
                return (
                  <motion.div
                    key={doc.filename}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex w-full items-start gap-2 rounded-2xl border px-2 py-2 transition-colors ${
                      selected
                        ? "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
                        : "border-transparent bg-muted/50 hover:border-border hover:bg-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFilename(doc.filename)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-1 py-1 text-left"
                    >
                      <span
                        className={`mt-0.5 rounded-xl p-2 ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-accent"
                        }`}
                      >
                        <FileText className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {doc.filename}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {doc.chunk_count} chunks
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${doc.filename}`}
                      disabled={deleting || deletingFilename !== null}
                      onClick={(event) => void handleDelete(event, doc.filename)}
                      className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                    >
                      {deleting ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {documents.length === 0 && !listError ? (
              <p className="rounded-2xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                No documents yet. Upload a PDF to begin.
              </p>
            ) : null}
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-[70vh] flex-col rounded-3xl border border-border bg-card/75 shadow-[0_20px_60px_-40px_var(--glow)] backdrop-blur-xl"
        >
          <div className="border-b border-border px-5 py-4">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Selected corpus
            </p>
            <h2 className="font-display mt-1 truncate text-xl font-medium">
              {selectedFilename ?? "Select a document"}
            </h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {!selectedFilename ? (
              <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted-foreground">
                Choose a file on the left to ask grounded questions.
              </div>
            ) : null}

            <AnimatePresence initial={false}>
              {turns.map((turn) => (
                <motion.article
                  key={turn.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="ml-auto max-w-[90%] rounded-3xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-[0_12px_30px_-18px_var(--glow)]">
                    {turn.question}
                  </div>
                  <div className="max-w-[95%] rounded-3xl rounded-bl-md border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
                    <p className="whitespace-pre-wrap">{turn.answer}</p>
                    {turn.sources.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {turn.sources.map((source) => (
                          <li
                            key={`${turn.id}-${source.filename}-${source.page_number}`}
                            className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                          >
                            {source.filename} · p.{source.page_number}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        No sources for this answer.
                      </p>
                    )}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          <form
            onSubmit={(event) => void handleAsk(event)}
            className="border-t border-border p-4"
          >
            {chatError ? (
              <p className="mb-2 text-sm text-destructive">{chatError}</p>
            ) : null}
            <div className="flex items-end gap-2 rounded-3xl border border-border bg-muted/40 p-2 focus-within:border-primary/45">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                placeholder={
                  selectedFilename
                    ? `Ask about ${selectedFilename}…`
                    : "Select a document first"
                }
                disabled={!selectedFilename || asking}
                className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
              <Button
                type="submit"
                size="default"
                disabled={!selectedFilename || asking || !question.trim()}
                className="shrink-0"
              >
                {asking ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Ask
              </Button>
            </div>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
