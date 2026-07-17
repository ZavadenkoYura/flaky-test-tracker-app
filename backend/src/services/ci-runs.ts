import { parseJUnitXml } from './parser';
import { classifyFailure } from './ai-classifier';
import { CiRun } from '../models/ci-runs';
import { User } from '../models/user';
import type { IngestResultsInput, FlakyTestResult } from '../types/ci-runs';

export async function ingestResults(repo: string, meta: IngestResultsInput, xmlString: string, userId: number): Promise<number> {
  const testcases = parseJUnitXml(xmlString);
  if (testcases.length === 0) {
    throw new Error('no <testcase> entries found in the uploaded XML');
  }

  const created = await CiRun.bulkCreate(
    testcases.map((row) => ({
      repo,
      commit_sha: meta.commit_sha,
      branch: meta.branch ?? null,
      ci_run_id: meta.ci_run_id ?? null,
      test_key: row.test_key,
      suite: row.suite,
      name: row.name,
      status: row.status,
      duration: row.duration,
      message: row.message,
    }))
  );

  await maybeClassifyFailures(userId, created);

  return testcases.length;
}

// AI classification is a Pro-plan perk. It's kicked off here without being
// awaited by the caller so a slow/unavailable local LLM never delays or
// fails CI's response — a known tradeoff at this project's scale (no queue,
// so an in-flight classification is lost if the process restarts).
async function maybeClassifyFailures(userId: number, rows: CiRun[]): Promise<void> {
  const user = await User.findByPk(userId);
  if (!user || user.plan !== 'pro') return;

  const failed = rows.filter((row) => row.status === 'failed');
  for (const row of failed) {
    classifyFailure({ name: row.name, suite: row.suite, message: row.message })
      .then(({ category, summary, suggestion }) =>
        row.update({ ai_category: category, ai_summary: summary, ai_suggestion: suggestion })
      )
      .catch(() => {
        // classifyFailure already falls back internally; a rejection here
        // would only come from the DB update itself, which we simply drop.
      });
  }
}

// Naive flakiness heuristic: within the last N runs of a given test on a
// given repo, a test is "flaky" if it shows both passes and failures.
// Score = min(pass_count, fail_count) / total_count, so a test that's
// consistently failing (regression) or consistently passing scores 0,
// while one that alternates scores closer to 0.5.
export async function getFlakyTests(repo: string, windowSize = 30): Promise<FlakyTestResult[]> {
  const runs = await CiRun.findAll({
    where: { repo },
    order: [['createdAt', 'DESC']],
    attributes: ['test_key', 'suite', 'name', 'status', 'ai_category', 'ai_summary', 'ai_suggestion'],
  });

  const byTest = new Map<string, CiRun[]>();
  for (const run of runs) {
    if (!byTest.has(run.test_key)) byTest.set(run.test_key, []);
    const list = byTest.get(run.test_key)!;
    if (list.length < windowSize) list.push(run);
  }

  const results: FlakyTestResult[] = [];
  for (const [testKey, testRuns] of byTest) {
    const total = testRuns.length;
    const passed = testRuns.filter((r) => r.status === 'passed').length;
    const failed = testRuns.filter((r) => r.status === 'failed').length;
    if (total < 3 || failed === 0) continue; // need signal, and no point flagging pure-fail or pure-pass tests

    const score = Math.min(passed, failed) / total;
    // testRuns is newest-first, so the first failed row is the most recent failure.
    const latestFailure = testRuns.find((r) => r.status === 'failed');
    results.push({
      test_key: testKey,
      suite: testRuns[0].suite,
      name: testRuns[0].name,
      total_runs: total,
      passed,
      failed,
      flakiness_score: Number(score.toFixed(3)),
      ai_category: (latestFailure?.ai_category as FlakyTestResult['ai_category']) ?? null,
      ai_summary: latestFailure?.ai_summary ?? null,
      ai_suggestion: latestFailure?.ai_suggestion ?? null,
    });
  }

  return results.sort((a, b) => b.flakiness_score - a.flakiness_score);
}
