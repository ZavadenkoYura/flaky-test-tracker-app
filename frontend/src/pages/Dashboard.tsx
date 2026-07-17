import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Bug, Gauge, ListChecks, Sparkles, SearchCode } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SeverityBadge } from '@/components/severity-badge'
import { AppHeader } from '@/components/app-header'
import { useAuth } from '@/queries/auth'
import { useRepos } from '@/queries/repos'
import { useFlakyTests } from '@/queries/flaky-tests'
import type { AiCategory, FlakyTestResult } from '@/types/api'

const AI_CATEGORY_LABELS: Record<AiCategory, string> = {
  timing: 'Timing',
  network: 'Network',
  assertion: 'Assertion',
  environment: 'Environment',
  unknown: 'Unknown',
}

function AiAnalysisCell({ result }: { result: FlakyTestResult }) {
  if (!result.ai_category) {
    // Pro plan but classification hasn't landed yet — it runs async after ingestion.
    return <span className="text-muted-foreground text-xs">Pending…</span>
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent -mx-2 -my-1 flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors"
        >
          <Badge variant="outline">{AI_CATEGORY_LABELS[result.ai_category]}</Badge>
          <span className="text-muted-foreground text-xs underline-offset-2 hover:underline">Details</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-muted-foreground size-4 shrink-0" />
            {result.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <Badge variant="outline">{AI_CATEGORY_LABELS[result.ai_category]}</Badge>
            <span className="text-muted-foreground text-xs">{result.suite}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {result.ai_summary && (
            <div>
              <h3 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                Summary
              </h3>
              <p>{result.ai_summary}</p>
            </div>
          )}
          {result.ai_suggestion && (
            <div>
              <h3 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                Suggestion
              </h3>
              <p>{result.ai_suggestion}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Bug
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-1 text-2xl font-semibold tabular-nums">{value}</CardTitle>
        </div>
        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" />
        </span>
      </CardHeader>
    </Card>
  )
}

export function Dashboard() {
  const { auth } = useAuth()
  const isAuthenticated = auth.status === 'authenticated'

  const [repo, setRepo] = useState('')
  const [windowSize, setWindowSize] = useState(30)

  const reposQuery = useRepos('ci', 1, 100, { enabled: isAuthenticated })
  const flakyQuery = useFlakyTests(repo, windowSize)

  if (auth.status === 'checking') {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (auth.status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  const ciRepos = reposQuery.data?.repos ?? []
  const results = repo ? (flakyQuery.data ?? []) : []
  const totalFlaky = results.length
  const avgScore =
    totalFlaky > 0 ? results.reduce((sum, r) => sum + r.flakiness_score, 0) / totalFlaky : 0
  const totalRuns = results.reduce((sum, r) => sum + r.total_runs, 0)

  return (
    <div className="bg-background min-h-screen">
      <AppHeader user={auth.user} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Look up the flakiest tests for a repo, ranked by flakiness score.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="repo"
                className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide"
              >
                <SearchCode className="size-3.5" />
                Repository
              </Label>
              <Select
                value={repo}
                onValueChange={setRepo}
                disabled={reposQuery.isLoading || ciRepos.length === 0}
              >
                <SelectTrigger id="repo" className="w-64">
                  <SelectValue
                    placeholder={
                      reposQuery.isLoading
                        ? 'Loading repos…'
                        : reposQuery.isError
                          ? 'Failed to load repos'
                          : ciRepos.length === 0
                            ? 'No CI-configured repos found'
                            : 'Select a repo'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {ciRepos.map((r) => (
                    <SelectItem key={r.full_name} value={r.full_name}>
                      {r.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="window" className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Window (runs)
              </Label>
              <Input
                id="window"
                type="number"
                min={1}
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value) || 30)}
                className="w-28"
              />
            </div>
          </CardContent>
        </Card>

        {reposQuery.isError && (
          <Card className="border-destructive/50 mb-8">
            <CardContent className="text-destructive text-sm">
              Couldn't load your GitHub repos: {(reposQuery.error as Error).message}
            </CardContent>
          </Card>
        )}

        {flakyQuery.isError && (
          <Card className="border-destructive/50 mb-8">
            <CardContent className="text-destructive text-sm">{(flakyQuery.error as Error).message}</CardContent>
          </Card>
        )}

        {repo && flakyQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {repo && flakyQuery.isSuccess && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Flaky tests" value={String(totalFlaky)} icon={Bug} />
              <StatCard label="Avg. flakiness score" value={avgScore.toFixed(3)} icon={Gauge} />
              <StatCard label="Runs analyzed" value={String(totalRuns)} icon={ListChecks} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Flaky tests in {repo}</CardTitle>
                <CardDescription>
                  Sorted by flakiness score — tests that alternate pass/fail score highest.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No flaky tests found for this repo (or not enough run history yet).
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test</TableHead>
                        <TableHead>Suite</TableHead>
                        <TableHead className="text-right">Runs</TableHead>
                        <TableHead className="text-right">Passed</TableHead>
                        <TableHead className="text-right">Failed</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>AI Analysis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => (
                        <TableRow key={r.test_key}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.suite}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.total_runs}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.passed}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.failed}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.flakiness_score.toFixed(3)}
                          </TableCell>
                          <TableCell>
                            <SeverityBadge score={r.flakiness_score} />
                          </TableCell>
                          <TableCell>
                            {auth.user.plan === 'pro' ? (
                              <AiAnalysisCell result={r} />
                            ) : (
                              <Link to="/home/profile" className="text-primary text-xs hover:underline">
                                Upgrade to Pro for AI analysis
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!repo && (
          <p className="text-muted-foreground text-sm">
            Pick one of your repos above to see its flakiest tests.
          </p>
        )}
      </div>
    </div>
  )
}
