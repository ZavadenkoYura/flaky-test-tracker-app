import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { requireCiToken } from '../auth/middleware';
import { ingestResults, getFlakyTests } from '../services/ci-runs';
import { validateTestResultsUpload, type TestResultsBody } from '../validation/test-results';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const ciRunsRouter = Router();

// CI step posts the JUnit XML file plus metadata identifying the run.
// multipart/form-data: file field "results", plus repo/commit_sha/branch/ci_run_id fields.
ciRunsRouter.post(
  '/test_results',
  upload.single('results'),
  validateTestResultsUpload,
  requireCiToken,
  async (req: Request, res: Response) => {
    // validateTestResultsUpload has already verified req.file is present and req.body matches TestResultsBody.
    const { repo, commit_sha, branch, ci_run_id } = req.body as TestResultsBody;
    const file = req.file as Express.Multer.File;

    let ingested: number;
    try {
      ingested = await ingestResults(repo, { commit_sha, branch, ci_run_id }, file.buffer.toString('utf-8'));
    } catch (err) {
      res.status(400).json({ error: `failed to ingest JUnit XML: ${(err as Error).message}` });
      return;
    }

    res.status(201).json({ ingested });
  },
);

ciRunsRouter.get('/flaky/:repo', async (req: Request, res: Response) => {
  const windowSize = req.query.window ? parseInt(req.query.window as string, 10) : 50;
  const results = await getFlakyTests(req.params.repo, windowSize);
  res.json(results);
});
