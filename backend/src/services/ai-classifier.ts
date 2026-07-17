import { z } from 'zod';

import { config } from '../config';
import type { AiCategory, AiClassification } from '../types/ci-runs';

interface FailureInput {
  name: string;
  suite: string;
  message: string | null;
}

const CATEGORIES: AiCategory[] = ['timing', 'network', 'assertion', 'environment', 'unknown'];

const classifyResponseSchema = z.object({
  category: z.enum(CATEGORIES as [AiCategory, ...AiCategory[]]),
  summary: z.string(),
  suggestion: z.string(),
});

const FALLBACK: AiClassification = {
  category: 'unknown',
  summary: 'AI classification unavailable for this failure.',
  suggestion: 'Retry classification later, or investigate the failure manually in the meantime.',
};

// Calls the ai-classifier microservice (see ../../ai-classifier),
// a separate process this backend has no in-process dependency on. Falls
// back to a fixed "unknown" result on any request/parse failure — this is
// a Pro-plan perk fired fire-and-forget after ingestion (see
// ci-runs.ts:maybeClassifyFailures), so a slow or unavailable classifier
// must never block or fail CI's response.
export async function classifyFailure(input: FailureInput): Promise<AiClassification> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.aiClassifier.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${config.aiClassifier.url}/v1/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`ai-classifier returned ${res.status}`);
    }

    const body = await res.json();
    return classifyResponseSchema.parse(body);
  } catch {
    return FALLBACK;
  }
}
