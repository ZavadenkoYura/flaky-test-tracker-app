import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
