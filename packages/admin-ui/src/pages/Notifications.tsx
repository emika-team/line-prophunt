import { useState } from 'react'
import { useMessageTemplates, useSendTemplate } from '@/hooks/useMessageTemplates'
import { useSendNotification } from '@/hooks/useNotifications'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Send, Image, FileText, Code, Plus, Trash2, LayoutTemplate, Wand2 } from 'lucide-react'
import type { LineMessage } from '@/api/notifications'
import type { MessageTemplate } from '@/api/message-templates'

type MessageType = 'text' | 'image' | 'flex'
type TabType = 'template' | 'custom'

interface MessageItem {
  id: string
  type: MessageType
  data: {
    text?: string
    imageUrl?: string
    flexJson?: string
    altText?: string
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: MessageTemplate
  isSelected: boolean
  onSelect: () => void
}) {
  const categoryColors: Record<string, string> = {
    receipt: 'bg-green-100 text-green-800',
    reward: 'bg-yellow-100 text-yellow-800',
    promotion: 'bg-purple-100 text-purple-800',
  }

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
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{template.name}</h4>
        <Badge className={categoryColors[template.category] || 'bg-gray-100 text-gray-800'}>
          {template.category}
        </Badge>
      </div>
      {template.description && (
        <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
      )}
      {template.variables.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {template.variables.map((v) => (
            <Badge key={v} variant="outline" className="text-xs">
              {`{{${v}}}`}
            </Badge>
          ))}
        </div>
      )}
    </button>
  )
}

function MessageEditor({
  message,
  onChange,
  onRemove,
}: {
  message: MessageItem
  onChange: (msg: MessageItem) => void
  onRemove: () => void
}) {
  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {message.type === 'text' && <FileText className="h-4 w-4" />}
          {message.type === 'image' && <Image className="h-4 w-4" />}
          {message.type === 'flex' && <Code className="h-4 w-4" />}
          <Badge variant="outline">{message.type.toUpperCase()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {message.type === 'text' && (
          <div className="space-y-2">
            <Label>Text Message</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={message.data.text ?? ''}
              onChange={(e) =>
                onChange({ ...message, data: { ...message.data, text: e.target.value } })
              }
              placeholder="Enter your message..."
            />
          </div>
        )}

        {message.type === 'image' && (
          <>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={message.data.imageUrl ?? ''}
                onChange={(e) =>
                  onChange({ ...message, data: { ...message.data, imageUrl: e.target.value } })
                }
                placeholder="https://..."
              />
            </div>
            {message.data.imageUrl && (
              <div className="aspect-video w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
                <img
                  src={message.data.imageUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </>
        )}

        {message.type === 'flex' && (
          <>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input
                value={message.data.altText ?? ''}
                onChange={(e) =>
                  onChange({ ...message, data: { ...message.data, altText: e.target.value } })
                }
                placeholder="Message preview text"
              />
            </div>
            <div className="space-y-2">
              <Label>Flex Message JSON</Label>
              <textarea
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                value={message.data.flexJson ?? ''}
                onChange={(e) =>
                  onChange({ ...message, data: { ...message.data, flexJson: e.target.value } })
                }
                placeholder='{"type": "bubble", "body": {...}}'
              />
              <p className="text-xs text-muted-foreground">
                ใส่ Flex Message contents (bubble หรือ carousel)
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function Notifications() {
  const { templates, isLoading: templatesLoading, seedTemplates, isSeeding } = useMessageTemplates()
  const { send: sendTemplate, isSending: isSendingTemplate } = useSendTemplate()
  const { send: sendCustom, isSending: isSendingCustom } = useSendNotification()

  const [activeTab, setActiveTab] = useState<TabType>('template')
  const [customKeysText, setCustomKeysText] = useState('')
  
  // Template mode state
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})

  // Custom mode state
  const [messages, setMessages] = useState<MessageItem[]>([])

  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSending = isSendingTemplate || isSendingCustom

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template)
    // Initialize variables with empty strings
    const vars: Record<string, string> = {}
    template.variables.forEach((v) => {
      vars[v] = ''
    })
    setVariables(vars)
  }

  const addMessage = (type: MessageType) => {
    setMessages([...messages, { id: generateId(), type, data: {} }])
  }

  const updateMessage = (id: string, msg: MessageItem) => {
    setMessages(messages.map((m) => (m.id === id ? msg : m)))
  }

  const removeMessage = (id: string) => {
    setMessages(messages.filter((m) => m.id !== id))
  }

  const buildLineMessages = (): LineMessage[] => {
    return messages.map((msg) => {
      if (msg.type === 'text') {
        return { type: 'text', text: msg.data.text ?? '' }
      }
      if (msg.type === 'image') {
        return {
          type: 'image',
          originalContentUrl: msg.data.imageUrl ?? '',
          previewImageUrl: msg.data.imageUrl ?? '',
        }
      }
      try {
        const contents = JSON.parse(msg.data.flexJson ?? '{}')
        return {
          type: 'flex',
          altText: msg.data.altText ?? 'Notification',
          contents,
        }
      } catch {
        return {
          type: 'flex',
          altText: msg.data.altText ?? 'Notification',
          contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } },
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    const customKeys = customKeysText
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    if (customKeys.length === 0) {
      setError('Please enter at least one custom key')
      return
    }

    try {
      if (activeTab === 'template') {
        if (!selectedTemplate) {
          setError('Please select a template')
          return
        }
        const res = await sendTemplate({
          id: selectedTemplate._id,
          data: { customKeys, variables },
        })
        setResult({ total: res.total, sent: res.sent, failed: res.failed })
      } else {
        if (messages.length === 0) {
          setError('Please add at least one message')
          return
        }
        const res = await sendCustom({
          customKeys,
          messages: buildLineMessages(),
        })
        setResult({ total: res.total, sent: res.sent, failed: res.failed })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    }
  }

  const handleSeedTemplates = async () => {
    try {
      const res = await seedTemplates()
      alert(`Created ${res.created} templates, skipped ${res.skipped} existing`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to seed templates')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Send Notification</h1>
        {templates.length === 0 && (
          <Button onClick={handleSeedTemplates} disabled={isSeeding}>
            <Wand2 className="mr-2 h-4 w-4" />
            {isSeeding ? 'Creating...' : 'Create Default Templates'}
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'template' ? 'default' : 'outline'}
          onClick={() => setActiveTab('template')}
        >
          <LayoutTemplate className="mr-2 h-4 w-4" />
          Use Template
        </Button>
        <Button
          variant={activeTab === 'custom' ? 'default' : 'outline'}
          onClick={() => setActiveTab('custom')}
        >
          <Code className="mr-2 h-4 w-4" />
          Custom Message
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Recipients */}
        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Custom Keys</Label>
              <textarea
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={customKeysText}
                onChange={(e) => setCustomKeysText(e.target.value)}
                placeholder="member001&#10;member002&#10;member003"
              />
              <p className="text-xs text-muted-foreground">One per line or comma-separated</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Template or Custom */}
        {activeTab === 'template' ? (
          <Card>
            <CardHeader>
              <CardTitle>Select Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {templatesLoading ? (
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              ) : templates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <LayoutTemplate className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No templates yet. Click "Create Default Templates" to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template._id}
                      template={template}
                      isSelected={selectedTemplate?._id === template._id}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              )}

              {/* Variables Input */}
              {selectedTemplate && selectedTemplate.variables.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-base font-semibold">Fill Variables</Label>
                  {selectedTemplate.variables.map((varName) => (
                    <div key={varName} className="space-y-1">
                      <Label className="text-sm">{varName}</Label>
                      <Input
                        value={variables[varName] || ''}
                        onChange={(e) =>
                          setVariables({ ...variables, [varName]: e.target.value })
                        }
                        placeholder={`Enter ${varName}...`}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    * username จะใช้ค่า custom key โดยอัตโนมัติถ้าไม่กรอก
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addMessage('text')}>
                  <FileText className="mr-1 h-4 w-4" />
                  Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => addMessage('image')}>
                  <Image className="mr-1 h-4 w-4" />
                  Image
                </Button>
                <Button variant="outline" size="sm" onClick={() => addMessage('flex')}>
                  <Code className="mr-1 h-4 w-4" />
                  Flex
                </Button>
              </div>

              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Plus className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click buttons above to add messages
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {messages.map((msg) => (
                    <MessageEditor
                      key={msg.id}
                      message={msg}
                      onChange={(updated) => updateMessage(msg.id, updated)}
                      onRemove={() => removeMessage(msg.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Result / Error */}
      {result && (
        <Card>
          <CardContent className="py-4">
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
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Send Button */}
      <Card>
        <CardFooter className="pt-4">
          <Button className="w-full" onClick={handleSubmit} disabled={isSending}>
            <Send className="mr-2 h-4 w-4" />
            {isSending ? 'Sending...' : 'Send Notification'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
