import { Badge } from '@/components/ui/badge'

export function severityLabel(score: number): { label: string; variant: 'destructive' | 'warning' | 'secondary' } {
  if (score >= 0.35) return { label: 'High', variant: 'destructive' }
  if (score >= 0.15) return { label: 'Medium', variant: 'warning' }
  return { label: 'Low', variant: 'secondary' }
}

export function SeverityBadge({ score }: { score: number }) {
  const { label, variant } = severityLabel(score)
  return <Badge variant={variant}>{label}</Badge>
}
