import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { config } from './config';
import { passport } from './auth/passport';
import { sessionStore } from './auth/session-store';
import { ciRunsRouter } from './routes/ci-runs';
import { authRouter } from './routes/auth';
import { tokensRouter } from './routes/tokens';
import { billingRouter, billingWebhookRouter } from './routes/billing';

export const app = express();
const PORT = config.port;
const PREFIX = '/api/v1';

app.use(cors({ origin: config.frontendUrl, credentials: true }));

// Stripe's webhook needs the raw request body to verify its signature, so it
// must be mounted before the app-wide express.json() body parser below.
// It doesn't need session/passport (Stripe calls it directly, not the browser).
app.use(PREFIX, billingWebhookRouter);

app.use(express.json());
app.use(
  session({
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(PREFIX, ciRunsRouter);
app.use(PREFIX, authRouter);
app.use(PREFIX, tokensRouter);
app.use(PREFIX, billingRouter);

sessionStore.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`flaky-test-tracker listening on :${PORT}`);
  });
});
