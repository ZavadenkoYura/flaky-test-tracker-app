declare global {
  namespace Express {
    interface Request {
      // Set by requireCiToken once the bearer token is verified for the
      // claimed repo — the CI caller has no session, so this is how
      // downstream handlers learn which user (and plan) owns this request.
      ciUserId?: number;
    }
    interface User {
      id: number;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      accessToken: string;
      plan: 'free' | 'pro';
      memberSince: Date;
    }
  }
}

export {};
