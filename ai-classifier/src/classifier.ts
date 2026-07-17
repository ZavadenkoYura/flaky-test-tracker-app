import { cos_sim, env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

import { config } from './config.js';
import { AI_CATEGORIES, type AiCategory, type ClassifyResponse } from './types.js';

if (config.modelCacheDir) {
  env.cacheDir = config.modelCacheDir;
}

// Classification is nearest-exemplar similarity over sentence embeddings,
// not zero-shot NLI. In testing, zero-shot classification (even with the
// much larger Xenova/bart-large-mnli) consistently misread domain jargon
// like "ECONNREFUSED" or "ENOENT" as an "assertion failure" — general NLI
// models aren't trained on error-code vocabulary, so entailment scoring
// breaks down on this kind of text. Embedding the failure message and
// comparing it against a handful of example phrases per category (including
// the raw error codes) sidesteps that: it only needs the two texts to be
// semantically close, not a valid logical entailment.
const EXEMPLARS: Record<AiCategory, string[]> = {
  timing: [
    'Timeout exceeded while waiting for an element or condition',
    'The test failed because it took too long or hit a race condition',
    'A wait or retry finished too early, before the async operation completed',
    'Operation timed out after N seconds/milliseconds',
  ],
  network: [
    'Connection refused or connection reset by the server',
    'DNS lookup failed or host not found',
    'A socket, HTTP request, or network call failed',
    'ECONNREFUSED ENOTFOUND ETIMEDOUT socket hang up network error',
  ],
  assertion: [
    'The expected value did not equal the actual value',
    'An assertion in the test failed because of a logic mismatch',
    'expected X to equal Y, values did not match',
  ],
  environment: [
    'A required file, environment variable, or dependency was missing',
    'Permission denied or access denied error',
    'ENOENT EACCES missing config file or module not found',
  ],
  unknown: [
    'An error occurred with no clear or recognizable cause',
    'No useful information was provided about the failure',
  ],
};

// Below this best-match similarity we don't trust the nearest category
// enough to report it — better to say "unknown" than confidently mislabel
// a message that doesn't clearly resemble any category's exemplars.
const LOW_CONFIDENCE_THRESHOLD = 0.3;

export interface FailureInput {
  name: string;
  suite: string;
  message: string | null;
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
let exemplarEmbeddingsPromise: Promise<Record<AiCategory, number[][]>> | null = null;

// Loaded lazily on first request, not at server boot, so the process can
// start (and answer /healthz) immediately — the one-time model download
// and load only happens once the first classification is actually needed.
function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', config.modelId);
  }
  return extractorPromise;
}

// Serializes every forward pass through the extractor — running concurrent
// calls against the same onnxruntime session corrupted tensors in testing
// (dims came back `undefined`). A single small embedding model is fast
// enough per-call that queueing costs nothing noticeable in practice.
let embedQueue: Promise<unknown> = Promise.resolve();

function embed(extractor: FeatureExtractionPipeline, text: string): Promise<number[]> {
  const run = embedQueue.then(() => extractor(text, { pooling: 'mean', normalize: true }));
  embedQueue = run.catch(() => undefined);
  return run.then((output) => Array.from(output.data as Float32Array));
}

async function getExemplarEmbeddings(): Promise<Record<AiCategory, number[][]>> {
  if (!exemplarEmbeddingsPromise) {
    exemplarEmbeddingsPromise = (async () => {
      const extractor = await getExtractor();
      const entries = await Promise.all(
        AI_CATEGORIES.map(async (category) => {
          // Safe to fire concurrently despite the shared extractor — embed()
          // queues every call onto a single serialized chain internally.
          const vectors = await Promise.all(EXEMPLARS[category].map((phrase) => embed(extractor, phrase)));
          return [category, vectors] as const;
        })
      );

      return Object.fromEntries(entries) as Record<AiCategory, number[][]>;
    })();
  }
  return exemplarEmbeddingsPromise;
}

function buildInputText({ name, suite, message }: FailureInput): string {
  return `Test "${suite} :: ${name}" failed with: ${message ?? '(no failure message captured)'}`;
}

// One template per category, written so `summary` + `suggestion` can be
// dropped straight into a GitHub issue body ("What's wrong" / "Suggested
// approach") without further rewriting. These describe the *category*, not
// the specific test — callers should still include the raw failure message
// for context, which is why buildSummary appends it below.
const CATEGORY_GUIDANCE: Record<Exclude<AiCategory, 'unknown'>, { summary: string; suggestion: string }> = {
  timing: {
    summary:
      'Looks like a timing-related failure — a timeout, a race condition, or a wait that resolved before the awaited condition was actually true.',
    suggestion:
      'Reproduce with the suite run in isolation vs. under full CI load to see if load-dependent timing is the cause. Prefer condition-based polling over fixed sleeps/waits, check for a missing `await`, and consider whether this specific timeout needs a longer allowance in CI than locally.',
  },
  network: {
    summary:
      'Looks like a network or connectivity failure — a refused/reset connection, a DNS lookup failure, or a failed HTTP/socket call.',
    suggestion:
      'Confirm the dependency this test talks to (DB, external API, etc.) was actually up and reachable when the run happened — a missing health-check/wait-for-it step before the suite starts is a common cause in CI. Also check for hardcoded hosts/ports that differ between local and CI environments.',
  },
  assertion: {
    summary:
      "Looks like a straightforward assertion failure — the actual value didn't match what the test expected.",
    suggestion:
      'Reproduce locally with the same input to see the exact expected-vs-actual diff. Check recent changes to the code under test and to any fixtures/test data it depends on — this could be a real regression or a test that needs updating.',
  },
  environment: {
    summary:
      'Looks like an environment/configuration failure — a missing file, environment variable, dependency, or a permissions error.',
    suggestion:
      "Verify CI has the same setup as local dev: required env vars/secrets set, install/setup steps run before this test, and file paths resolved relative to the correct working directory rather than a developer's machine.",
  },
};

function buildSummary(category: AiCategory, message: string | null): string {
  if (category === 'unknown' || !message) {
    return message
      ? "No failure signal clearly matched a known category — the message didn't closely resemble timing, network, assertion, or environment examples."
      : 'No failure message was captured for this run, so nothing could be classified.';
  }
  const { summary } = CATEGORY_GUIDANCE[category];
  return `${summary} Failure message: "${message}"`;
}

function buildSuggestion(category: AiCategory): string {
  if (category === 'unknown') {
    return 'Capture more diagnostic output for this test (full stack trace, request/response bodies, screenshots) so the next failure can be classified with more confidence.';
  }
  return CATEGORY_GUIDANCE[category].suggestion;
}

export async function classifyFailure(input: FailureInput): Promise<ClassifyResponse> {
  if (!input.message) {
    return {
      category: 'unknown',
      summary: buildSummary('unknown', null),
      suggestion: buildSuggestion('unknown'),
      confidence: 0,
    };
  }

  const [extractor, exemplarEmbeddings] = await Promise.all([getExtractor(), getExemplarEmbeddings()]);
  const inputVector = await embed(extractor, buildInputText(input));

  const scored = AI_CATEGORIES.map((category) => {
    const best = Math.max(...exemplarEmbeddings[category].map((v) => cos_sim(inputVector, v)));
    return { category, score: best };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const category: AiCategory = top.score >= LOW_CONFIDENCE_THRESHOLD ? top.category : 'unknown';
  const confidence = category === top.category ? top.score : 0;

  return {
    category,
    summary: buildSummary(category, input.message),
    suggestion: buildSuggestion(category),
    confidence: Number(confidence.toFixed(3)),
  };
}

// Kicks off model loading without waiting on it — called at server boot so
// the (large, one-time) download/load happens in the background instead of
// stalling the first real request.
export function warmUpClassifier(): void {
  void getExemplarEmbeddings();
}
