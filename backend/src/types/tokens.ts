export interface IssuedToken {
  id: number;
  repo: string;
  name: string | null;
  token: string;
  lastFour: string;
  createdAt: Date;
}

export interface TokenSummary {
  id: number;
  repo: string;
  name: string | null;
  lastFour: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}
