# PATHS — Web console (Next.js)

UI for the FastAPI backend: auth, candidate CV upload & scoring, organisation jobs, database matching, **interview intelligence**, and **decision support (DSS)**. See repo root `PATHS_PROJECT_WALKTHROUGH.md` for the full map.

## Stack

- **Next.js** (App Router) · **TypeScript** · **Tailwind CSS**
- **Framer Motion** (page/section motion, reduced-motion fallbacks on the ambient background)
- **lucide-react** icons, **Geist** fonts

## Run locally

1. Start the backend (`uvicorn` on port **8000**) with CORS allowing `http://localhost:3000` (or set `CORS_ORIGINS` in the API `.env`).

2. In this folder:

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_API_BASE_URL` must match your API (default `http://localhost:8000`).

## Build

```bash
npm run build
npm start
```
