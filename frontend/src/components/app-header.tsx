import { Activity, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CurrentUser } from '@/types/api'

const NAV_ITEMS = [
  { to: '/home/dashboard', label: 'Dashboard' },
  { to: '/home/profile', label: 'Profile' },
]

export function AppHeader({ user }: { user: CurrentUser }) {
  const location = useLocation()

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/home/dashboard" className="flex items-center gap-2.5">
            <span className="from-primary flex size-8 items-center justify-center rounded-lg bg-linear-to-br to-indigo-400 text-white shadow-sm">
              <Activity className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="text-base font-semibold tracking-tight">Flaky Test Tracker</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <Link
          to="/home/profile"
          className="hover:bg-accent flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors"
        >
          {user.plan === 'pro' && (
            <Badge variant="success" className="hidden gap-1 sm:inline-flex">
              <Sparkles className="size-3" />
              Pro
            </Badge>
          )}
          <Avatar className="ring-border size-8 ring-1">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
            <AvatarFallback className="text-xs">{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-foreground hidden text-sm font-medium sm:inline">{user.displayName}</span>
        </Link>
      </div>
    </header>
  )
}
