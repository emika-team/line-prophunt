import { useState } from 'react'
import { useGames } from '@/hooks/useGames'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Game, CreateGameDto } from '@/api/games'

function GameCard({
  game,
  onEdit,
  onDelete,
}: {
  game: Game
  onEdit: (game: Game) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader className="p-0">
        <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
          {game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{game.name}</CardTitle>
          <Badge variant={game.isActive ? 'success' : 'secondary'}>
            {game.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>Sessions: {game.sessionsCount ?? 0}</p>
          <p>Win rate: {game.winRate ? `${game.winRate}%` : '-'}</p>
          <p>Correct: Position {game.correctPosition}</p>
        </div>
      </CardContent>
      <CardFooter className="gap-2 p-4 pt-0">
        <Button variant="outline" size="sm" onClick={() => onEdit(game)}>
          <Pencil className="mr-1 h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(game._id)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}

function GameForm({
  game,
  onSubmit,
  onCancel,
  isLoading,
}: {
  game?: Game | null
  onSubmit: (data: CreateGameDto) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(game?.name ?? '')
  const [imageUrl, setImageUrl] = useState(game?.imageUrl ?? '')
  const [correctPosition, setCorrectPosition] = useState<1 | 2 | 3>(
    game?.correctPosition ?? 1
  )
  const [isActive, setIsActive] = useState(game?.isActive ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, imageUrl, correctPosition, isActive })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{game ? 'Edit Game' : 'Create Game'}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Game Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Game #1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Correct Position</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map((pos) => (
                  <Button
                    key={pos}
                    type="button"
                    variant={correctPosition === pos ? 'default' : 'outline'}
                    onClick={() => setCorrectPosition(pos as 1 | 2 | 3)}
                  >
                    {pos}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export function Games() {
  const { games, isLoading, createGame, updateGame, deleteGame, isCreating, isUpdating } =
    useGames()
  const [showForm, setShowForm] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)

  const handleCreate = (data: CreateGameDto) => {
    createGame(data, {
      onSuccess: () => {
        setShowForm(false)
      },
    })
  }

  const handleUpdate = (data: CreateGameDto) => {
    if (editingGame) {
      updateGame(
        { id: editingGame._id, data },
        {
          onSuccess: () => {
            setEditingGame(null)
          },
        }
      )
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      deleteGame(id)
    }
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Games</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Game
        </Button>
      </div>

      {games.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">No games yet. Create your first game!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard
              key={game._id}
              game={game}
              onEdit={setEditingGame}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <GameForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isLoading={isCreating}
        />
      )}

      {editingGame && (
        <GameForm
          game={editingGame}
          onSubmit={handleUpdate}
          onCancel={() => setEditingGame(null)}
          isLoading={isUpdating}
        />
      )}
    </div>
  )
}
