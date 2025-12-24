import { useState } from 'react'
import { useSessions } from '@/hooks/useSessions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

export function Sessions() {
  const [filter, setFilter] = useState({
    winnersOnly: false,
    search: '',
    page: 1,
    limit: 10,
  })

  const { sessions, total, totalPages, isLoading, markPaid, isMarkingPaid } =
    useSessions(filter)

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFilter((prev) => ({ ...prev, page: 1 }))
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Game Sessions</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Sessions</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter.winnersOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setFilter((prev) => ({
                    ...prev,
                    winnersOnly: !prev.winnersOnly,
                    page: 1,
                  }))
                }
              >
                Winners Only
              </Button>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search player..."
                  value={filter.search}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="w-40"
                />
                <Button type="submit" size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sessions found
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell className="font-medium">
                        {session.player.displayName}
                      </TableCell>
                      <TableCell>{session.game.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={session.isCorrect ? 'success' : 'secondary'}
                        >
                          {session.isCorrect ? 'Win' : 'Lose'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {session.isCorrect ? (
                          session.rewardStatus === 'paid' ? (
                            <Badge variant="success">Paid</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPaid(session._id)}
                              disabled={isMarkingPaid}
                            >
                              Mark Paid
                            </Button>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(session.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(filter.page - 1) * filter.limit + 1}-
                  {Math.min(filter.page * filter.limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFilter((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={filter.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-2 text-sm">
                    {filter.page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setFilter((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={filter.page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
