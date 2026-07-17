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
    // Neon (and most managed Postgres) hand you a single connection string —
    // set DATABASE_URL to use it directly instead of the individual fields
    // below (which remain the default for local dev).
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'flaky_test_tracker',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    // Neon requires SSL; local Postgres typically doesn't support it.
    ssl: process.env.DB_SSL === 'true',
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
  stripe: {
    get secretKey() {
      return required('STRIPE_SECRET_KEY');
    },
    get webhookSecret() {
      return required('STRIPE_WEBHOOK_SECRET');
    },
    get priceId() {
      return required('STRIPE_PRICE_ID');
    },
    get checkoutSuccessUrl() {
      return process.env.STRIPE_CHECKOUT_SUCCESS_URL || `${config.frontendUrl}/profile?checkout=success`;
    },
    get checkoutCancelUrl() {
      return process.env.STRIPE_CHECKOUT_CANCEL_URL || `${config.frontendUrl}/profile?checkout=cancel`;
    },
  },
  aiClassifier: {
    // The ai-classifier microservice (see ../ai-classifier) —
    // a separate process, run and deployed independently of this backend.
    url: process.env.AI_CLASSIFIER_URL || 'http://localhost:4100',
    timeoutMs: Number(process.env.AI_CLASSIFIER_TIMEOUT_MS) || 5000,
  },
};
