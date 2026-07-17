import { Router, type Request, type Response } from 'express';
import { ensureAuthenticated } from '../auth/middleware';
import { createToken, listTokens, revokeToken } from '../services/tokens';

export const tokensRouter = Router();

tokensRouter.use('/tokens', ensureAuthenticated);

tokensRouter.get('/tokens', async (req: Request, res: Response) => {
  const tokens = await listTokens(req.user!.id);
  res.json(tokens);
});

tokensRouter.post('/tokens', async (req: Request, res: Response) => {
  const { repo, name } = req.body as { repo?: string; name?: string };
  if (!repo) {
    res.status(400).json({ error: 'repo is required' });
    return;
  }

  const issued = await createToken(req.user!.id, repo, name ?? null);
  res.status(201).json(issued);
});

tokensRouter.delete('/tokens/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'invalid token id' });
    return;
  }

  const revoked = await revokeToken(req.user!.id, id);
  if (!revoked) {
    res.status(404).json({ error: 'token not found' });
    return;
  }
  res.status(204).end();
});
