import 'dotenv/config';

const PORT = Number(process.env.PORT) || 4100;
const BASE_URL = `http://localhost:${PORT}`;

const SAMPLES = [
  {
    name: 'rejects bad password',
    suite: 'AuthTests',
    message: 'connect ECONNREFUSED 127.0.0.1:5432 while waiting for auth service',
  },
  {
    name: 'submits form within 2s',
    suite: 'CheckoutFlow',
    message: 'Timeout of 2000ms exceeded waiting for element to become visible',
  },
  {
    name: 'renders cart total',
    suite: 'CartTests',
    message: 'expected 42.50 to equal 45.00',
  },
  {
    name: 'reads config from disk',
    suite: 'ConfigLoader',
    message: 'ENOENT: no such file or directory, open \'/etc/app/config.yaml\'',
  },
  {
    name: 'flaky legacy test',
    suite: 'LegacySuite',
    message: null,
  },
];

async function main() {
  console.log(`Checking ${BASE_URL}/healthz ...`);
  const health = await fetch(`${BASE_URL}/healthz`);
  if (!health.ok) {
    throw new Error(`health check failed with status ${health.status} — is \`npm run dev\` running?`);
  }
  console.log('  OK\n');

  for (const sample of SAMPLES) {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/v1/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sample),
    });
    const elapsed = Date.now() - start;

    console.log(`"${sample.suite} :: ${sample.name}"`);
    console.log(`  message: ${sample.message ?? '(none)'}`);

    if (!res.ok) {
      console.log(`  FAILED (${res.status}): ${await res.text()}`);
    } else {
      const body = (await res.json()) as {
        category: string;
        confidence: number;
        summary: string;
        suggestion: string;
      };
      console.log(`  -> category: ${body.category} (confidence ${body.confidence}) [${elapsed}ms]`);
      console.log(`     summary: ${body.summary}`);
      console.log(`     suggestion: ${body.suggestion}`);
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
