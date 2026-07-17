import { DataTypes } from 'sequelize';
import { sequelize } from '../src/db/sequelize';

// Adds ci_runs.ai_suggestion — the "how to approach it" text that came
// alongside ai_category/ai_summary once ai-classifier.ts started calling
// the real ai-classifier microservice instead of returning a mock.
// Safe to re-run: skips if the column already exists.

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
  await addColumnIfMissing('ci_runs', 'ai_suggestion', { type: DataTypes.TEXT, allowNull: true });
  console.log('migration complete');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
