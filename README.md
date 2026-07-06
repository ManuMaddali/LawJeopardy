# Georgia Bar Jeopardy

Jeopardy-style Georgia bar prep app with:

- `frontend`: Next.js + TypeScript + Tailwind + shadcn-style UI components
- `backend`: FastAPI + SQLAlchemy + Alembic + OpenAI generation service
- `Postgres` for materials, boards, and sessions

The backend is designed to generate:

- 7 topic boards (one per uploaded subject PDF)
- 4 mixed boards (each includes a `Random` category)

## 1) Local Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

## 2) Local Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## 3) Postgres Setup

Create a local database and set backend `DATABASE_URL`, e.g.:

```bash
postgresql+psycopg://postgres:postgres@localhost:5432/georgia_bar_jeopardy
```

Then run migrations (below) or rely on startup table creation for quick MVP development.

## 4) Alembic Migration Commands

From `backend`:

```bash
alembic upgrade head
alembic revision --autogenerate -m "your migration name"
alembic downgrade -1
```

## 5) Railway Deployment Steps (Backend)

1. Create a new Railway service from this repository root.
2. Add Postgres plugin/service in Railway.
3. Railway auto-detects the root `Dockerfile` for backend deploys.
4. Set environment variables in Railway:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
   - `FRONTEND_ORIGIN` (your Vercel URL)
   - `DEFAULT_DOCS_DIR` (`Docs`)
5. Deploy and verify `/health`.

## 6) Vercel Deployment Steps (Frontend)

1. Import the `frontend` folder as a Vercel project.
2. Add env var:
   - `NEXT_PUBLIC_API_URL` = Railway backend URL (e.g. `https://your-api.up.railway.app`)
3. Deploy.
4. Test:
   - `/upload` -> process/generate study set
   - `/boards` -> play
   - `/results/[sessionId]` -> missed CSV export

## 7) Environment Variables

### Backend (`backend/.env`)

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `FRONTEND_ORIGIN`
- `DEFAULT_DOCS_DIR` (use `Docs` for this repository)

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL`

## Default PDF Flow

The app expects the provided files in root `Docs`:

- `Torts.pdf`
- `Real-Property.pdf`
- `Evidence.pdf`
- `Criminal-Law-and-Procedure.pdf`
- `Contracts-and-Sales.pdf`
- `Constitutional-Law.pdf`
- `Civil-Procedure.pdf`

Process and generate from UI:

1. Go to `/upload`
2. Click `Process PDFs`
3. Click `Generate Full Study Set`

## Optional Seed Command

From `backend`:

```bash
python -m app.seed_demo
```

This processes default PDFs and generates all topic + mixed boards.
