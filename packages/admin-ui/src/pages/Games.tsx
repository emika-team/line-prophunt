import { useState } from 'react'
import { useGames, useMissionTags } from '@/hooks/useGames'
import { useTemplates } from '@/hooks/useTemplates'
import { useChannels, useGroups, useQuickBroadcast } from '@/hooks/useBroadcast'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, X, Send, Users, Radio, Clock, CalendarClock } from 'lucide-react'
import type { Game, CreateGameDto, CustomZone, WinMessageConfig, LoseMessageConfig } from '@/api/games'
import type { GameTemplate } from '@/api/templates'

// Helper to get game schedule status
function getGameScheduleStatus(game: Game): { status: 'scheduled' | 'active' | 'expired' | 'always'; label: string } {
  const now = new Date()
  if (game.startAt && new Date(game.startAt) > now) {
    return { status: 'scheduled', label: 'รอเปิด' }
  }
  if (game.endAt && new Date(game.endAt) < now) {
    return { status: 'expired', label: 'หมดเวลา' }
  }
  if (game.startAt || game.endAt) {
    return { status: 'active', label: 'กำลังเปิด' }
  }
  return { status: 'always', label: '' }
}

// Format datetime for display
function formatScheduleDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '-'
  return new Date(isoDate).toLocaleString('th-TH', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  })
}

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
          {(game.startAt || game.endAt) && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1 text-xs">
                <CalendarClock className="h-3 w-3" />
                <span className="font-medium">ตารางเวลา:</span>
              </div>
              {game.startAt && (
                <p className="text-xs">เริ่ม: {formatScheduleDate(game.startAt)}</p>
              )}
              {game.endAt && (
                <p className="text-xs">สิ้นสุด: {formatScheduleDate(game.endAt)}</p>
              )}
              {(() => {
                const scheduleStatus = getGameScheduleStatus(game)
                if (scheduleStatus.status === 'scheduled') {
                  return <Badge variant="outline" className="mt-1 text-xs"><Clock className="h-3 w-3 mr-1" />{scheduleStatus.label}</Badge>
                }
                if (scheduleStatus.status === 'expired') {
                  return <Badge variant="destructive" className="mt-1 text-xs">{scheduleStatus.label}</Badge>
                }
                if (scheduleStatus.status === 'active') {
                  return <Badge variant="success" className="mt-1 text-xs">{scheduleStatus.label}</Badge>
                }
                return null
              })()}
            </div>
          )}
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
  const { missionTags, isLoading: tagsLoading } = useMissionTags()

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
  const [missionTagId, setMissionTagId] = useState<number | null>(game?.missionTagId ?? null)
  const [isActive, setIsActive] = useState(game?.isActive ?? true)
  
  // Win/Lose message configs
  const [winReward, setWinReward] = useState(game?.winMessageConfig?.reward ?? '')
  const [winMessage, setWinMessage] = useState(game?.winMessageConfig?.message ?? '')
  const [winButtonText, setWinButtonText] = useState(game?.winMessageConfig?.buttonText ?? '')
  const [winButtonUrl, setWinButtonUrl] = useState(game?.winMessageConfig?.buttonUrl ?? '')
  const [loseMessage, setLoseMessage] = useState(game?.loseMessageConfig?.message ?? '')
  const [loseButtonText, setLoseButtonText] = useState(game?.loseMessageConfig?.buttonText ?? '')
  const [loseButtonUrl, setLoseButtonUrl] = useState(game?.loseMessageConfig?.buttonUrl ?? '')
  
  // Schedule
  const [startAt, setStartAt] = useState(game?.startAt ?? '')
  const [endAt, setEndAt] = useState(game?.endAt ?? '')

  const selectedTemplate = templates.find((t) => t._id === templateId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateId) {
      alert('Please select a template')
      return
    }
    
    // Build win/lose configs (only if any field is filled)
    const winMessageConfig: WinMessageConfig | null = 
      winReward || winMessage || winButtonText || winButtonUrl
        ? { reward: winReward || undefined, message: winMessage || undefined, buttonText: winButtonText || undefined, buttonUrl: winButtonUrl || undefined }
        : null
    
    const loseMessageConfig: LoseMessageConfig | null =
      loseMessage || loseButtonText || loseButtonUrl
        ? { message: loseMessage || undefined, buttonText: loseButtonText || undefined, buttonUrl: loseButtonUrl || undefined }
        : null
    
    onSubmit({
      name,
      templateId,
      imageUrl,
      correctPosition,
      customZone: selectedTemplate?.type === 'tap_zone' ? customZone : undefined,
      missionTagId,
      winMessageConfig,
      loseMessageConfig,
      startAt: startAt || null,
      endAt: endAt || null,
      isActive,
    })
  }

  if (templatesLoading || tagsLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-lg p-6">
          <p className="text-center text-muted-foreground">Loading...</p>
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

                {/* Step 4: Mission Tag (Win Reward) */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">4. Win Reward (Mission Tag)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={missionTagId ?? ''}
                    onChange={(e) => setMissionTagId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">-- No reward tag --</option>
                    {missionTags
                      .filter((tag) => !tag.name.startsWith('routine_'))
                      .map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    ผู้เล่นที่ชนะเกมนี้จะได้รับ tag นี้โดยอัตโนมัติ
                  </p>
                </div>

                {/* Step 5: Win Message Config */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">5. ข้อความแจ้งชนะ (Flex Message)</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-sm">รางวัล</Label>
                      <Input
                        value={winReward}
                        onChange={(e) => setWinReward(e.target.value)}
                        placeholder="เช่น 100 บาท"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">ข้อความ</Label>
                      <Input
                        value={winMessage}
                        onChange={(e) => setWinMessage(e.target.value)}
                        placeholder="เช่น ยินดีด้วย!"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">ข้อความปุ่ม</Label>
                      <Input
                        value={winButtonText}
                        onChange={(e) => setWinButtonText(e.target.value)}
                        placeholder="เช่น รับรางวัล"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">URL ปุ่ม</Label>
                      <Input
                        value={winButtonUrl}
                        onChange={(e) => setWinButtonUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ถ้าไม่กรอก จะใช้ข้อความ text ธรรมดา
                  </p>
                </div>

                {/* Step 6: Lose Message Config */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">6. ข้อความแจ้งแพ้ (Flex Message)</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-sm">ข้อความ</Label>
                      <Input
                        value={loseMessage}
                        onChange={(e) => setLoseMessage(e.target.value)}
                        placeholder="เช่น ขอบคุณที่ร่วมกิจกรรม"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">ข้อความปุ่ม</Label>
                      <Input
                        value={loseButtonText}
                        onChange={(e) => setLoseButtonText(e.target.value)}
                        placeholder="เช่น ลองอีกครั้ง"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">URL ปุ่ม</Label>
                      <Input
                        value={loseButtonUrl}
                        onChange={(e) => setLoseButtonUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ถ้าไม่กรอก จะใช้ข้อความ text ธรรมดา
                  </p>
                </div>

                {/* Step 7: Schedule */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">7. ตั้งเวลาเกม (ไม่บังคับ)</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-sm">เริ่มเล่นได้ตั้งแต่</Label>
                      <Input
                        type="datetime-local"
                        value={startAt ? startAt.slice(0, 16) : ''}
                        onChange={(e) => setStartAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">หมดเวลาเล่น</Label>
                      <Input
                        type="datetime-local"
                        value={endAt ? endAt.slice(0, 16) : ''}
                        onChange={(e) => setEndAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ถ้าไม่กำหนด เกมจะเล่นได้ตลอดเวลา
                  </p>
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

// Mode: channel_id, group_id, or platform
type SendMode = 'channel' | 'group' | 'platform'

interface BroadcastResultData {
  total: number
  sent: number
  failed: number
  jobId?: string
}

function BroadcastModal({
  game,
  onClose,
}: {
  game: Game
  onClose: () => void
}) {
  const { channels, isLoading: loadingChannels } = useChannels()
  const { groups, isLoading: loadingGroups } = useGroups()
  const { broadcast, isBroadcasting } = useQuickBroadcast()

  const [sendMode, setSendMode] = useState<SendMode>('platform')
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [customKeysText, setCustomKeysText] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [result, setResult] = useState<BroadcastResultData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Custom keys are always required
    const customKeys = customKeysText.split(/[\n,]/).map((k) => k.trim()).filter((k) => k.length > 0)
    if (customKeys.length === 0) {
      setError('Please enter at least one custom key')
      return
    }

    // Validate based on send mode
    if (sendMode === 'channel' && !selectedChannelId) {
      setError('Please select a channel')
      return
    }
    if (sendMode === 'group' && !selectedGroupId) {
      setError('Please select a group')
      return
    }

    try {
      const res = await broadcast({
        gameId: game._id,
        targetType: 'custom',
        customKeys,
        customMessage: customMessage || undefined,
        // Pass channel_id or group_id based on mode
        ...(sendMode === 'channel' && selectedChannelId ? { channelId: selectedChannelId } : {}),
        ...(sendMode === 'group' && selectedGroupId ? { groupId: selectedGroupId } : {}),
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broadcast failed')
    }
  }

  const getTargetInfo = () => {
    const keys = customKeysText.split(/[\n,]/).map((k) => k.trim()).filter((k) => k.length > 0)
    const keyCount = `${keys.length} recipients`
    
    if (sendMode === 'channel') {
      const ch = channels.find((c) => c._id === selectedChannelId)
      return ch ? `${keyCount} via Channel: ${ch.channelName}` : `${keyCount} - Select a channel`
    }
    if (sendMode === 'group') {
      const g = groups.find((gr) => gr._id === selectedGroupId)
      return g ? `${keyCount} via Group: ${g.name}` : `${keyCount} - Select a group`
    }
    return `${keyCount} via Platform: LINE`
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
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
            <Button className="w-full" onClick={onClose}>
              Close
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Custom Keys Input - Always Required */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Custom Keys *</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={customKeysText}
                  onChange={(e) => setCustomKeysText(e.target.value)}
                  placeholder="member001&#10;member002&#10;member003"
                  required
                />
                <p className="text-xs text-muted-foreground">One per line or comma-separated</p>
              </div>

              {/* Send Mode Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Send Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'platform', label: 'Platform', icon: Send, desc: 'LINE' },
                    { value: 'channel', label: 'Channel', icon: Radio, desc: 'เลือก channel' },
                    { value: 'group', label: 'Group', icon: Users, desc: 'เลือก group' },
                  ].map(({ value, label, icon: Icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSendMode(value as SendMode)}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-colors ${
                        sendMode === value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Selection */}
              {sendMode === 'channel' && (
                <div className="space-y-2">
                  <Label>Select Channel</Label>
                  {loadingChannels ? (
                    <p className="text-sm text-muted-foreground">Loading channels...</p>
                  ) : channels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No channels found</p>
                  ) : (
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                    >
                      <option value="">-- Select Channel --</option>
                      {channels.map((ch) => (
                        <option key={ch._id} value={ch._id}>
                          {ch.channelName} ({ch.playerCount} players)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Group Selection */}
              {sendMode === 'group' && (
                <div className="space-y-2">
                  <Label>Select Group</Label>
                  {loadingGroups ? (
                    <p className="text-sm text-muted-foreground">Loading groups...</p>
                  ) : groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No groups found</p>
                  ) : (
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                    >
                      <option value="">-- Select Group --</option>
                      {groups.map((g) => (
                        <option key={g._id} value={g._id}>
                          {g.name} ({g.memberCount} members)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Custom Message */}
              <div className="space-y-2">
                <Label>Custom Message (optional)</Label>
                <Input
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Default: เกม ${game.name}`}
                />
              </div>

              {/* Target Info */}
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">{getTargetInfo()}</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isBroadcasting}>
                {isBroadcasting ? 'Sending...' : 'Send Broadcast'}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}

export function Games() {
  const { games, isLoading, createGame, updateGame, deleteGame, isCreating, isUpdating } =
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
        />
      )}
    </div>
  )
}
