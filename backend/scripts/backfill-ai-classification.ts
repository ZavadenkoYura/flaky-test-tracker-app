import 'dotenv/config';
import { sequelize } from '../src/db/sequelize';
import { CiRun } from '../src/models/ci-runs';
import { classifyFailure } from '../src/services/ai-classifier';

// One-off backfill for rows ingested before ai-classifier.ts called the real
// ai-classifier microservice (or before ai_suggestion existed at all).
// maybeClassifyFailures only ever runs once, right at ingestion — it never
// retroactively classifies old rows, so without this they'd show "Pending…"
// forever on the dashboard.
async function main() {
  await sequelize.authenticate();

  const rows = await CiRun.findAll({
    where: { status: 'failed', ai_category: null },
  });

  console.log(`${rows.length} failed row(s) missing AI classification`);

  for (const row of rows) {
    const { category, summary, suggestion } = await classifyFailure({
      name: row.name,
      suite: row.suite,
      message: row.message,
    });
    await row.update({ ai_category: category, ai_summary: summary, ai_suggestion: suggestion });
    console.log(`  [${row.id}] ${row.suite} :: ${row.name} -> ${category}`);
  }

  console.log('backfill complete');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
