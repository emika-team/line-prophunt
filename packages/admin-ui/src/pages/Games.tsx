import { useState } from 'react'
import { useGames } from '@/hooks/useGames'
import { useTemplates } from '@/hooks/useTemplates'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, X, Send } from 'lucide-react'
import type { Game, CreateGameDto, BroadcastResult, CustomZone } from '@/api/games'
import type { GameTemplate } from '@/api/templates'

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: GameTemplate
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <h4 className="font-medium">{template.name}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
      <div className="mt-2 flex gap-2">
        <Badge variant="outline">{template.content.layout}</Badge>
        <Badge variant="outline">{template.totalZones} zones</Badge>
        {template.singleAttempt && (
          <Badge variant="destructive">Single Attempt</Badge>
        )}
      </div>
    </button>
  )
}

function ZonePreview({
  template,
  selectedPosition,
  onSelectPosition,
  customZone,
  onCustomZoneChange,
}: {
  template: GameTemplate
  selectedPosition: number
  onSelectPosition: (position: number) => void
  customZone?: CustomZone
  onCustomZoneChange?: (zone: CustomZone) => void
}) {
  // For TAP_ZONE, show custom zone input
  if (template.type === 'tap_zone' && onCustomZoneChange) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          กำหนดพิกัด zone ที่ถูกต้อง (สำหรับรูป 1040x1040)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="zoneX">X</Label>
            <Input
              id="zoneX"
              type="number"
              value={customZone?.x ?? 0}
              onChange={(e) =>
                onCustomZoneChange({
                  x: parseInt(e.target.value) || 0,
                  y: customZone?.y ?? 0,
                  width: customZone?.width ?? 100,
                  height: customZone?.height ?? 100,
                })
              }
              min={0}
              max={1040}
            />
          </div>
          <div>
            <Label htmlFor="zoneY">Y</Label>
            <Input
              id="zoneY"
              type="number"
              value={customZone?.y ?? 0}
              onChange={(e) =>
                onCustomZoneChange({
                  x: customZone?.x ?? 0,
                  y: parseInt(e.target.value) || 0,
                  width: customZone?.width ?? 100,
                  height: customZone?.height ?? 100,
                })
              }
              min={0}
              max={1040}
            />
          </div>
          <div>
            <Label htmlFor="zoneWidth">Width</Label>
            <Input
              id="zoneWidth"
              type="number"
              value={customZone?.width ?? 100}
              onChange={(e) =>
                onCustomZoneChange({
                  x: customZone?.x ?? 0,
                  y: customZone?.y ?? 0,
                  width: parseInt(e.target.value) || 100,
                  height: customZone?.height ?? 100,
                })
              }
              min={10}
              max={1040}
            />
          </div>
          <div>
            <Label htmlFor="zoneHeight">Height</Label>
            <Input
              id="zoneHeight"
              type="number"
              value={customZone?.height ?? 100}
              onChange={(e) =>
                onCustomZoneChange({
                  x: customZone?.x ?? 0,
                  y: customZone?.y ?? 0,
                  width: customZone?.width ?? 100,
                  height: parseInt(e.target.value) || 100,
                })
              }
              min={10}
              max={1040}
            />
          </div>
        </div>
      </div>
    )
  }

  // For other templates, show clickable grid
  const areas = template.clickableAreas
  const layout = template.content.layout

  // Determine grid layout
  let gridCols = 1
  let gridRows = 1
  if (layout === '2x2') {
    gridCols = 2
    gridRows = 2
  } else if (layout === '1+3') {
    gridCols = 3
    gridRows = 1
  } else if (layout === '1x2') {
    gridCols = 2
    gridRows = 1
  }

  return (
    <div
      className="grid gap-1 rounded-lg border bg-muted/50 p-2"
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        aspectRatio: `${gridCols} / ${gridRows}`,
        maxWidth: '300px',
      }}
    >
      {areas.map((area) => {
        const isSelected = area.position === selectedPosition

        return (
          <button
            key={area.position}
            type="button"
            onClick={() => onSelectPosition(area.position)}
            className={`flex items-center justify-center rounded border-2 text-sm font-medium transition-colors ${
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary/50 hover:bg-accent'
            }`}
            style={{ minHeight: '60px' }}
          >
            {template.content.labels?.[area.position - 1] ?? area.position}
          </button>
        )
      })}
    </div>
  )
}

function GameCard({
  game,
  onEdit,
  onDelete,
  onBroadcast,
}: {
  game: Game
  onEdit: (game: Game) => void
  onDelete: (id: string) => void
  onBroadcast: (game: Game) => void
}) {
  const template = typeof game.templateId === 'object' ? game.templateId : null

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
          {template && (
            <p>Template: {template.name}</p>
          )}
          <p>Correct: Position {game.correctPosition}</p>
          <p>Sessions: {game.sessionsCount ?? 0}</p>
          <p>Win rate: {game.winRate ? `${game.winRate}%` : '-'}</p>
        </div>
      </CardContent>
      <CardFooter className="gap-2 p-4 pt-0 flex-wrap">
        <Button variant="default" size="sm" onClick={() => onBroadcast(game)}>
          <Send className="mr-1 h-4 w-4" />
          Broadcast
        </Button>
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
  const { templates, isLoading: templatesLoading } = useTemplates()

  const existingTemplate = game?.templateId
    ? typeof game.templateId === 'object'
      ? game.templateId
      : templates.find((t) => t._id === game.templateId)
    : null

  const [name, setName] = useState(game?.name ?? '')
  const [templateId, setTemplateId] = useState(existingTemplate?._id ?? '')
  const [imageUrl, setImageUrl] = useState(game?.imageUrl ?? '')
  const [correctPosition, setCorrectPosition] = useState(game?.correctPosition ?? 1)
  const [customZone, setCustomZone] = useState<CustomZone | undefined>(game?.customZone)
  const [isActive, setIsActive] = useState(game?.isActive ?? true)

  const selectedTemplate = templates.find((t) => t._id === templateId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateId) {
      alert('Please select a template')
      return
    }
    onSubmit({
      name,
      templateId,
      imageUrl,
      correctPosition,
      customZone: selectedTemplate?.type === 'tap_zone' ? customZone : undefined,
      isActive,
    })
  }

  if (templatesLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-lg p-6">
          <p className="text-center text-muted-foreground">Loading templates...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{game ? 'Edit Game' : 'Create Game'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Step 1: Select Template */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">1. Select Template</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((template) => (
                  <TemplateCard
                    key={template._id}
                    template={template}
                    isSelected={templateId === template._id}
                    onSelect={() => {
                      setTemplateId(template._id)
                      setCorrectPosition(1)
                      if (template.type === 'tap_zone') {
                        setCustomZone({ x: 100, y: 200, width: 200, height: 200 })
                      } else {
                        setCustomZone(undefined)
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {selectedTemplate && (
              <>
                {/* Step 2: Game Info */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">2. Game Info</Label>
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
                    <Label htmlFor="imageUrl">Image URL (1040x1040)</Label>
                    <Input
                      id="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      required
                    />
                    {imageUrl && (
                      <div className="mt-2 aspect-square w-48 overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3: Select Correct Answer */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">3. Select Correct Answer</Label>
                  <ZonePreview
                    template={selectedTemplate}
                    selectedPosition={correctPosition}
                    onSelectPosition={setCorrectPosition}
                    customZone={customZone}
                    onCustomZoneChange={
                      selectedTemplate.type === 'tap_zone' ? setCustomZone : undefined
                    }
                  />
                </div>

                {/* Active Toggle */}
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
              </>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !templateId}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function BroadcastModal({
  game,
  onClose,
  onBroadcast,
  isLoading,
}: {
  game: Game
  onClose: () => void
  onBroadcast: (customKeys: string[], customMessage?: string) => Promise<BroadcastResult>
  isLoading: boolean
}) {
  const [customKeysText, setCustomKeysText] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [result, setResult] = useState<BroadcastResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const customKeys = customKeysText
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    if (customKeys.length === 0) {
      alert('Please enter at least one custom key')
      return
    }

    const res = await onBroadcast(customKeys, customMessage || undefined)
    setResult(res)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Broadcast: {game.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        {result ? (
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{result.sessionsCreated}</p>
                  <p className="text-sm text-muted-foreground">Sessions Created</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.sent}</p>
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
            {result.failed > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Failed:</p>
                <div className="max-h-40 overflow-y-auto rounded border p-2 text-sm">
                  {result.results
                    .filter((r) => !r.success)
                    .map((r, i) => (
                      <div key={i} className="text-red-600">
                        {r.customKey}: {r.error}
                      </div>
                    ))}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={onClose}>
              Close
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Custom Keys (one per line or comma-separated)</Label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={customKeysText}
                  onChange={(e) => setCustomKeysText(e.target.value)}
                  placeholder="member001&#10;member002&#10;member003"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Custom Message (optional)</Label>
                <Input
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Default: เกม ${game.name}`}
                />
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}

export function Games() {
  const { games, isLoading, createGame, updateGame, deleteGame, broadcastGame, isCreating, isUpdating, isBroadcasting } =
    useGames()
  const [showForm, setShowForm] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [broadcastingGame, setBroadcastingGame] = useState<Game | null>(null)

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
              onBroadcast={setBroadcastingGame}
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

      {broadcastingGame && (
        <BroadcastModal
          game={broadcastingGame}
          onClose={() => setBroadcastingGame(null)}
          onBroadcast={async (customKeys, customMessage) => {
            return await broadcastGame({ id: broadcastingGame._id, data: { customKeys, customMessage } })
          }}
          isLoading={isBroadcasting}
        />
      )}
    </div>
  )
}
