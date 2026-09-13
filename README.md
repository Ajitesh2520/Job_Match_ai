# Job Match API

A TypeScript modular monolith that matches candidates to jobs (and jobs to candidates) using explainable, weighted scoring.

## Overview

The API lets you:

1. Create **candidates** and **jobs** with skills, experience, location, and salary attributes.
2. Recommend **jobs for a candidate** or **candidates for a job**.
3. Return a **0–100 score** plus a per-dimension breakdown so results are auditable.

Matching is deterministic rule-based scoring — not ML. Must-have skills are hard filters; experience, location, salary, and nice-to-have skills only affect the score.

## Requirements

- Node.js 20+
- PostgreSQL 16+ (or Docker Compose, which includes Postgres)
- npm 10+

## Tech stack (and why)

| Technology | Role | Why |
| --- | --- | --- |
| **TypeScript** | Language | Strict typing across HTTP, domain, and persistence boundaries |
| **Node.js + Express** | HTTP server | Small surface area, straightforward middleware, easy to test with Supertest |
| **PostgreSQL** | Database | Relational model fits candidates/jobs/skills; strong uniqueness/index support |
| **Prisma** | ORM / migrations | Typed client, explicit schema, reliable migrate deploy in Docker |
| **Zod** | Request validation | Runtime schema checks at the HTTP edge; maps cleanly to 400 errors |
| **Vitest** | Tests | Fast unit/API tests with first-class TypeScript ESM support |

Intentionally **not** used: Redis, Kafka, BullMQ, auth, frontend, ML ranking.

## Architecture

This is a **modular monolith**: one deployable process, clear module boundaries (`candidates`, `jobs`, `recommendations`), shared database.

### Why modular monolith (not microservices)

- One product surface and one data model — network hops and distributed transactions would add cost without benefit at this stage.
- Cross-module recommendation needs candidates + jobs in the same request; a shared DB keeps that simple and consistent.
- Modules stay separable later: repositories and domain scoring are already isolated from Express.

### Layering

```text
HTTP (Controller)
  → Application (Service)
    → Persistence (Repository → Prisma → PostgreSQL)

Recommendation domain (pure):
  EligibilityChecker → ScoringEngine → ScoringStrategy[]
```

Controllers handle HTTP only (parse/validate, call service, return JSON).  
Services orchestrate use cases and never embed scoring formulas.  
Repositories own Prisma access.  
Scoring strategies are pure functions of candidate/job domain inputs.

### Dependency injection

Collaborators are constructed in composition roots (`*.routes.ts`, `createApp`) and injected via constructors:

- `CandidateService(CandidateRepository)`
- `JobService(JobRepository)`
- `RecommendationService(CandidateRepository, JobRepository, EligibilityChecker, ScoringEngine)`
- `ScoringEngine(ScoringStrategy[])` — strategies are injected; the engine never instantiates them

This keeps unit tests mockable at each boundary.

## Folder structure

```text
src/
  app.ts / server.ts          # Express app + process entry
  config/                     # Env + scoring weight configuration
  middleware/                 # asyncHandler, errorHandler, requestLogger
  shared/                     # errors, skill normalization
  infrastructure/prisma/      # Prisma client lifecycle
  modules/
    health/
    candidates/               # controller → service → repository + Zod schemas
    jobs/
    recommendations/
      recommendation.*.ts     # HTTP + orchestration
      domain/
        eligibility-checker.ts
        scoring-engine.ts
        create-scoring-strategies.ts
        scorers/              # Skill, Experience, Location, Salary
prisma/
  schema.prisma
  migrations/
Dockerfile / docker-compose.yml / docker-entrypoint.sh
```

## Database model

| Entity | Key fields |
| --- | --- |
| **Candidate** | `id`, `name`, `yearsOfExperience`, `location`, `expectedSalary`, timestamps |
| **CandidateSkill** | `candidateId` + normalized `skill` (unique per candidate) |
| **Job** | `id`, `title`, `minYearsExperience`, `location`, `salaryMin`, `salaryMax`, `remoteAllowed`, timestamps |
| **JobSkill** | `jobId` + `skill` + `type` (`MUST_HAVE` \| `NICE_TO_HAVE`), unique per job/skill |

Indexes exist on location and skill columns for filtering/matching. Skills are stored normalized (trim + lowercase) at write time.

## Eligibility vs scoring

| Concern | Behavior |
| --- | --- |
| **Eligibility** | Hard filter. A job/candidate pair is excluded if any **MUST_HAVE** skill is missing. |
| **Scoring** | Soft ranking for eligible pairs only. Nice-to-have, experience, location, and salary **never** exclude. |

- Skill comparison is case-insensitive / trimmed.
- Duplicate normalized must-have skills count once.
- If a job has **no** must-have skills, every candidate is eligible for that job (and vice versa for the reverse endpoint’s job-centric flow).

## Strategy Pattern

Each dimension implements `ScoringStrategy`:

- `name`, `maxScore` (from central weight config)
- `score(candidate, job) → { score, maxScore, details }`

`ScoringEngine` runs all strategies, sums scores, and returns an explainable breakdown. Strategies can be swapped or re-weighted at composition time without changing the engine or HTTP layer.

## Repository Pattern

`CandidateRepository` / `JobRepository` encapsulate Prisma. Services and recommendation logic depend on repository methods (`findById`, `findAll`, `create`), not on Prisma types in the HTTP layer. Persistence can change without rewriting scoring.

## Recommendation pipeline

Both directions share the same eligibility + scoring code:

### Jobs for a candidate — `GET /candidates/:candidateId/recommendations`

1. Load candidate (404 if missing)
2. Load all jobs
3. For each job: eligibility → score
4. Sort by score descending; tie-break by `jobId` ascending
5. Apply `limit`

### Candidates for a job — `GET /jobs/:jobId/recommendations`

1. Load job (404 if missing)
2. Load all candidates
3. For each candidate: **same** `isEligible(candidate, job)` and `score(candidate, job)`
4. Sort by score descending; tie-break by `candidateId` ascending
5. Apply `limit`

No duplicated formulas between directions.

## Scoring weights (application configuration)

Configured in `src/config/scoring.ts` (not via query params):

| Dimension | Default weight |
| --- | --- |
| Skills | **50** |
| Experience | **20** |
| Location | **15** |
| Salary | **15** |
| **Total** | **100** |

Validation rules:

- each weight is a finite number ≥ 0
- weights must total **exactly 100**

`createScoringStrategies(weights)` validates then constructs scorers with those maxima. Changing product weights is a config/composition change, not an API contract change.

### Why these weights

- **Skills (50)** dominate because role fit is primarily about capability. Must-haves are already required by eligibility; the skills score rewards remaining fit and nice-to-have overlap.
- **Experience (20)** matters but is treated as soft — strong skills can still surface junior/senior mismatches for human review.
- **Location (15)** and **salary (15)** are important preferences but should not outweigh skills; remote-friendly roles still get partial credit.

### Internal skill / location splits (defaults preserved)

Within the skills weight (50):

- Must-have share: **80%** → 40 points (guaranteed after eligibility)
- Nice-to-have share: **20%** → up to 10 points proportional to overlap
- If the job has **no** nice-to-have skills → full skills weight (no penalty)

Within the location weight (15):

- Exact match → full location weight (15)
- Different location + `remoteAllowed` → **10/15** of location weight (10 by default)
- Mismatch + not remote → 0

## Exact scoring formulas

Let configured maxima be \(M_s, M_e, M_l, M_{sal}\) (defaults 50, 20, 15, 15).

### Skills

- No nice-to-haves: `score = M_s`
- Otherwise:  
  `score = (0.8 * M_s) + (matchedNice / totalNice) * (0.2 * M_s)`

### Experience

- `minYears == 0` or `candidateYears >= minYears`: `score = M_e`
- Else: `score = (candidateYears / minYears) * M_e`

### Location

- Exact (normalized): `score = M_l`
- Else if `remoteAllowed`: `score = M_l * (10/15)`
- Else: `score = 0`

### Salary

Let \(E\) = expected salary, \(J_{min}\) / \(J_{max}\) = job range, \(M = M_{sal}\).

- \(J_{max} < E\) → `0` (below expectation)
- \(J_{min} \le E \le J_{max}\) → `M` (in range)
- \(J_{min} > E\) → `min(M, M * (E / J_{min}))`

### Salary rationale

- Underpaying relative to expectation (\(J_{max} < E\)) scores zero on salary but does **not** exclude the job.
- In-range expectation is a perfect salary fit.
- When the job minimum sits above expectation, a transparent decay `M * E / Jmin` still awards partial credit for nearby bands and approaches 0 as the gap grows — useful for stretch roles without inventing opaque heuristics.

**Total score** = sum of dimension scores (≤ 100 with default/valid weight sets).

## API endpoints

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-09-13T12:00:00.000Z" }
```

### `POST /candidates`

Request:

```json
{
  "name": "Ada Lovelace",
  "yearsOfExperience": 5,
  "location": "London",
  "expectedSalary": 120000,
  "skills": ["  TypeScript ", "Node.js", "typescript"]
}
```

- Skills normalized: trim, lowercase, dedupe  
- `yearsOfExperience >= 0`, `expectedSalary > 0`  
- Response: `201` with candidate + skills

### `POST /jobs`

Request:

```json
{
  "title": "Backend Engineer",
  "minYearsExperience": 3,
  "location": "Remote",
  "salaryMin": 100000,
  "salaryMax": 150000,
  "remoteAllowed": true,
  "skills": [
    { "skill": "TypeScript", "type": "MUST_HAVE" },
    { "skill": "GraphQL", "type": "NICE_TO_HAVE" }
  ]
}
```

- `salaryMin <= salaryMax`, `minYearsExperience >= 0`  
- Skills normalized/deduped (first type wins)  
- Response: `201` with job + skills

### `GET /candidates/:candidateId/recommendations?limit=10`

- `candidateId` UUID  
- `limit` default 10, min 1, max 50  

```json
{
  "candidateId": "11111111-1111-4111-8111-111111111111",
  "recommendations": [
    {
      "jobId": "...",
      "title": "Backend Engineer",
      "score": 95,
      "breakdown": {
        "skills": { "score": 50, "maxScore": 50, "details": {} },
        "experience": { "score": 20, "maxScore": 20, "details": {} },
        "location": { "score": 10, "maxScore": 15, "details": {} },
        "salary": { "score": 15, "maxScore": 15, "details": {} }
      }
    }
  ]
}
```

### `GET /jobs/:jobId/recommendations?limit=10`

Same validation rules for `limit`; `jobId` UUID.

```json
{
  "jobId": "66666666-6666-4666-8666-666666666666",
  "recommendations": [
    {
      "candidateId": "...",
      "name": "Ada Lovelace",
      "score": 100,
      "breakdown": { "skills": {}, "experience": {}, "location": {}, "salary": {} }
    }
  ]
}
```

## Validation and error handling

- Zod validates request params/query/body in controllers.
- `asyncHandler` forwards failures to a **central** `errorHandler` (no duplicated try/catch formatting).

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Invalid UUID / body shape issues |
| `INVALID_LIMIT` | 400 | `limit` out of range / invalid |
| `CANDIDATE_NOT_FOUND` | 404 | Unknown candidate |
| `JOB_NOT_FOUND` | 404 | Unknown job |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected failures |

Example:

```json
{
  "error": {
    "code": "CANDIDATE_NOT_FOUND",
    "message": "Candidate not found: ...",
    "status": 404,
    "details": { "candidateId": "..." }
  }
}
```

## Testing strategy

- **Unit:** eligibility, each scorer, scoring weights validation, scoring engine, services with mocked repositories, controllers with mocked services
- **API/integration:** Supertest against `createApp` with injected `RecommendationService` (real eligibility + scoring, mocked persistence)
- Coverage intent: hard filters, soft scores, ranking, ties, limits, 400/404 paths, weight totals ≤ 100

```bash
npm test
npm run lint
npm run build
```

## Docker setup

```bash
# Build images, start API + Postgres, run migrations on boot
docker compose up --build

# Health
curl http://localhost:3000/health
```

Compose sets:

```text
DATABASE_URL=postgresql://postgres:postgres@db:5432/job_match?schema=public
```

Postgres data persists in the `postgres_data` volume.

```bash
docker compose down        # stop; keep volume
docker compose down -v     # stop and wipe DB volume
```

Entrypoint runs `npx prisma migrate deploy` before `node dist/server.js`.

### Local API against Compose Postgres

```bash
docker compose up db -d
cp .env.example .env
npm install
npm run prisma:migrate:deploy
npm run dev
```

## Assumptions

- Skill tokens are free-form strings after normalization (no controlled vocabulary).
- Salaries are integers in a single currency/unit.
- Locations are opaque strings (normalized by trim/lowercase), not geo coordinates.
- “All jobs” / “all candidates” fit in memory for recommendation scans (fine for assignment scale).
- Scoring weights are product configuration owned by the application, not per-request knobs.
- No authentication or multi-tenancy.

## Tradeoffs

| Choice | Benefit | Cost |
| --- | --- | --- |
| Modular monolith | Simple ops, strong consistency | Vertical scaling first |
| Rule-based scoring | Explainable, testable, deterministic | Not personalized/learned |
| Scan all jobs/candidates | Correct and simple | O(n) per recommendation request |
| Prisma + Postgres | Clear schema/migrations | Requires DB for full create/recommend path |
| Weights in code/config | Stable product behavior | Requires deploy/config change to retune |

## Why Redis / ML / queues were not used

- **Redis:** no caching or session layer required for correctness; premature for this dataset size.
- **ML:** assignment asks for transparent weighted scoring with a breakdown; models would obscure eligibility/score rules and complicate testing.
- **Queues/workers:** recommendations are synchronous request/response; async pipelines add moving parts without a throughput requirement yet.

## Scalability considerations

Current design is appropriate for moderate catalogs. Next steps if load grows:

1. Prefilter jobs/candidates in SQL (must-have skill intersection, location/salary windows) before scoring.
2. Add pagination beyond `limit` for large result sets.
3. Cache hot recommendation responses with short TTL if read-heavy.
4. Split read replicas for recommendation scans.
5. Extract scoring to a library/package if multiple services need it — still without forcing microservices prematurely.

## Future improvements

- GET-by-id and list endpoints for candidates/jobs (create + recommend exist today)
- Controlled skill taxonomy / synonyms
- Structured locations (city, region, remote-only flag)
- Observability (request metrics, score distribution dashboards)
- Authn/authz if exposed publicly
- Optional admin API to reload weight config from a secure config store (still not query-param driven)

## AI / Cursor usage

This codebase was developed iteratively in Cursor with an agent-assisted workflow: scaffolding the modular layout, implementing Prisma models and APIs, encoding eligibility/scoring as pure domain logic with Vitest coverage, then Dockerizing and documenting against the **actual** implementation. Human review remains responsible for product weight choices and production readiness.

---

**Default scoring behavior is unchanged:** skills 50 (40+10 split), experience 20, location 15 (remote 10), salary 15.
