import { useState } from 'react'
import { useSessions } from '@/hooks/useSessions'
import { useGames } from '@/hooks/useGames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'

export function Sessions() {
  const [filter, setFilter] = useState({
    winnersOnly: false,
    gameId: '',
    search: '',
    page: 1,
    limit: 10,
  })

  const { games, isLoading: gamesLoading } = useGames()
  const {
    sessions,
    total,
    totalPages,
    isLoading,
    markPaid,
    isMarkingPaid,
    clearSessions,
    isClearing,
  } = useSessions({
    ...filter,
    gameId: filter.gameId || undefined,
  })

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFilter((prev) => ({ ...prev, page: 1 }))
  }

  const handleClearSessions = () => {
    clearSessions(filter.gameId || undefined)
  }

  // Group sessions by game
  const sessionsByGame = sessions.reduce(
    (acc, session) => {
      const gameId = session.game?._id || 'unknown'
      const gameName = session.game?.name || 'Unknown Game'
      if (!acc[gameId]) {
        acc[gameId] = { gameName, sessions: [] }
      }
      acc[gameId].sessions.push(session)
      return acc
    },
    {} as Record<string, { gameName: string; sessions: typeof sessions }>
  )

  if (isLoading || gamesLoading) {
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
            <div className="flex flex-wrap gap-2">
              <Select
                value={filter.gameId}
                onValueChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    gameId: value === 'all' ? '' : value,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  {games.map((game) => (
                    <SelectItem key={game._id} value={game._id}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isClearing || sessions.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Sessions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {filter.gameId
                        ? `This will delete all sessions for "${games.find((g) => g._id === filter.gameId)?.name}". This action cannot be undone.`
                        : 'This will delete ALL sessions across all games. This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearSessions}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sessions found
            </p>
          ) : filter.gameId ? (
            // Single game view - flat table
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
                        {session.player?.displayName || '-'}
                      </TableCell>
                      <TableCell>{session.game?.name || '-'}</TableCell>
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
          ) : (
            // All games view - grouped by game
            <div className="space-y-6">
              {Object.entries(sessionsByGame).map(
                ([gameId, { gameName, sessions: gameSessions }]) => (
                  <div key={gameId} className="rounded-lg border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{gameName}</h3>
                      <Badge variant="outline">
                        {gameSessions.length} sessions
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Reward</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gameSessions.map((session) => (
                          <TableRow key={session._id}>
                            <TableCell className="font-medium">
                              {session.player?.displayName || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  session.isCorrect ? 'success' : 'secondary'
                                }
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
                  </div>
                )
              )}

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
