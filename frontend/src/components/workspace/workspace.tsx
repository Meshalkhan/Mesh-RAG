"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { FormEvent, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  askQuestion,
  deleteDocument,
  getHealth,
  listDocuments,
  uploadDocument,
} from "@/lib/api";
import type {
  ChatResponse,
  DocumentSummary,
  HealthResponse,
  LlmProviderName,
} from "@/types/api";

type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  sources: ChatResponse["sources"];
  provider: LlmProviderName;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const PROVIDER_LABELS: Record<LlmProviderName, string> = {
  groq: "Groq",
  openai: "OpenAI",
};

const LABEL_CLASS =
  "text-[0.62rem] font-medium uppercase tracking-[0.32em] text-muted-foreground";

function providerKeyHint(provider: LlmProviderName): string {
  return provider === "openai" ? "OPENAI_API_KEY" : "GROQ_API_KEY";
}

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
  const [llmStatus, setLlmStatus] = useState<HealthResponse | null>(null);
  const [llmStatusError, setLlmStatusError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<LlmProviderName>("groq");

  const providerConfigured = useMemo(() => {
    if (!llmStatus) return false;
    return (
      llmStatus.llm_providers.find((item) => item.name === selectedProvider)
        ?.configured ?? false
    );
  }, [llmStatus, selectedProvider]);

  const providerBlockMessage = useMemo(() => {
    if (llmStatusError) {
      return llmStatusError;
    }
    if (!llmStatus) {
      return "Checking available models…";
    }
    if (!providerConfigured) {
      return `${PROVIDER_LABELS[selectedProvider]} is not configured. Set ${providerKeyHint(selectedProvider)} on the server, then restart the API.`;
    }
    return null;
  }, [llmStatus, llmStatusError, providerConfigured, selectedProvider]);

  const refreshDocuments = useCallback(async (preferFilename?: string) => {
    try {
      const response = await listDocuments();
      const next = response.data.documents;
      setDocuments(next);
      setListError(null);
      setSelectedFilename((current) => {
        if (
          preferFilename &&
          next.some((doc) => doc.filename === preferFilename)
        ) {
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

  const refreshLlmStatus = useCallback(async () => {
    try {
      const health = await getHealth();
      setLlmStatus(health);
      setLlmStatusError(null);
      setSelectedProvider((current) => {
        const currentConfigured =
          health.llm_providers.find((item) => item.name === current)
            ?.configured ?? false;
        if (currentConfigured) {
          return current;
        }
        const defaultConfigured =
          health.llm_providers.find(
            (item) => item.name === health.default_llm_provider,
          )?.configured ?? false;
        if (defaultConfigured) {
          return health.default_llm_provider;
        }
        const firstConfigured = health.llm_providers.find(
          (item) => item.configured,
        );
        return firstConfigured?.name ?? health.default_llm_provider;
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not load model availability.";
      setLlmStatusError(message);
    }
  }, []);

  useEffect(() => {
    void refreshDocuments();
    void refreshLlmStatus();
  }, [refreshDocuments, refreshLlmStatus]);

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
        `Indexed ${response.data.filename} — ${response.data.indexed_count} chunks, ${formatSize(response.data.size)}`,
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
        `Deleted ${response.data.filename} — ${response.data.deleted_chunks} chunks`,
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
    if (!trimmed || !selectedFilename || asking || !providerConfigured) return;

    setAsking(true);
    setChatError(null);
    try {
      const response = await askQuestion(
        trimmed,
        selectedFilename,
        selectedProvider,
      );
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          question: trimmed,
          answer: response.answer,
          sources: response.sources,
          provider: selectedProvider,
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

  const canAsk =
    Boolean(selectedFilename) &&
    !asking &&
    Boolean(question.trim()) &&
    providerConfigured;

  const providerOptions = llmStatus?.llm_providers ?? [
    { name: "groq" as const, configured: false },
    { name: "openai" as const, configured: false },
  ];

  return (
    <div className="min-h-screen">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="border-b border-border"
      >
        <div className="mx-auto flex max-w-[1440px] items-end justify-between gap-8 px-6 py-8 lg:px-12">
          <div>
            <p className="text-[0.62rem] font-medium uppercase tracking-[0.42em] text-accent">
              Mesh AI
            </p>
            <h1 className="font-display mt-3 text-4xl leading-[0.95] tracking-[-0.015em] sm:text-5xl">
              Mesh RAG
            </h1>
          </div>
          <div className="flex items-center gap-8">
            <p className="hidden max-w-60 text-right text-xs leading-relaxed text-muted-foreground md:block">
              Grounded answers from a single document, each one returned with
              its citations.
            </p>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      <main className="mx-auto grid max-w-[1440px] gap-5 px-6 py-6 lg:grid-cols-[minmax(260px,330px)_1fr] lg:gap-6 lg:px-12 lg:py-8">
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
          className="flex flex-col rounded-lg border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 className={LABEL_CLASS}>Library</h2>
            <span className="font-display text-lg leading-none text-muted-foreground">
              {documents.length.toString().padStart(2, "0")}
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
            className="mt-6 w-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : null}
            {uploading ? "Indexing" : "Upload PDF"}
          </Button>

          <AnimatePresence initial={false}>
            {uploadMessage ? (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="mt-4 border-l border-accent pl-3 text-xs leading-relaxed text-muted-foreground"
              >
                {uploadMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>

          {listError ? (
            <p className="mt-4 text-xs leading-relaxed text-destructive">
              {listError}
            </p>
          ) : null}

          <div className="mt-8 min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence initial={false}>
              {documents.map((doc, index) => {
                const selected = doc.filename === selectedFilename;
                const deleting = deletingFilename === doc.filename;
                return (
                  <motion.div
                    key={doc.filename}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.04, ease: EASE }}
                    className={`group relative flex items-start gap-3 border-b border-border/70 last:border-b-0 ${
                      selected ? "bg-surface" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute top-0 bottom-0 left-0 w-px transition-colors duration-300 ${
                        selected ? "bg-accent" : "bg-transparent"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedFilename(doc.filename)}
                      className="flex min-w-0 flex-1 items-baseline gap-4 py-4 pl-3 text-left"
                    >
                      <span
                        className={`font-display text-sm transition-colors duration-300 ${
                          selected ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm transition-colors duration-300 ${
                            selected
                              ? "text-foreground"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {doc.filename}
                        </span>
                        <span className="mt-1 block text-[0.68rem] tracking-[0.08em] text-muted-foreground">
                          {doc.chunk_count} chunks
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${doc.filename}`}
                      disabled={deleting || deletingFilename !== null}
                      onClick={(event) => void handleDelete(event, doc.filename)}
                      className="mt-4 inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground/50 transition-colors duration-300 hover:text-destructive focus-visible:text-destructive disabled:pointer-events-none disabled:opacity-40"
                    >
                      {deleting ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {documents.length === 0 && !listError ? (
              <div className="rounded-md border border-dashed border-border bg-surface/60 px-4 py-10 text-center text-sm leading-relaxed text-muted-foreground">
                No documents yet. Upload a PDF to begin.
              </div>
            ) : null}
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
          className="flex min-h-[72vh] flex-col rounded-lg border border-border bg-card"
        >
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <p className={LABEL_CLASS}>Selected document</p>
              <h2 className="font-display mt-3 truncate text-2xl leading-tight sm:text-3xl">
                {selectedFilename ?? "No document selected"}
              </h2>
            </div>
            <label className="flex flex-col gap-2">
              <span className={LABEL_CLASS}>Model</span>
              <select
                value={selectedProvider}
                onChange={(event) =>
                  setSelectedProvider(event.target.value as LlmProviderName)
                }
                className="min-w-36 cursor-pointer rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors duration-300 outline-none hover:border-accent focus:border-accent"
              >
                {providerOptions.map((item) => (
                  <option
                    key={item.name}
                    value={item.name}
                    className="bg-card text-foreground"
                  >
                    {PROVIDER_LABELS[item.name]}
                    {item.configured ? "" : " — not configured"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-6">
            {!selectedFilename ? (
              <p className="max-w-md text-sm leading-[1.9] text-muted-foreground">
                Choose a document from the library to ask questions scoped to
                that file.
              </p>
            ) : null}

            {selectedFilename && turns.length === 0 ? (
              <p className="max-w-md text-sm leading-[1.9] text-muted-foreground">
                Ask anything covered by this document. Answers cite the pages
                they came from.
              </p>
            ) : null}

            <AnimatePresence initial={false}>
              {turns.map((turn) => (
                <motion.article
                  key={turn.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                  className="border-b border-border/50 py-8 first:pt-0 last:border-b-0"
                >
                  <p className="font-display max-w-2xl text-xl leading-snug italic sm:text-2xl">
                    {turn.question}
                  </p>
                  <p className="mt-5 max-w-2xl text-[0.95rem] leading-[1.85] whitespace-pre-wrap text-foreground/85">
                    {turn.answer}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    <span className="text-accent">
                      {turn.sources.length > 0 ? "Sources" : "No sources"}
                    </span>
                    {turn.sources.map((source) => (
                      <span
                        key={`${turn.id}-${source.filename}-${source.page_number}`}
                      >
                        {source.filename} · p.{source.page_number}
                      </span>
                    ))}
                    <span className="ml-auto">
                      {PROVIDER_LABELS[turn.provider]}
                    </span>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          <form
            onSubmit={(event) => void handleAsk(event)}
            className="border-t border-border bg-surface/40 px-5 py-5 sm:px-6"
          >
            {providerBlockMessage ? (
              <p
                className={`mb-4 text-xs leading-relaxed ${
                  providerConfigured
                    ? "text-muted-foreground"
                    : "text-destructive"
                }`}
              >
                {providerBlockMessage}
              </p>
            ) : null}
            {chatError ? (
              <p className="mb-4 text-xs leading-relaxed text-destructive">
                {chatError}
              </p>
            ) : null}
            <div className="flex items-end gap-6 border-b border-border pb-4 transition-colors duration-300 focus-within:border-accent">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={2}
                placeholder={
                  !selectedFilename
                    ? "Select a document first"
                    : !providerConfigured
                      ? `${PROVIDER_LABELS[selectedProvider]} key missing on server`
                      : "Ask a question…"
                }
                disabled={!selectedFilename || asking || !providerConfigured}
                className="max-h-40 min-h-14 flex-1 resize-none bg-transparent text-[0.95rem] leading-[1.7] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
              <Button type="submit" disabled={!canAsk} className="shrink-0">
                {asking ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : null}
                {asking ? "Asking" : "Ask"}
              </Button>
            </div>
          </form>
        </motion.section>
      </main>
    </div>
  );
}
