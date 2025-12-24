import { useDashboard } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Gamepad2, Trophy } from 'lucide-react'

function StatsCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string
  value: number
  change: number
  icon: React.ElementType
}) {
  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p
          className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
          {isPositive ? '+' : ''}
          {change}% from last period
        </p>
      </CardContent>
    </Card>
  )
}

function RecentWinnersList({
  winners,
}: {
  winners: { _id: string; playerName: string; gameName: string; createdAt: string }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Winners</CardTitle>
      </CardHeader>
      <CardContent>
        {winners.length === 0 ? (
          <p className="text-muted-foreground text-sm">No winners yet</p>
        ) : (
          <div className="space-y-4">
            {winners.map((winner) => (
              <div key={winner._id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{winner.playerName}</p>
                  <p className="text-xs text-muted-foreground">{winner.gameName}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(winner.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { stats, recentWinners, isLoading } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Players"
          value={stats?.players.total ?? 0}
          change={stats?.players.change ?? 0}
          icon={Users}
        />
        <StatsCard
          title="Sessions"
          value={stats?.sessions.total ?? 0}
          change={stats?.sessions.change ?? 0}
          icon={Gamepad2}
        />
        <StatsCard
          title="Winners"
          value={stats?.winners.total ?? 0}
          change={stats?.winners.change ?? 0}
          icon={Trophy}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessions (Last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Chart will be implemented with Recharts
            </p>
          </CardContent>
        </Card>

        <RecentWinnersList winners={recentWinners} />
      </div>
    </div>
  )
}
