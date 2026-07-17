import { parseJUnitXml } from './parser';
import { CiRun } from '../models/ci-runs';
import type { IngestResultsInput, FlakyTestResult } from '../types/ci-runs';

export async function ingestResults(repo: string, meta: IngestResultsInput, xmlString: string): Promise<number> {
  const testcases = parseJUnitXml(xmlString);
  if (testcases.length === 0) {
    throw new Error('no <testcase> entries found in the uploaded XML');
  }

  await CiRun.bulkCreate(
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

  return testcases.length;
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
    attributes: ['test_key', 'suite', 'name', 'status'],
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
    results.push({
      test_key: testKey,
      suite: testRuns[0].suite,
      name: testRuns[0].name,
      total_runs: total,
      passed,
      failed,
      flakiness_score: Number(score.toFixed(3)),
    });
  }

  return results.sort((a, b) => b.flakiness_score - a.flakiness_score);
}
