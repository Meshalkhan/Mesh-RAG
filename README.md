# Mesh RAG

Document question answering with a FastAPI backend and Next.js frontend.

## Local setup

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

## Production

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

Persist uploads and ChromaDB under `/data` (`UPLOAD_DIR`, `CHROMA_PERSIST_DIR`).

### Frontend

```bash
cd frontend
cp .env.production.example .env.production
# Set NEXT_PUBLIC_API_URL to your public API base URL (…/api/v1)

npm run build
npm run start
```

`NEXT_PUBLIC_API_URL` is baked in at build time.
