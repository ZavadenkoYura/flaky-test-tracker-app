import { XMLParser } from 'fast-xml-parser';
import type { ParsedTestCase, TestStatus } from '../types/ci-runs';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function firstMessage(node: any): string | null {
  if (!node) return null;
  const failureOrError = node.failure || node.error;
  if (!failureOrError) return null;
  const entry = Array.isArray(failureOrError) ? failureOrError[0] : failureOrError;
  if (typeof entry === 'string') return entry;
  return entry['@_message'] || entry['#text'] || null;
}

function statusOf(testcase: any): TestStatus {
  if (testcase.failure) return 'failed';
  if (testcase.error) return 'failed';
  if (testcase.skipped) return 'skipped';
  return 'passed';
}

// Handles JUnit XML from both jest-junit and pytest --junitxml.
// Root may be <testsuites> wrapping one or more <testsuite>, or a bare
// <testsuite> (pytest emits this when there's only one suite).
export function parseJUnitXml(xmlString: string): ParsedTestCase[] {
  const doc = xmlParser.parse(xmlString);
  const root = doc.testsuites || doc.testsuite;
  if (!root) {
    throw new Error('Not a recognizable JUnit XML document (no <testsuites> or <testsuite> root)');
  }

  const suites = doc.testsuites ? toArray(root.testsuite) : toArray(root);

  const testcases: ParsedTestCase[] = [];
  for (const suite of suites) {
    const suiteName = suite['@_name'] || 'unknown-suite';
    for (const testcase of toArray(suite.testcase)) {
      const name = testcase['@_name'] || 'unnamed-test';
      const classname = testcase['@_classname'] || suiteName;
      testcases.push({
        suite: suiteName,
        classname,
        name,
        // stable identity for the same test across runs, independent of
        // minor formatting differences between test runners
        test_key: `${classname}::${name}`,
        status: statusOf(testcase),
        duration: parseFloat(testcase['@_time'] || '0'),
        message: firstMessage(testcase),
      });
    }
  }

  return testcases;
}
