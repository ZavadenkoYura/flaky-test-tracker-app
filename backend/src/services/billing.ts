import Stripe from 'stripe';
import { config } from '../config';
import { User } from '../models/user';

const stripe = new Stripe(config.stripe.secretKey);

async function createOrGetStripeCustomer(user: User): Promise<string> {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: undefined,
    name: user.display_name,
    metadata: { user_id: String(user.id) },
  });

  user.stripe_customer_id = customer.id;
  await user.save();
  return customer.id;
}

export async function createCheckoutSession(user: User): Promise<string> {
  const customerId = await createOrGetStripeCustomer(user);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: config.stripe.priceId, quantity: 1 }],
    success_url: config.stripe.checkoutSuccessUrl,
    cancel_url: config.stripe.checkoutCancelUrl,
  });

  if (!session.url) {
    throw new Error('stripe did not return a checkout session url');
  }
  return session.url;
}

export async function createBillingPortalSession(user: User): Promise<string> {
  const customerId = await createOrGetStripeCustomer(user);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: config.stripe.checkoutSuccessUrl,
  });

  return session.url;
}

export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

export async function applySubscriptionEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string | null;
      if (!subscriptionId) return;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await activateSubscription(customerId, subscription);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        await activateSubscription(customerId, subscription);
      } else {
        await deactivateSubscription(customerId);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await deactivateSubscription(subscription.customer as string);
      break;
    }
    default:
      break;
  }
}

async function activateSubscription(stripeCustomerId: string, subscription: Stripe.Subscription): Promise<void> {
  const user = await User.findOne({ where: { stripe_customer_id: stripeCustomerId } });
  if (!user) return;

  const periodEndSeconds = subscription.items.data[0]?.current_period_end;
  user.plan = 'pro';
  user.stripe_subscription_id = subscription.id;
  user.plan_renews_at = periodEndSeconds ? new Date(periodEndSeconds * 1000) : null;
  await user.save();
}

async function deactivateSubscription(stripeCustomerId: string): Promise<void> {
  const user = await User.findOne({ where: { stripe_customer_id: stripeCustomerId } });
  if (!user) return;

  user.plan = 'free';
  user.stripe_subscription_id = null;
  user.plan_renews_at = null;
  await user.save();
}
