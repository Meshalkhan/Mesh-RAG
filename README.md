# Mesh RAG

Document question answering over uploaded PDFs. Users upload a document, the system indexes it, and chat answers are grounded in retrieved chunks with source citations.

**Stack:** Next.js 15 (TypeScript, Tailwind) · FastAPI (Python 3.12) · ChromaDB · OpenAI

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
    ├── POST /chat              → retrieve → filter → OpenAI → answer + sources
    └── GET  /health
```

| Layer | Responsibility |
|-------|----------------|
| Frontend | Upload UI, chat UI, API client |
| Backend services | Validation, PDF processing, vector store, RAG orchestration |
| ChromaDB | Embeddings + similarity search (persistent local store) |
| OpenAI | Answer generation (`gpt-4o-mini` by default) |

Details: [docs/architecture.md](docs/architecture.md), [docs/data-flow.md](docs/data-flow.md)

---

## Local setup

### Prerequisites

- Node.js 20+
- Python 3.12 + [uv](https://github.com/astral-sh/uv)
- OpenAI API key (required for chat when relevant context exists)

### 1. Environment

```bash
cp .env.example .env
# Set OPENAI_API_KEY in .env

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
| `LLM_PROVIDER` | Provider key (`openai` only) | `openai` |
| `OPENAI_API_KEY` | OpenAI auth | _(required for generation)_ |
| `OPENAI_MODEL` | Chat model | `gpt-4o-mini` |
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
          → else: prompt OpenAI with context → answer + sources
```

| Stage | Implementation |
|-------|----------------|
| Extract | pypdf per page |
| Chunk | Character windows (`CHUNK_SIZE` / `CHUNK_OVERLAP`) |
| Embed/store | ChromaDB default embedding function, cosine space |
| Retrieve | Top-k + `RETRIEVAL_MAX_DISTANCE` |
| Generate | OpenAI chat completions, temperature `0` |
| Cite | Deduped `{ filename, page_number }` |

More detail: [docs/rag-pipeline.md](docs/rag-pipeline.md)

---

## Deployment instructions

### Backend (Docker)

```bash
cd backend
docker build -t mesh-rag-api .
docker run --rm -p 8000:8000 \
  -e OPENAI_API_KEY=your_key \
  -e CORS_ORIGINS=https://your-frontend-domain.com \
  -e APP_ENV=production \
  -v mesh-rag-data:/data \
  mesh-rag-api
```

Container defaults: `UPLOAD_DIR=/data/uploads`, `CHROMA_PERSIST_DIR=/data/chroma`.

### Frontend

```bash
cd frontend
cp .env.production.example .env.production
# Set NEXT_PUBLIC_API_URL to your public API base (…/api/v1)

npm run build
npm run start
```

`NEXT_PUBLIC_API_URL` is inlined at build time.

No docker-compose/CI is included by design.

---

## Documentation index

| Doc | Purpose |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | Architecture (beginner → technical) |
| [docs/data-flow.md](docs/data-flow.md) | Upload and chat flows |
| [docs/rag-pipeline.md](docs/rag-pipeline.md) | RAG stages and trade-offs |
| [docs/technical-decisions.md](docs/technical-decisions.md) | Decision log |
| [docs/development-notes.md](docs/development-notes.md) | Implementation history |
| [docs/design-note.md](docs/design-note.md) | Problem breakdown and exclusions |
| [docs/ai-usage-note.md](docs/ai-usage-note.md) | How AI assistance was used |
| [docs/self-review.md](docs/self-review.md) | Limitations and next-week plan |
| [docs/interview-preparation.md](docs/interview-preparation.md) | Interview Q&A |
| [docs/future-improvements.md](docs/future-improvements.md) | Production backlog |
