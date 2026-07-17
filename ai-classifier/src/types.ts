import { z } from 'zod';

// Mirrors the AiCategory taxonomy the backend already
// stores against a test run (see its src/types/ci-runs.ts) — keeping the
// same five buckets means this service can slot in as a drop-in replacement
// for the tracker's local mock classifier without a data-model change.
export const AI_CATEGORIES = ['timing', 'network', 'assertion', 'environment', 'unknown'] as const;
export type AiCategory = (typeof AI_CATEGORIES)[number];

export const ClassifyRequestSchema = z.object({
  name: z.string().min(1, 'name is required'),
  suite: z.string().min(1, 'suite is required'),
  message: z.string().nullable(),
});
export type ClassifyRequest = z.infer<typeof ClassifyRequestSchema>;

export interface ClassifyResponse {
  category: AiCategory;
  // What the failure looks like — kept separate from `suggestion` so a
  // caller can compose them independently (e.g. a GitHub issue body with
  // "Problem" and "Suggested approach" sections) instead of parsing one
  // blob of text back apart.
  summary: string;
  suggestion: string;
  confidence: number;
}
