# Chess Mentor AI

Chess Mentor AI is a full-stack chess training application. It combines a playable chess UI, Stockfish-backed analysis, OpenAI-powered explanations, adaptive hinting, opening retrieval, and a long-term learner profile.

## Features

- React + TypeScript + TailwindCSS chess interface with drag-and-drop, move list, clocks, board flip, PGN/FEN import/export, analysis panel, dark/light theme, and German/English copy.
- Node.js + Express API with TypeScript, Prisma/PostgreSQL, JWT authentication, game storage, learner profiles, training recommendations, and coach endpoints.
- Stockfish WASM/browser worker integration hook on the frontend and server-side analysis abstraction for production Stockfish deployments.
- OpenAI-based coach service that never returns only engine moves; it asks guiding questions, adapts to the selected level, and explains strategic/tactical ideas.
- Opening retrieval service with extensible ECO-style seed data and room for a vector/search backend.
- Docker Compose for local PostgreSQL + API + web development.

## Quick start

```bash
cp .env.example .env
npm install
npm run db:generate
npm run dev
```

Open the web app at `http://localhost:5173` and the API at `http://localhost:8080`.

## Project structure

```text
apps/web      React frontend
apps/api      Express backend, Prisma schema, coach/analysis services
packages/shared Shared chess domain types and i18n strings
```

## Deployment

- **Vercel**: deploy `apps/web` and set `VITE_API_URL`.
- **Railway**: deploy `apps/api`, attach PostgreSQL, and run Prisma migrations.
- **Docker**: use `docker-compose.yml` for local production-like orchestration.

## Environment

See `.env.example` for all required settings.
