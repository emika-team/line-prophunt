import { useDashboard } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Gamepad2, Trophy, BarChart3 } from 'lucide-react'

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { stats, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">Error loading dashboard</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Game Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Game Statistics</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Total Players"
            value={stats?.game.totalPlayers ?? 0}
            icon={Users}
          />
          <StatsCard
            title="Total Sessions"
            value={stats?.game.totalSessions ?? 0}
            icon={Gamepad2}
          />
          <StatsCard
            title="Total Winners"
            value={stats?.game.totalWinners ?? 0}
            icon={Trophy}
          />
          <StatsCard
            title="Win Rate"
            value={`${(stats?.game.winRate ?? 0).toFixed(1)}%`}
            icon={BarChart3}
          />
        </div>
      </div>
    </div>
  )
}
