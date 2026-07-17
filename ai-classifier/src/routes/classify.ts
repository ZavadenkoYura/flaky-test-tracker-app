import { Router, type Request, type Response } from 'express';

import { classifyFailure } from '../classifier.js';
import { ClassifyRequestSchema } from '../types.js';

export const classifyRouter = Router();

classifyRouter.post('/v1/classify', async (req: Request, res: Response) => {
  const parsed = ClassifyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid request body', issues: parsed.error.issues });
    return;
  }

  try {
    const result = await classifyFailure(parsed.data);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `classification failed: ${(err as Error).message}` });
  }
});
