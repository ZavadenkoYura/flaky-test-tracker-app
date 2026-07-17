import { Router, type Request, type Response } from 'express';
import express from 'express';
import { ensureAuthenticated } from '../auth/middleware';
import { createCheckoutSession, createBillingPortalSession, constructWebhookEvent, applySubscriptionEvent } from '../services/billing';
import { User } from '../models/user';

export const billingRouter = Router();
export const billingWebhookRouter = Router();

billingRouter.post('/billing/checkout', ensureAuthenticated, async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }

  try {
    const url = await createCheckoutSession(user);
    res.json({ url });
  } catch (err) {
    res.status(502).json({ error: `failed to create checkout session: ${(err as Error).message}` });
  }
});

billingRouter.post('/billing/portal', ensureAuthenticated, async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }

  try {
    const url = await createBillingPortalSession(user);
    res.json({ url });
  } catch (err) {
    res.status(502).json({ error: `failed to create billing portal session: ${(err as Error).message}` });
  }
});

// Stripe posts here directly (no session auth) and requires the raw request
// body to verify the signature — mounted on its own router, ahead of the
// app-wide express.json() middleware, in server.ts.
billingWebhookRouter.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    res.status(400).json({ error: 'missing stripe-signature header' });
    return;
  }

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, signature);
  } catch (err) {
    res.status(400).json({ error: `webhook signature verification failed: ${(err as Error).message}` });
    return;
  }

  try {
    await applySubscriptionEvent(event);
  } catch (err) {
    res.status(500).json({ error: `failed to process webhook event: ${(err as Error).message}` });
    return;
  }

  res.status(200).json({ received: true });
});
