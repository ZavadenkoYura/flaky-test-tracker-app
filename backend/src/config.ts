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
};
