function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing required environment variable ${name}`);
  }
  return value;
}

export const config = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'flaky_test_tracker',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
  github: {
    get clientId() {
      return required('GITHUB_CLIENT_ID');
    },
    get clientSecret() {
      return required('GITHUB_CLIENT_SECRET');
    },
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/github/callback',
  },
};
