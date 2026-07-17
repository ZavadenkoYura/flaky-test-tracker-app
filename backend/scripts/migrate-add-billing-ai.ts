import { DataTypes } from 'sequelize';
import { sequelize } from '../src/db/sequelize';

// One-off migration for the Stripe billing + AI classification columns.
// Uses explicit addColumn calls (sqlite supports native ADD COLUMN) rather
// than sequelize.sync({ alter: true }), which can rebuild whole tables under
// sqlite and is riskier against a database that already has real rows.
// Safe to re-run: skips any column that already exists.

async function addColumnIfMissing(table: string, column: string, definition: Parameters<typeof qi.addColumn>[2]) {
  const existing = await qi.describeTable(table);
  if (column in existing) {
    console.log(`skip ${table}.${column} (already exists)`);
    return;
  }
  await qi.addColumn(table, column, definition);
  console.log(`added ${table}.${column}`);
}

const qi = sequelize.getQueryInterface();

async function main() {
  await sequelize.authenticate();

  await addColumnIfMissing('users', 'plan', {
    type: DataTypes.ENUM('free', 'pro'),
    allowNull: false,
    defaultValue: 'free',
  });
  // sqlite's ALTER TABLE ADD COLUMN can't carry a UNIQUE constraint directly —
  // add the plain column, then a separate unique index (equivalent result).
  await addColumnIfMissing('users', 'stripe_customer_id', { type: DataTypes.TEXT, allowNull: true });
  const existingIndexes = (await qi.showIndex('users')) as Array<{ name: string }>;
  if (!existingIndexes.some((i) => i.name === 'users_stripe_customer_id_unique')) {
    await qi.addIndex('users', ['stripe_customer_id'], { unique: true, name: 'users_stripe_customer_id_unique' });
    console.log('added unique index users_stripe_customer_id_unique');
  } else {
    console.log('skip users_stripe_customer_id_unique (already exists)');
  }
  await addColumnIfMissing('users', 'stripe_subscription_id', { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing('users', 'plan_renews_at', { type: DataTypes.DATE, allowNull: true });

  await addColumnIfMissing('ci_runs', 'ai_category', { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing('ci_runs', 'ai_summary', { type: DataTypes.TEXT, allowNull: true });

  console.log('migration complete');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
