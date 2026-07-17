# ai-classifier

Standalone microservice that classifies why an automated test failed, using a
real HuggingFace zero-shot classification model running locally (no external
API key, no network call per request — the model runs in-process on CPU).

It is **not** wired into `backend` yet. This is a self-contained
service you run and test on its own first; `backend/src/services/ai-classifier.ts`
still uses its local mock in the meantime.

## Why REST over gRPC (for now)

gRPC's main draw here is a strongly-typed request/response contract via
`.proto` — but that's also achievable with a shared TypeScript contract
(`src/types.ts`) plus runtime validation (`zod`), which is what this service
does. Given the stated next step is "test it ourselves" rather than wiring it
into another service, REST/JSON wins on iteration speed: it's inspectable
with `curl`, requires no codegen step, and needs no client stubs to poke at
by hand. gRPC's benefits (binary framing, streaming, generated typed clients)
matter most once a real caller depends on this service in production — worth
revisiting once the contract below has proven stable and the tracker backend
is ready to actually call it. If/when that happens, the request/response
shapes in `src/types.ts` translate directly into a `.proto` message
definition, so the migration is additive, not a rewrite.

## Model

`Xenova/nli-deberta-v3-xsmall` (~130MB, downloaded once on first request and
cached locally) via [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) —
the official JS port of HuggingFace's `transformers` library. It runs
zero-shot classification: the failure message is scored against five
candidate category descriptions (the same taxonomy the tracker already
stores: `timing`, `network`, `assertion`, `environment`, `unknown`), no
fine-tuning required. Swap `MODEL_ID` in `.env` for any other zero-shot
model on the Hub if you want to compare accuracy/latency trade-offs.

## Run it

```bash
cp .env.example .env
npm install
npm run dev
```

First request after boot will be slow (model download + load, one-time,
cached under HuggingFace's local cache dir afterward). `warmUpClassifier()`
kicks that load off in the background as soon as the server starts, so it's
usually already warm by the time you send a request.

## Test it yourself

With `npm run dev` running in one terminal:

```bash
npm run smoke-test
```

Runs five representative failure messages (timing/network/assertion/
environment/no-message) through `/v1/classify` and prints the category,
confidence, summary, and suggestion for each — no separate HTTP client needed.

Or by hand:

```bash
curl http://localhost:4100/healthz

curl -X POST http://localhost:4100/v1/classify \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "submits form within 2s",
    "suite": "CheckoutFlow",
    "message": "Timeout of 2000ms exceeded waiting for element to become visible"
  }'
```

## API

### `GET /healthz`
`{ "status": "ok" }`

### `POST /v1/classify`

Request:
```jsonc
{
  "name": "submits form within 2s",   // required
  "suite": "CheckoutFlow",             // required
  "message": "Timeout of 2000ms..."    // required, but nullable
}
```

Response:
```jsonc
{
  "category": "timing",     // "timing" | "network" | "assertion" | "environment" | "unknown"
  "summary": "Looks like a timing-related failure — a timeout, a race condition, or a wait that resolved before the awaited condition was actually true. Failure message: \"Timeout of 2000ms exceeded waiting for element to become visible\"",
  "suggestion": "Reproduce with the suite run in isolation vs. under full CI load to see if load-dependent timing is the cause. Prefer condition-based polling over fixed sleeps/waits, check for a missing `await`, and consider whether this specific timeout needs a longer allowance in CI than locally.",
  "confidence": 0.616
}
```

`summary` and `suggestion` are separate fields on purpose — they're meant to drop straight into a GitHub issue body as distinct "What's wrong" / "Suggested approach" sections, without a caller having to parse one blob of text back apart.

`400` on an invalid body (missing `name`/`suite`, wrong types), `500` if
classification itself throws.
