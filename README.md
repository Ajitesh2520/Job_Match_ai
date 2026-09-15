# Job Match API

Recommend jobs to candidates (and candidates to jobs) with an **explainable 0–100 score**.

Must-have skills are a **hard filter**. Experience, location, salary, and nice-to-have skills only affect ranking.

---

## How to run

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+ **or** Docker / Docker Compose

### Option A — Docker (API + Postgres)

```bash
docker compose up --build
```

- API: http://localhost:3000  
- Health: `curl http://localhost:3000/health`  
- On boot the container runs `prisma migrate deploy`, then starts the server.  
- Postgres data is stored in the `postgres_data` volume.

```bash
docker compose down        # stop; keep DB volume
docker compose down -v     # stop and wipe DB
```

Compose sets:

```text
DATABASE_URL=postgresql://postgres:postgres@db:5432/job_match?schema=public
```

### Option B — Local API + Docker Postgres

```bash
docker compose up db -d

cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Default local `.env`:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/job_match?schema=public
PORT=3000
```

### Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Hot-reload API |
| `npm test` | Vitest (scoring + API tests) |
| `npm run lint` | ESLint |
| `npm run build` | Compile TypeScript |
| `npm start` | Run `dist/server.js` |

### Quick smoke

```bash
# Create a candidate
curl -s -X POST http://localhost:3000/candidates \
  -H 'content-type: application/json' \
  -d '{
    "name": "Ada Lovelace",
    "yearsOfExperience": 5,
    "location": "London",
    "expectedSalary": 120000,
    "skills": ["TypeScript", "Node.js"]
  }'

# Create a job
curl -s -X POST http://localhost:3000/jobs \
  -H 'content-type: application/json' \
  -d '{
    "title": "Backend Engineer",
    "minYearsExperience": 3,
    "location": "London",
    "salaryMin": 100000,
    "salaryMax": 150000,
    "remoteAllowed": false,
    "skills": [
      { "skill": "TypeScript", "type": "MUST_HAVE" },
      { "skill": "GraphQL", "type": "NICE_TO_HAVE" }
    ]
  }'

# Recommend jobs for a candidate (replace UUID)
curl -s "http://localhost:3000/candidates/<candidateId>/recommendations?limit=10"

# Recommend candidates for a job (replace UUID)
curl -s "http://localhost:3000/jobs/<jobId>/recommendations?limit=10"
```

---

## Scoring formula (most important)

Matching is **two-phase**:

1. **Eligibility (hard filter)** — only `MUST_HAVE` skills can exclude a pair.  
2. **Scoring (soft ranking)** — eligible pairs get a 0–100 score with a per-dimension breakdown.

Nice-to-have skills, experience, location, and salary **never** exclude a candidate/job.

### Weights (total = 100)

Configured in `src/config/scoring.ts` (application config — **not** request query params):

| Dimension | Weight | Role |
| --- | --- | --- |
| **Skills** | **50** | Primary signal of role fit |
| **Experience** | **20** | Soft constraint |
| **Location** | **15** | Preference, not a gate |
| **Salary** | **15** | Preference / fit |
| **Total** | **100** | |

Weights are validated to be ≥ 0 and sum to **exactly 100**.

### Why these weights

- **Skills get half the score (50)** because capability match is the main hiring signal. Must-haves are already enforced by eligibility, so the skills score rewards remaining fit (especially nice-to-haves) without re-litigating “can they do the job at all?”
- **Experience (20)** matters, but over-weighting it would bury strong skill matches who are slightly under the posted years. Soft scoring keeps them visible for human review.
- **Location and salary (15 each)** are real preferences, but should not outweigh skills. A perfect skill match in another city (or with a stretch salary band) should still rank well when remote is allowed or bands are close.

This is deliberately **explainable and deterministic** — not ML. That makes results auditable in an interview/demo and easy to unit test.

### Phase 1 — Eligibility

- Job has no must-have skills → eligible.  
- Candidate missing **any** must-have → **excluded** (not scored).  
- Skill compare: trim + lowercase.  
- Duplicates after normalization count once.

### Phase 2 — Dimension formulas

Let \(M_s=50\), \(M_e=20\), \(M_l=15\), \(M_{sal}=15\) (defaults).

#### Skills (max 50)

Within the skills budget:

- Must-have share: **80%** → 40 points (assumes eligibility already passed)
- Nice-to-have share: **20%** → up to 10 points

```text
if job has no nice-to-have skills:
  skillsScore = 50                    # do not penalize
else:
  skillsScore = 40 + 10 * (matchedNice / totalNice)
```

#### Experience (max 20)

```text
if minYears == 0 or candidateYears >= minYears:
  experienceScore = 20
else:
  experienceScore = (candidateYears / minYears) * 20
```

#### Location (max 15)

```text
if exact location match (trim + lowercase):
  locationScore = 15
else if job.remoteAllowed:
  locationScore = 10                  # 10/15 of the location weight
else:
  locationScore = 0
```

#### Salary (max 15)

Let \(E\) = candidate expected salary, \(J_{min}\)/\(J_{max}\) = job range.

```text
if Jmax < E:                         # job pays below expectation
  salaryScore = 0
else if Jmin <= E <= Jmax:           # expectation inside range
  salaryScore = 15
else:                                # Jmin > E (job min above expectation)
  salaryScore = min(15, 15 * (E / Jmin))
```

**Salary rationale:** underpaying scores 0 on salary but does **not** drop the job. In-range is a perfect salary fit. When the job minimum is above expectation, `15 * E / Jmin` gives transparent partial credit for nearby bands and decays toward 0 as the gap grows — simple enough to explain, no opaque heuristics.

### Final score

```text
total = skillsScore + experienceScore + locationScore + salaryScore
# with default weights: 0 ≤ total ≤ 100
```

Response includes `score` plus `breakdown` (`score` / `maxScore` / `details` per dimension).

Both directions use the **same** eligibility + scoring code:

- `GET /candidates/:candidateId/recommendations`
- `GET /jobs/:jobId/recommendations`

---

## Scoring tests (highest-value coverage)

Run:

```bash
npm test
```

Focused scoring / eligibility tests live under:

```text
src/modules/recommendations/domain/
  eligibility-checker.test.ts
  scorers/*.test.ts
  scoring-engine.test.ts
  scoring.pipeline.test.ts          # end-to-end eligibility + score edge cases
src/config/scoring.test.ts          # weight validation (sum = 100)
```

Highest-value cases covered:

| Case | Expected |
| --- | --- |
| Candidate missing a must-have skill | Pair excluded (not scored) |
| Missing multiple must-haves | Excluded |
| Nice-to-have missing | Still eligible; skills score reduced |
| Job with no must-haves | Eligible |
| No salary overlap (`Jmax < E`) | Salary dimension = 0; pair still eligible |
| Salary in range / on boundaries | Salary = 15 |
| Experience below / equal / above min | Soft proportional or full 20 |
| Exact vs remote vs mismatch location | 15 / 10 / 0 |
| Perfect match | Total = 100 |
| Soft mismatches | Total ≤ 100 |

---

## Assumptions

1. Skill names are free-text after normalize (trim + lowercase); no controlled vocabulary.  
2. Salaries are integers in one currency/unit.  
3. Locations are opaque strings (compared case-insensitively), not geo coordinates.  
4. Catalog size fits an in-memory scan of all jobs/candidates per request (fine for this assignment).  
5. Scoring weights are product configuration, not something clients tune per request.  
6. No auth / multi-tenancy.

## What I’d do differently with more time

1. **SQL prefilter** before scoring (must-have skill intersection) instead of `findAll` + in-memory filter — required before large catalogs.  
2. **DB CHECK** that `salaryMin <= salaryMax` (today Zod-only).  
3. Normalize **location on write** the same way skills are normalized.  
4. Map Prisma unique violations to proper HTTP codes (not generic 500).  
5. Slimmer multi-stage Docker image (`omit=dev`).  
6. Real Postgres smoke tests (Testcontainers) for create → recommend.  
7. Implement or remove the 501 list/get-by-id stubs for a cleaner API surface.  
8. Defense-in-depth in `SkillScorer` so must-have points aren’t assumed solely from eligibility.

---

## AI tooling (Cursor)

This project was built with **Cursor agent assistance**, under explicit human constraints (modular monolith, Strategy + Repository, no Redis/ML/queues, fixed scoring rules).

### Where AI helped

- Project scaffolding (Express/Prisma/Vitest layout, Docker Compose)  
- Boilerplate controllers/repositories and Zod schemas  
- Expanding unit/API tests and drafting long-form docs  
- Refactors like shared recommendation scoring for the reverse endpoint  

### Where I overrode or steered AI output

- **Kept scope minimal** — rejected extras (auth, Redis, queues, frontend, microservice split).  
- **Locked scoring semantics** — must-have as hard filter; weights 50/20/15/15; salary `E/Jmin` formula as specified, not “smarter” opaque alternatives.  
- **Architecture** — Controller → Service → Repository with constructor DI; scorers stay pure (no Prisma/Express).  
- **Weights not on query params** — treated as product config only.  
- **Review pass** — identified issues such as full-table scans, SkillScorer/eligibility coupling, missing DB salary CHECK, and Docker image bloat; those remain known tradeoffs unless explicitly fixed next.  
- **README focus** — trimmed from an encyclopedia-style doc to prioritize the scoring formula and how to run/test.

AI accelerated scaffolding and test writing; product rules, exclusions, and final judgment calls were human-directed.

---

## Architecture (short)

```text
Controller → Service → Repository → Prisma/PostgreSQL

Recommendation:
  EligibilityChecker → ScoringEngine → [Skill, Experience, Location, Salary] strategies
```

Modular monolith: one process, clear modules (`candidates`, `jobs`, `recommendations`), shared DB. Chosen over microservices because matching needs both entities in one request and the scale doesn’t justify distributed complexity yet.

---

## Main endpoints

| Method | Path |
| --- | --- |
| `GET` | `/health` |
| `POST` | `/candidates` |
| `POST` | `/jobs` |
| `GET` | `/candidates/:candidateId/recommendations?limit=10` |
| `GET` | `/jobs/:jobId/recommendations?limit=10` |

`limit` defaults to 10, min 1, max 50.

Errors use stable codes such as `VALIDATION_ERROR`, `INVALID_LIMIT`, `CANDIDATE_NOT_FOUND`, `JOB_NOT_FOUND`.
