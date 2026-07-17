import { randomBytes, createHash } from 'node:crypto';
import { ApiToken } from '../models/api-token';
import type { IssuedToken, TokenSummary } from '../types/tokens';

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// Raw token is returned to the caller exactly once — only its hash and last
// four characters are persisted, mirroring how GitHub/Stripe show API keys.
export async function createToken(userId: number, repo: string, name: string | null): Promise<IssuedToken> {
  const rawToken = randomBytes(32).toString('hex');
  const record = await ApiToken.create({
    user_id: userId,
    repo,
    name,
    token_hash: hashToken(rawToken),
    last_four: rawToken.slice(-4),
  });

  return {
    id: record.id,
    repo: record.repo,
    name: record.name,
    token: rawToken,
    lastFour: record.last_four,
    createdAt: record.createdAt,
  };
}

export async function listTokens(userId: number): Promise<TokenSummary[]> {
  const records = await ApiToken.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']],
  });

  return records.map((r) => ({
    id: r.id,
    repo: r.repo,
    name: r.name,
    lastFour: r.last_four,
    createdAt: r.createdAt,
    lastUsedAt: r.last_used_at,
  }));
}

export async function revokeToken(userId: number, tokenId: number): Promise<boolean> {
  const deleted = await ApiToken.destroy({ where: { id: tokenId, user_id: userId } });
  return deleted > 0;
}

// Used by the ingestion endpoint: confirms the bearer token is valid for the
// exact repo the CI job claims to be reporting on, so a leaked token can only
// ever poison data for the one repo it was issued for. Returns the owning
// user's id (rather than a plain boolean) so callers can look up plan/etc.
export async function verifyTokenForRepo(rawToken: string, repo: string): Promise<number | null> {
  const record = await ApiToken.findOne({ where: { token_hash: hashToken(rawToken), repo } });
  if (!record) return null;
  await record.update({ last_used_at: new Date() });
  return record.user_id;
}
