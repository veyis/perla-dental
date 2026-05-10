import {
  ArrowLeft,
  Bot,
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { flagEmoji } from '@/lib/format/flag'
import { googleMapsUrl } from '@/lib/format/maps'
import { formatDual } from '@/lib/format/time'
import { phoneCountry } from '@/lib/leads/phone-country'
import { type ElevenLabsCallStatus, getElevenLabsConversation } from '@/lib/voice/elevenlabs-calls'

export const dynamic = 'force-dynamic'

function statusVariant(status: ElevenLabsCallStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'done') return 'default'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export default async function AdminCallDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  const conversation = await getElevenLabsConversation(id)

  if (!conversation) {
    notFound()
  }

  const startMs = conversation.metadata.start_time_unix_secs * 1000
  const durationSecs = conversation.metadata.call_duration_secs
  const callerPhone = conversation.metadata.phone_call?.external_number ?? null
  const callerCountry = phoneCountry(callerPhone)
  const callerMapsUrl = googleMapsUrl({
    latitude: null,
    longitude: null,
    city: null,
    region: null,
    country: callerCountry,
  })
  const startedAt = formatDual(new Date(startMs))

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/calls">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Call Review</h2>
          <p className="text-muted-foreground">Conversation ID: {id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-md border-none h-full">
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                Full conversation between the user and the AI agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
              {conversation.transcript?.map((entry, index: number) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    entry.role === 'agent' ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div
                    className={`mt-1 flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow ${
                      entry.role === 'agent'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background'
                    }`}
                  >
                    {entry.role === 'agent' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`flex flex-col gap-1 rounded-lg px-3 py-2 text-sm ${
                      entry.role === 'agent' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className="font-semibold text-xs opacity-70">
                      {entry.role === 'agent' ? 'AI Assistant' : 'User'}
                    </div>
                    <p>{entry.message}</p>
                    <div className="text-[10px] opacity-50 text-right">
                      {Math.round(entry.time_in_call_secs)}s
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>Call Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Started</span>
                </div>
                {startedAt ? (
                  <>
                    <div className="text-sm font-medium">{startedAt.local}</div>
                    <div className="text-[11px] text-muted-foreground">{startedAt.utc}</div>
                  </>
                ) : (
                  <span className="text-sm">—</span>
                )}
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duration</span>
                </div>
                <span className="text-sm font-medium">{formatDuration(durationSecs)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <Badge variant={statusVariant(conversation.status)}>{conversation.status}</Badge>
              </div>
              {conversation.metadata.main_language ? (
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>Language</span>
                  </div>
                  <span className="text-sm font-medium uppercase">
                    {conversation.metadata.main_language}
                  </span>
                </div>
              ) : null}
              {conversation.metadata.phone_call?.direction ? (
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>Direction</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {conversation.metadata.phone_call.direction}
                  </Badge>
                </div>
              ) : null}
              {callerPhone ? (
                <div className="py-2 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="h-4 w-4" />
                    <span>Caller</span>
                  </div>
                  <div className="text-sm font-mono">{callerPhone}</div>
                  {callerCountry ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="mr-1">{flagEmoji(callerCountry)}</span>
                      {callerCountry}
                      {callerMapsUrl ? (
                        <>
                          {' · '}
                          <a
                            href={callerMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Country-level map (phone calls don't carry precise geo)"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <MapPin className="h-3 w-3" />
                            Maps
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {conversation.metadata.termination_reason ? (
                <div className="py-2">
                  <div className="text-xs text-muted-foreground">Termination reason</div>
                  <div className="text-xs">{conversation.metadata.termination_reason}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-md border-none bg-primary/5">
            <CardHeader>
              <CardTitle>Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <audio controls className="w-full" src={`/api/admin/calls/${id}/audio`}>
                  Your browser does not support the audio element.
                </audio>
                <p className="text-[10px] text-muted-foreground text-center">
                  Recordings are available for 30 days.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
