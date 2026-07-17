export interface GithubRepo {
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
  pushed_at: string;
  ci: {
    hasWorkflows: boolean;
    workflowCount: number;
  };
}

export interface PaginatedRepos {
  repos: GithubRepo[];
  page: number;
  perPage: number;
  totalPages: number;
}
