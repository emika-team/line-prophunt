import { useSurvey } from '@/hooks/useSurvey'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Star, MessageSquare, TrendingUp } from 'lucide-react'

function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  subtitle?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ScoreBar({ score, count, maxCount }: { score: number; count: number; maxCount: number }) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
  const colors = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-lime-500',
    5: 'bg-green-500',
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 w-16">
        <span className="text-sm font-medium">{score}</span>
        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
      </div>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[score as keyof typeof colors]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
    </div>
  )
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export function Survey() {
  const { stats, isStatsLoading, responses, isResponsesLoading } = useSurvey()

  const maxCount = stats?.scoreDistribution
    ? Math.max(...stats.scoreDistribution.map((d) => d.count), 1)
    : 1

  // Create full distribution (1-5) even if some scores have 0 count
  const fullDistribution = [1, 2, 3, 4, 5].map((score) => {
    const found = stats?.scoreDistribution?.find((d) => d.score === score)
    return { score, count: found?.count ?? 0 }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Survey</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Responses"
          value={isStatsLoading ? '...' : stats?.totalResponses ?? 0}
          icon={MessageSquare}
        />
        <StatsCard
          title="Average Score"
          value={isStatsLoading ? '...' : (stats?.averageScore ?? 0).toFixed(1)}
          icon={TrendingUp}
          subtitle="out of 5.0"
        />
        <StatsCard
          title="Rating"
          value={
            isStatsLoading
              ? '...'
              : stats?.averageScore
              ? stats.averageScore >= 4
                ? 'Excellent'
                : stats.averageScore >= 3
                ? 'Good'
                : 'Needs Improvement'
              : 'No data'
          }
          icon={Star}
        />
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isStatsLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            fullDistribution.map(({ score, count }) => (
              <ScoreBar
                key={score}
                score={score}
                count={count}
                maxCount={maxCount}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Responses</CardTitle>
        </CardHeader>
        <CardContent>
          {isResponsesLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : responses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No survey responses yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.slice(0, 20).map((response) => (
                  <TableRow key={response._id}>
                    <TableCell className="font-medium">
                      {response.displayName || response.customerId}
                    </TableCell>
                    <TableCell>
                      <ScoreStars score={response.score} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(response.createdAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
