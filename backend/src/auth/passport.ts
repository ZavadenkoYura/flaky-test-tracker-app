import passport, { DoneCallback } from 'passport';
import { Strategy as GitHubStrategy, type Profile } from 'passport-github2';
import { config } from '../config';
import { User } from '../models/user';

function toExpressUser(user: User): Express.User {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    accessToken: user.access_token,
    plan: user.plan,
    memberSince: user.createdAt,
  };
}

passport.use(
  new GitHubStrategy(
    {
      clientID: config.github.clientId,
      clientSecret: config.github.clientSecret,
      callbackURL: config.github.callbackUrl,
      scope: ['repo', 'read:user'],
    },
    async (accessToken: string, _refreshToken: string, profile: Profile, done: DoneCallback) => {
      try {
        const githubId = String(profile.id);
        const avatarUrl = profile.photos?.[0]?.value ?? null;
        const displayName = profile.displayName || profile.username || githubId;

        const [user] = await User.upsert(
          {
            github_id: githubId,
            username: profile.username ?? githubId,
            display_name: displayName,
            avatar_url: avatarUrl,
            access_token: accessToken,
          },
          { conflictFields: ['github_id'] }
        );

        done(null, toExpressUser(user));
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

// Session only carries the small DB id — the profile + access token live in
// the users table and are looked up fresh on every request.
passport.serializeUser((user: Express.User, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      done(null, false);
      return;
    }
    done(null, toExpressUser(user));
  } catch (err) {
    done(err as Error);
  }
});

export { passport };
