import { Navigate } from 'react-router-dom'
import { Activity, GitBranch, ShieldCheck } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { GithubIcon } from '@/components/github-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { githubLoginUrl } from '@/lib/api'
import { useAuth } from '@/queries/auth'

const FEATURES = [
  { icon: Activity, text: 'Flakiness score for every test, ranked worst-first' },
  { icon: GitBranch, text: 'Per-repo history pulled straight from your CI runs' },
  { icon: ShieldCheck, text: 'Read-only access — we never push or modify code' },
]

export function Login() {
  const { auth } = useAuth()

  if (auth.status === 'authenticated') {
    return <Navigate to="/home/dashboard" replace />
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, color-mix(in oklch, var(--color-primary) 12%, transparent), transparent 55%), radial-gradient(circle at 80% 0%, color-mix(in oklch, var(--color-primary) 8%, transparent), transparent 50%)',
        }}
      />

      <div className="flex w-full max-w-4xl flex-col items-stretch gap-10 md:flex-row md:items-center">
        <div className="flex-1 space-y-6 px-2">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            <Activity className="size-3.5" />
            Flaky Test Tracker
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Stop guessing which tests are actually broken.
          </h1>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
            Connect a repo and see exactly which tests flake, how often, and how severe it is —
            ranked from your real CI history, not vibes.
          </p>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm">
                <span className="bg-primary/10 text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-3.5" />
                </span>
                <span className="text-foreground/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <Card className="w-full shrink-0 border shadow-lg md:w-88">
          <CardContent className="flex flex-col items-center gap-6 text-center">
            <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl">
              <Activity className="size-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold">Sign in to continue</h2>
              <p className="text-muted-foreground text-sm">
                Use your GitHub account — we'll pull your repos automatically.
              </p>
            </div>

            {auth.status === 'checking' ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <a
                href={githubLoginUrl}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors"
              >
                <GithubIcon className="size-4" />
                Sign in with GitHub
              </a>
            )}

            <p className="text-muted-foreground text-xs">
              We request read access to your repos to look up test-run history.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
