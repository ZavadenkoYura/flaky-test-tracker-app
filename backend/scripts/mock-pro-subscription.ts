import 'dotenv/config';
import Stripe from 'stripe';
import { config } from '../src/config';
import { sequelize } from '../src/db/sequelize';
import '../src/models/user';
import { User } from '../src/models/user';

// Simulates a completed Pro checkout for the given user WITHOUT driving the
// hosted Checkout UI: creates (or reuses) their Stripe customer, attaches a
// Stripe test payment method, and creates a real subscription via the API.
// Since `stripe listen` is already forwarding webhooks to the running local
// server, this fires a genuine signed `customer.subscription.created` event
// through the real webhook endpoint — exercising the actual production code
// path, not just a direct DB write.

const stripe = new Stripe(config.stripe.secretKey);

async function main() {
  const userId = Number(process.argv[2] ?? 1);
  await sequelize.authenticate();

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error(`no user with id ${userId}`);
  }

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: user.display_name,
      metadata: { user_id: String(user.id) },
    });
    customerId = customer.id;
    user.stripe_customer_id = customerId;
    await user.save();
  }
  console.log('stripe customer:', customerId);

  // pm_card_visa is one of Stripe's documented test payment method tokens —
  // usable directly via the API in test mode, no hosted UI needed.
  const paymentMethod = await stripe.paymentMethods.attach('pm_card_visa', { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: config.stripe.priceId }],
  });
  console.log('subscription created:', subscription.id, subscription.status);

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
