import { Router, type Request, type Response } from 'express';
import { passport } from '../auth/passport';
import { ensureAuthenticated } from '../auth/middleware';
import { getUserCiRepos, getUserRepos } from '../services/auth';
import { config } from '../config';

export const authRouter = Router();

authRouter.get('/auth/github', passport.authenticate('github'));

authRouter.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: `${config.frontendUrl}/login?auth=failed` }),
  (_req: Request, res: Response) => {
    res.redirect(`${config.frontendUrl}/home/dashboard`);
  }
);

authRouter.get('/auth/me', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'not authenticated' });
    return;
  }
  const { username, displayName, avatarUrl, plan, memberSince } = req.user;
  res.json({ username, displayName, avatarUrl, plan, memberSince });
});

authRouter.post('/auth/logout', (req: Request, res: Response, next) => {
  req.logout((err) => {
    if (err) {
      next(err);
      return;
    }
    res.status(204).end();
  });
});

authRouter.get('/auth/repos', ensureAuthenticated, async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const perPage = req.query.per_page ? parseInt(req.query.per_page as string, 10) : 100;
  const scope = req.query.scope === 'ci' ? 'ci' : 'all';

  try {
    const result =
      scope === 'ci'
        ? await getUserCiRepos(req.user!.accessToken, page, perPage)
        : await getUserRepos(req.user!.accessToken, page, perPage);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: `failed to fetch repos from GitHub: ${(err as Error).message}` });
  }
});
