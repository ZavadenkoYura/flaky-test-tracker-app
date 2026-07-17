import type { Request, Response, NextFunction } from 'express';
import { verifyTokenForRepo } from '../services/tokens';

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  res.status(401).json({ error: 'not authenticated' });
}

// Gates CI ingestion: expects `Authorization: Bearer <token>` plus a `repo`
// field already parsed onto req.body (run this after multer for multipart
// requests), and only accepts the token for the exact repo it was issued for.
export async function requireCiToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const repo = req.body?.repo;

  if (!header?.startsWith('Token ') || !repo) {
    res.status(401).json({ error: 'missing bearer token or repo' });
    return;
  }

  const rawToken = header.slice('Token '.length);
  const userId = await verifyTokenForRepo(rawToken, repo);
  if (!userId) {
    res.status(401).json({ error: 'invalid token for this repo' });
    return;
  }

  req.ciUserId = userId;
  next();
}
