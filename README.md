# Flaky Test Tracker

Teams with real test suites eventually get flaky tests — failures that come
and go because of timing, shared state, or network hiccups, not because the
code is actually broken. Engineers lose trust in CI, re-run builds "just in
case", and nobody has clean data on which tests are the actual repeat
offenders.

Flaky Test Tracker ingests JUnit XML from your CI pipeline after every run,
tracks each test's pass/fail history per repo, and surfaces the tests that
alternate between passing and failing — ranked by a flakiness score. Pro
accounts additionally get each failure automatically classified (timing /
network / assertion / environment) with a plain-English summary and a
suggested next step, powered by a local embedding model.

## Architecture

Three independently deployable services:

- **`backend`** — Express + PostgreSQL API. Authenticates users via GitHub
  OAuth, issues per-repo CI tokens, ingests JUnit XML, computes flakiness
  scores, and handles Stripe billing for the Pro plan.
- **`ai-classifier`** — standalone microservice that classifies *why* a test
  failed, using sentence embeddings compared against a handful of example
  phrases per category (no external API key, no per-request network call —
  the model runs in-process). Called by the backend, fire-and-forget, only
  for Pro-plan repos.
- **`frontend`** — React + Vite dashboard where users connect repos, view
  their flakiest tests with AI analysis, manage CI tokens, and manage
  billing.

```mermaid
flowchart TB
    subgraph ci["CI pipeline"]
        direction LR
        Runner["Test runner\n(pytest / jest / etc.)"] -->|JUnit XML| Step["CI step\n(curl + repo token)"]
    end

    subgraph client["Browser"]
        Dashboard["React dashboard"]
    end

    subgraph platform["Flaky Test Tracker"]
        direction TB
        Backend["backend\n(Express API)"]
        DB[("PostgreSQL")]
        AI["ai-classifier\n(embedding model)"]
    end

    GitHub["GitHub OAuth"]
    Stripe["Stripe\n(billing + webhooks)"]

    Step -->|"POST /api/v1/test_results\nAuthorization: Token ..."| Backend
    Dashboard -->|"session cookie\nREST /api/v1/*"| Backend
    Backend -->|read/write| DB
    Backend -->|"POST /v1/classify\n(fire-and-forget, Pro only)"| AI
    AI -->|category + summary + suggestion| Backend
    Backend <-->|OAuth login, list repos| GitHub
    Backend <-->|checkout, subscription webhooks| Stripe

    style Backend fill:#4f46e5,color:#fff
    style AI fill:#0891b2,color:#fff
    style Dashboard fill:#059669,color:#fff
    style DB fill:#334155,color:#fff
```

### Request flow: ingesting a test run

```mermaid
sequenceDiagram
    participant CI as CI step
    participant BE as backend
    participant DB as PostgreSQL
    participant AI as ai-classifier

    CI->>BE: POST /api/v1/test_results (JUnit XML + repo token)
    BE->>BE: verify token, parse XML
    BE->>DB: bulk-insert one row per <testcase>
    BE-->>CI: 201 { ingested: N }
    Note over BE,AI: async, Pro plan only — never blocks the CI response
    BE->>AI: POST /v1/classify (per failed test)
    AI-->>BE: category, summary, suggestion
    BE->>DB: update ci_runs with AI classification
```

## Repos and tests, not "projects"

A user connects GitHub repos they have CI access to, generates a per-repo
API token from the dashboard, and adds one step to their CI workflow that
posts the JUnit XML results file after tests run. Everything else —
flakiness scoring, AI classification, the dashboard — works off that
ingested history with no further setup.

## Local development

Each service has its own `.env` (see each folder) and runs independently:

```bash
# 1. PostgreSQL (or run your own)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=flaky_test_tracker postgres:16

# 2. backend
cd backend && npm install && npm run db:init && npm run dev   # :3000

# 3. ai-classifier
cd ai-classifier && npm install && npm run dev                # :4100

# 4. frontend
cd frontend && npm install && npm run dev                     # :8000
```

## Deployment

Each service ships with its own `Dockerfile` and is meant to be deployed as
an independent container — e.g. as three separate services on Render, with
Render's managed PostgreSQL as the database. No `docker-compose.yml` is
included on purpose; that wiring lives on the hosting side.

| Service | Port | Depends on |
|---|---|---|
| `backend` | 3000 | PostgreSQL, `ai-classifier` (optional), GitHub OAuth app, Stripe |
| `ai-classifier` | 4100 | — (downloads its embedding model on first request) |
| `frontend` | 80 (nginx) | `backend` |

## Tech stack

- **Backend**: Node.js, TypeScript, Express, Sequelize, PostgreSQL, Passport
  (GitHub OAuth), Stripe, Zod, Multer
- **AI classifier**: Node.js, TypeScript, `@huggingface/transformers`
  (Xenova ONNX models, runs on CPU)
- **Frontend**: React 19, TypeScript, Vite, TanStack Query, Tailwind CSS,
  Radix UI, React Router
