export type TestStatus = 'passed' | 'failed' | 'skipped';

export interface ParsedTestCase {
  suite: string;
  classname: string;
  name: string;
  test_key: string;
  status: TestStatus;
  duration: number;
  message: string | null;
}

export interface RunRow {
  test_key: string;
  suite: string;
  name: string;
  status: TestStatus;
  created_at: string;
}

export interface IngestResultsInput {
  commit_sha: string;
  branch?: string | null;
  ci_run_id?: string | null;
}

export interface FlakyTestResult {
  test_key: string;
  suite: string;
  name: string;
  total_runs: number;
  passed: number;
  failed: number;
  flakiness_score: number;
}
