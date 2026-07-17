import { useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  GitBranch,
  KeyRound,
  LogOut,
  Lock,
  Sparkles,
  Trash2,
  Workflow,
} from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GithubIcon } from '@/components/github-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppHeader } from '@/components/app-header'
import { useAuth } from '@/queries/auth'
import { useRepos } from '@/queries/repos'
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '@/queries/tokens'
import { useCreateBillingPortalSession, useCreateCheckoutSession } from '@/queries/billing'
import type { GithubRepo, IssuedApiToken, Plan } from '@/types/api'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            {repo.full_name}
            <ExternalLink className="size-3.5" />
          </a>
          <div className="flex flex-wrap gap-1.5">
            {repo.private && (
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3" />
                Private
              </Badge>
            )}
            {repo.ci.hasWorkflows ? (
              <Badge variant="success" className="gap-1">
                <Workflow className="size-3" />
                CI configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Workflow className="size-3" />
                No CI detected
              </Badge>
            )}
          </div>
        </div>

        {repo.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{repo.description}</p>
        )}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            Pushed {formatDate(repo.pushed_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

const REPOS_PAGE_SIZE = 5

// Fetches its own page from the server as the user navigates — each Prev/
// Next click is a fresh request against the "all repos" scope, independent
// of the CI-only list the token picker below uses.
function ReposTab() {
  const [page, setPage] = useState(1)
  const reposQuery = useRepos('all', page, REPOS_PAGE_SIZE)

  if (reposQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (reposQuery.isError) {
    return <p className="text-destructive text-sm">{(reposQuery.error as Error).message}</p>
  }

  const data = reposQuery.data!

  if (data.repos.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">No repos found.</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.repos.map((r) => (
          <RepoCard key={r.full_name} repo={r} />
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-muted-foreground text-sm">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function TokensTab() {
  const reposQuery = useRepos('ci', 1, 100)
  const tokensQuery = useApiTokens()
  const createToken = useCreateApiToken()
  const revokeToken = useRevokeApiToken()

  const [selectedRepo, setSelectedRepo] = useState('')
  const [tokenName, setTokenName] = useState('')
  const [issued, setIssued] = useState<IssuedApiToken | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    if (!selectedRepo) return
    const token = await createToken.mutateAsync({ repo: selectedRepo, name: tokenName.trim() || undefined })
    setIssued(token)
    setCopied(false)
    setTokenName('')
  }

  async function handleRevoke(id: number) {
    if (!confirm('Revoke this token? Any CI job still using it will start failing to authenticate.')) return
    await revokeToken.mutateAsync(id)
  }

  async function handleCopy() {
    if (!issued) return
    await navigator.clipboard.writeText(issued.token)
    setCopied(true)
  }

  const ciRepos = reposQuery.data?.repos ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate a new token</CardTitle>
          <CardDescription>
            Scoped to a single repo — paste it into your CI secrets (e.g.{' '}
            <code className="font-mono">FLAKY_TRACKER_TOKEN</code>) so it can post test results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token-repo">Repository</Label>
              <Select
                value={selectedRepo}
                onValueChange={setSelectedRepo}
                disabled={reposQuery.isLoading || ciRepos.length === 0}
              >
                <SelectTrigger id="token-repo" className="w-56">
                  <SelectValue
                    placeholder={
                      reposQuery.isLoading
                        ? 'Loading repos…'
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
              <Label htmlFor="token-name">Label (optional)</Label>
              <Input
                id="token-name"
                placeholder="e.g. main CI"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={handleGenerate} disabled={!selectedRepo || createToken.isPending}>
              <KeyRound />
              {createToken.isPending ? 'Generating…' : 'Generate token'}
            </Button>
          </div>
          {createToken.isError && (
            <p className="text-destructive mt-3 text-sm">{(createToken.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active tokens</CardTitle>
          <CardDescription>Only the last 4 characters are ever shown again after creation.</CardDescription>
        </CardHeader>
        <CardContent>
          {tokensQuery.isLoading && <Skeleton className="h-24 w-full" />}
          {tokensQuery.isError && (
            <p className="text-destructive text-sm">{(tokensQuery.error as Error).message}</p>
          )}
          {tokensQuery.isSuccess &&
            (tokensQuery.data.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No tokens yet — generate one above to authenticate CI uploads.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repo</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokensQuery.data.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.repo}</TableCell>
                      <TableCell className="text-muted-foreground">{t.name ?? '—'}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">••••{t.lastFour}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.lastUsedAt ? formatDate(t.lastUsedAt) : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRevoke(t.id)}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
        </CardContent>
      </Card>

      <Dialog open={issued !== null} onOpenChange={(open) => !open && setIssued(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token created</DialogTitle>
            <DialogDescription>
              Copy it now — for security, we don't store the raw value and can't show it again.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted flex items-center gap-2 rounded-md border p-2 font-mono text-sm break-all">
            {issued?.token}
          </div>
          <DialogFooter>
            <Button onClick={handleCopy} variant={copied ? 'secondary' : 'default'}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BillingTab({ plan }: { plan: Plan }) {
  const checkout = useCreateCheckoutSession()
  const portal = useCreateBillingPortalSession()

  async function handleUpgrade() {
    const { url } = await checkout.mutateAsync()
    window.location.href = url
  }

  async function handleManage() {
    const { url } = await portal.mutateAsync()
    window.location.href = url
  }

  const redirecting = checkout.isPending || portal.isPending
  const error = (checkout.error ?? portal.error) as Error | null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4" />
          {plan === 'pro' ? 'Pro plan' : 'Free plan'}
        </CardTitle>
        <CardDescription>
          {plan === 'pro'
            ? 'AI failure classification is enabled for your repos. Manage or cancel your subscription below.'
            : 'Upgrade to Pro to get AI-classified failure categories and summaries alongside the flakiness score.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {plan === 'pro' ? (
          <Button onClick={handleManage} disabled={redirecting} variant="outline">
            {redirecting ? 'Redirecting…' : 'Manage subscription'}
          </Button>
        ) : (
          <Button onClick={handleUpgrade} disabled={redirecting}>
            <Sparkles />
            {redirecting ? 'Redirecting…' : 'Upgrade to Pro'}
          </Button>
        )}
        {error && <p className="text-destructive mt-3 text-sm">{error.message}</p>}
      </CardContent>
    </Card>
  )
}

export function Profile() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const isAuthenticated = auth.status === 'authenticated'

  const reposQuery = useRepos('all', 1, 100, { enabled: isAuthenticated })

  if (auth.status === 'checking') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (auth.status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  const { user } = auth

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const repoCount = reposQuery.data?.repos.length ?? null

  return (
    <div className="bg-background min-h-screen">
      <AppHeader user={user} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Card className="mb-8 gap-0 overflow-hidden py-0">
          <div className="from-primary h-20 bg-linear-to-r to-indigo-500 sm:h-24" />
          <CardContent className="flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
            <div className="flex items-end gap-4">
              <Avatar className="border-card -mt-10 size-20 border-4 shadow-md sm:-mt-12 sm:size-24">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
                <AvatarFallback className="text-xl">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight">{user.displayName}</h1>
                  <Badge variant="secondary" className="gap-1">
                    <GithubIcon className="size-3" />
                    GitHub
                  </Badge>
                  {user.plan === 'pro' && (
                    <Badge variant="success" className="gap-1">
                      <Sparkles className="size-3" />
                      Pro
                    </Badge>
                  )}
                </div>
                <a
                  href={`https://github.com/${user.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground mt-0.5 inline-flex items-center gap-1 text-sm transition-colors"
                >
                  @{user.username}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut />
              Sign out
            </Button>
          </CardContent>
        </Card>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardDescription>Repos accessible</CardDescription>
                <CardTitle className="mt-1 text-2xl font-semibold tabular-nums">{repoCount ?? '—'}</CardTitle>
              </div>
              <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <GitBranch className="size-4.5" />
              </span>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardDescription>Auth method</CardDescription>
                <CardTitle className="mt-1 text-2xl font-semibold">GitHub OAuth</CardTitle>
              </div>
              <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <KeyRound className="size-4.5" />
              </span>
            </CardHeader>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardDescription>Member since</CardDescription>
                <CardTitle className="mt-1 text-2xl font-semibold">{formatDate(user.memberSince)}</CardTitle>
              </div>
              <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Calendar className="size-4.5" />
              </span>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="tokens">
          <TabsList>
            <TabsTrigger value="tokens">CI/CD Tokens</TabsTrigger>
            <TabsTrigger value="repos">Repos</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="tokens" className="pt-4">
            <TokensTab />
          </TabsContent>
          <TabsContent value="repos" className="pt-4">
            <div className="mb-3">
              <h2 className="text-base font-semibold">Repos GitHub granted access to</h2>
              <p className="text-muted-foreground text-sm">
                Used to populate the repo picker on the dashboard. "CI configured" means GitHub
                Actions workflows were found — other CI systems (CircleCI, Travis, Jenkins) aren't
                detected.
              </p>
            </div>
            <ReposTab />
          </TabsContent>
          <TabsContent value="billing" className="pt-4">
            <BillingTab plan={user.plan} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
