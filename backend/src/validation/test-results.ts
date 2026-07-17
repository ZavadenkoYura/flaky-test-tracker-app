import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// Mirrors the multipart/form-data payload posted by the CI workflow step:
//   -F repo=owner/repo -F commit_sha=<sha> -F branch=<ref> -F ci_run_id=<id> -F results=@results.xml
export const testResultsBodySchema = z.object({
  repo: z
    .string({ error: 'repo is required' })
    .trim()
    .regex(/^[^/\s]+\/[^/\s]+$/, 'repo must be in "owner/repo" format'),
  commit_sha: z
    .string({ error: 'commit_sha is required' })
    .trim()
    .regex(/^[0-9a-f]{7,40}$/i, 'commit_sha must be a git SHA (7-40 hex characters)'),
  branch: z.string().trim().min(1, 'branch must not be empty').optional(),
  ci_run_id: z.string().trim().min(1, 'ci_run_id must not be empty').optional(),
});

export type TestResultsBody = z.infer<typeof testResultsBodySchema>;

const ALLOWED_RESULTS_MIME_TYPES = new Set(['text/xml', 'application/xml']);

export function validateTestResultsUpload(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    res.status(400).json({ error: 'missing "results" file field with JUnit XML content' });
    return;
  }
  if (!ALLOWED_RESULTS_MIME_TYPES.has(req.file.mimetype)) {
    res.status(400).json({
      error: `"results" file must be XML (text/xml or application/xml), got "${req.file.mimetype}"`,
    });
    return;
  }
  if (req.file.size === 0) {
    res.status(400).json({ error: '"results" file must not be empty' });
    return;
  }

  const parsed = testResultsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'invalid test_results payload',
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  req.body = parsed.data;
  next();
}
