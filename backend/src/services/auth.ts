import type { GithubRepo, PaginatedRepos } from '../types/auth';

function githubHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'flaky-test-tracker',
  };
}

// GitHub Actions is the only CI/CD system we can detect without asking the
// user to configure anything else — a repo with configured workflows almost
// certainly has *some* pipeline, but the reverse isn't proof of the absence
// of CI (e.g. CircleCI/Travis configured purely via a committed YAML file
// wouldn't show up here). Good enough as a "does this repo look wired up"
// signal, not a guarantee.
async function getWorkflowCount(accessToken: string, fullName: string): Promise<number> {
  const res = await fetch(`https://api.github.com/repos/${fullName}/actions/workflows`, {
    headers: githubHeaders(accessToken),
  });

  if (!res.ok) return 0;
  const body = (await res.json()) as { total_count?: number };
  return body.total_count ?? 0;
}

// GitHub's Link header carries a rel="last" entry with the final page number
// regardless of which page you're currently on — that's the only reliable
// way to know the total page count since the list endpoint has no total-count
// field in its body.
function parseLastPage(linkHeader: string | null): number | null {
  if (!linkHeader) return null;
  const lastLink = linkHeader.split(',').find((part) => part.includes('rel="last"'));
  if (!lastLink) return null;

  const urlMatch = lastLink.match(/<([^>]+)>/);
  if (!urlMatch) return null;

  const page = new URL(urlMatch[1]).searchParams.get('page');
  return page ? parseInt(page, 10) : null;
}

async function mapRepo(accessToken: string, repo: Record<string, unknown>): Promise<GithubRepo> {
  const full_name = repo.full_name as string;
  const workflowCount = await getWorkflowCount(accessToken, full_name).catch(() => 0);

  return {
    full_name,
    name: repo.name as string,
    description: (repo.description as string | null) ?? null,
    private: repo.private as boolean,
    html_url: repo.html_url as string,
    updated_at: repo.updated_at as string,
    pushed_at: repo.pushed_at as string,
    ci: {
      hasWorkflows: workflowCount > 0,
      workflowCount,
    },
  };
}

// Repos the authenticated GitHub user can access, most recently updated
// first, paginated server-side so the caller only pays the per-repo
// workflow-lookup cost for the page actually being viewed. Used by the
// "all repos" view, where every repo is shown regardless of CI status.
export async function getUserRepos(accessToken: string, page = 1, perPage = 10): Promise<PaginatedRepos> {
  const res = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated`, {
    headers: githubHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`GitHub API request failed with status ${res.status}`);
  }

  const totalPages = parseLastPage(res.headers.get('link')) ?? page;
  const repos = (await res.json()) as Array<Record<string, unknown>>;

  const mapped = await Promise.all(repos.map((repo) => mapRepo(accessToken, repo)));

  return { repos: mapped, page, perPage, totalPages };
}

// Cap on how many of the user's most-recently-updated repos we scan when
// building the CI-only list — each repo costs one extra GitHub API call to
// check its workflow count, so scanning an account's entire repo history
// isn't worth it just to populate a repo picker. Recommend replacing this
// with a cached/background-refreshed scan if usage grows.
const CI_SCAN_LIMIT = 200;
const GITHUB_PAGE_SIZE = 100;

async function fetchRecentRepos(accessToken: string, limit: number): Promise<Array<Record<string, unknown>>> {
  const collected: Array<Record<string, unknown>> = [];
  let page = 1;

  while (collected.length < limit) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=${GITHUB_PAGE_SIZE}&page=${page}&sort=updated`,
      { headers: githubHeaders(accessToken) }
    );

    if (!res.ok) {
      throw new Error(`GitHub API request failed with status ${res.status}`);
    }

    const batch = (await res.json()) as Array<Record<string, unknown>>;
    collected.push(...batch);
    if (batch.length < GITHUB_PAGE_SIZE) break; // no further pages
    page += 1;
  }

  return collected.slice(0, limit);
}

// Repos that look CI-configured (GitHub Actions workflows detected), paginated
// over the *filtered* set so page/totalPages reflect only CI-configured repos.
// This is what repo-picker dropdowns should use — picking a repo with no CI
// wired up has nothing for the dashboard to show.
export async function getUserCiRepos(accessToken: string, page = 1, perPage = 10): Promise<PaginatedRepos> {
  const recent = await fetchRecentRepos(accessToken, CI_SCAN_LIMIT);
  const mapped = await Promise.all(recent.map((repo) => mapRepo(accessToken, repo)));
  const ciRepos = mapped.filter((repo) => repo.ci.hasWorkflows);

  const totalPages = Math.max(1, Math.ceil(ciRepos.length / perPage));
  const start = (page - 1) * perPage;
  const repos = ciRepos.slice(start, start + perPage);

  return { repos, page, perPage, totalPages };
}
