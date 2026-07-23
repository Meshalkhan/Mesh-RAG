# Mesh RAG

Document Q&A over uploaded PDFs. One workspace: upload → select a file → ask grounded questions against that file only. Answers include source citations.

**Stack:** Next.js 15 (TypeScript, Tailwind, Motion) · FastAPI (Python 3.12) · ChromaDB · Groq / OpenAI

If retrieval finds nothing relevant, the API returns exactly `I couldn't find relevant information.` and does not call the LLM.

---

## Architecture

```text
Browser (Next.js · single-page workspace)
        │  HTTP
        ▼
FastAPI (/api/v1)
        ├── DocumentService → disk + DocumentProcessor → VectorStore (ChromaDB)
        └── ChatService → VectorStore (retrieve by filename) → LLM (Groq / OpenAI)
```

| Piece | Tech | Role |
|-------|------|------|
| UI | Next.js 15, TypeScript, Tailwind, Motion | `/` workspace: upload, select, chat, theme |
| API | FastAPI, Pydantic | Validation, orchestration |
| Processing | pypdf | Page text + character chunks |
| Vectors | ChromaDB (persistent) | Embed + cosine search |
| LLM | Groq (default) or OpenAI | Grounded generation |

Routes stay thin; logic lives in services (`DocumentService`, `DocumentProcessor`, `VectorStore`, `ChatService`, `LLMProvider`).

### API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/health` | Liveness |
| `GET` | `/api/v1/documents` | List indexed filenames + chunk counts |
| `POST` | `/api/v1/documents/upload` | Validate PDF → chunk → index |
| `DELETE` | `/api/v1/documents/{filename}` | Remove chunks (+ matching upload files) |
| `POST` | `/api/v1/chat` | `{ question, filename }` → answer + sources |

### RAG

**Index:** extract page text → chunk (`CHUNK_SIZE` / `CHUNK_OVERLAP`) with `{filename, page_number}` → Chroma (default embeddings).

**Query:** embed question via Chroma → top-k **within the selected filename** → keep `distance <= RETRIEVAL_MAX_DISTANCE` → if empty, refuse without calling the LLM → else prompt with context → return answer + deduped sources.

**Chunk count** (UI): number of indexed text segments for that PDF.

### Persistence

- PDFs: `UPLOAD_DIR` (default `storage/uploads`)
- Vectors: `CHROMA_PERSIST_DIR` (default `storage/chroma`)

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

1. Open http://localhost:3000 → **Upload PDF**
2. Select the document in the list
3. Ask a question covered by that file → confirm answer + sources
4. Optional: delete the document via the trash control

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
