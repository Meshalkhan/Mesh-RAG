# Mesh RAG

Document question answering over uploaded PDFs. Users upload a document, the system indexes it, and chat answers are grounded in retrieved chunks with source citations.

**Stack:** Next.js 15 (TypeScript, Tailwind) · FastAPI (Python 3.12) · ChromaDB · Groq / OpenAI

---

## Project overview

Mesh RAG demonstrates an end-to-end RAG loop for a full-stack AI take-home:

1. Upload a PDF
2. Extract text, chunk it, embed and store vectors
3. Ask a question
4. Retrieve relevant chunks and generate a grounded answer with sources

If retrieval finds nothing relevant, the API returns exactly:

`I couldn't find relevant information.`

and does not call the LLM.

---

## Architecture explanation

```text
Browser (Next.js)
    │  HTTP
    ▼
FastAPI (/api/v1)
    ├── POST /documents/upload  → validate → disk → chunk → ChromaDB
    ├── POST /chat              → retrieve → filter → LLM (Groq/OpenAI) → answer + sources
    └── GET  /health
```

| Layer | Responsibility |
|-------|----------------|
| Frontend | Upload UI, chat UI, API client |
| Backend services | Validation, PDF processing, vector store, RAG orchestration |
| ChromaDB | Embeddings + similarity search (persistent local store) |
| LLM | Answer generation via Groq (`llama-3.3-70b-versatile` default) or OpenAI |

Details: [docs/architecture.md](docs/architecture.md), [docs/data-flow.md](docs/data-flow.md)

---

## Local setup

### Prerequisites

- Node.js 20+
- Python 3.12 + [uv](https://github.com/astral-sh/uv)
- Groq API key — or OpenAI key if `LLM_PROVIDER=openai`

### 1. Environment

```bash
cp .env.example .env
# Set GROQ_API_KEY in .env (or OPENAI_API_KEY if using openai)

cp frontend/.env.example frontend/.env.local
```

### 2. Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

API docs: http://127.0.0.1:8001/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

### Smoke check

1. Open **Upload** → submit a text PDF  
2. Open **Chat** → ask something covered by the document  
3. Confirm answer + source filename/page  

---

## Environment variables

Root `.env` (backend reads `.env` / `../.env`):

| Variable | Purpose | Default |
|----------|---------|---------|
| `APP_NAME` / `APP_VERSION` / `APP_ENV` | Service metadata | `mesh-rag-api` / `0.1.0` / `development` |
| `API_V1_PREFIX` | API mount path | `/api/v1` |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | `http://localhost:3000` |
| `LOG_LEVEL` / `LOG_JSON` | Logging | `INFO` / `true` |
| `UPLOAD_DIR` | PDF storage | `storage/uploads` |
| `MAX_UPLOAD_BYTES` | Upload size cap | `26214400` |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | Chunking | `1000` / `200` |
| `CHROMA_PERSIST_DIR` | Vector DB path | `storage/chroma` |
| `CHROMA_COLLECTION_NAME` | Collection name | `documents` |
| `LLM_PROVIDER` | `groq` / `openai` | `groq` |
| `GROQ_API_KEY` | Groq auth | _(required when provider is groq)_ |
| `GROQ_MODEL` | Groq model id | `llama-3.3-70b-versatile` |
| `GROQ_BASE_URL` | Groq OpenAI-compatible base | `https://api.groq.com/openai/v1` |
| `OPENAI_API_KEY` | OpenAI auth | _(required when provider is openai)_ |
| `OPENAI_MODEL` | OpenAI chat model | `gpt-4o-mini` |
| `RETRIEVAL_TOP_K` | Neighbor count | `5` |
| `RETRIEVAL_MAX_DISTANCE` | Cosine distance cutoff | `0.7` |

Frontend:

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base | `http://localhost:8001/api/v1` |

Templates: [`.env.example`](.env.example), [`frontend/.env.example`](frontend/.env.example), [`frontend/.env.production.example`](frontend/.env.production.example)

---

## How RAG works

```text
Upload PDF → extract text → chunk (+ page metadata)
          → embed + store in ChromaDB

Question  → embed query → top-k similarity search
          → drop weak matches (distance filter)
          → if none: refuse without LLM
          → else: prompt LLM (Groq/OpenAI) with context → answer + sources
```

| Stage | Implementation |
|-------|----------------|
| Extract | pypdf per page |
| Chunk | Character windows (`CHUNK_SIZE` / `CHUNK_OVERLAP`) |
| Embed/store | ChromaDB default embedding function, cosine space |
| Retrieve | Top-k + `RETRIEVAL_MAX_DISTANCE` |
| Generate | OpenAI-compatible chat API (Groq or OpenAI), temperature `0` |
| Cite | Deduped `{ filename, page_number }` |
