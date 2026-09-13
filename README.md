# Job Match API

TypeScript + Node.js + Express modular monolith that recommends jobs to candidates (and candidates to jobs) based on skills, experience, location, and salary.

## Stack

- TypeScript, Express, Zod, Vitest
- PostgreSQL + Prisma
- Strategy-based scoring (`Skill`, `Experience`, `Location`, `Salary`)

## Quick start (Docker)

Requires Docker and Docker Compose.

```bash
# Build and start API + PostgreSQL (runs Prisma migrations on boot)
docker compose up --build

# API: http://localhost:3000
# Health: http://localhost:3000/health
```

Stop and remove containers (keeps the Postgres volume):

```bash
docker compose down
```

Reset the database volume as well:

```bash
docker compose down -v
```

`DATABASE_URL` for the API container is set in `docker-compose.yml`:

```text
postgresql://postgres:postgres@db:5432/job_match?schema=public
```

## Local development (without Docker for the API)

1. Start Postgres (for example via Compose db only):

```bash
docker compose up db -d
```

2. Copy env and install:

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Default local `DATABASE_URL`:

```text
postgresql://postgres:postgres@localhost:5432/job_match?schema=public
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start API with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled `dist/server.js` |
| `npm test` | Run Vitest |
| `npm run lint` | ESLint |
| `npm run prisma:migrate:deploy` | Apply migrations (used in Docker entrypoint) |

## Main endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `POST` | `/candidates` | Create candidate |
| `POST` | `/jobs` | Create job |
| `GET` | `/candidates/:candidateId/recommendations?limit=10` | Rank jobs for a candidate |
| `GET` | `/jobs/:jobId/recommendations?limit=10` | Rank candidates for a job |

Both recommendation endpoints share the same `EligibilityChecker`, `ScoringEngine`, and scoring strategies.
