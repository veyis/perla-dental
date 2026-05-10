import { ArrowLeft, Bot, ExternalLink, Globe, MapPin, MessageSquare, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { flagEmoji } from '@/lib/format/flag'
import { googleMapsUrl } from '@/lib/format/maps'
import { formatDual } from '@/lib/format/time'
import { getChatSession } from '@/lib/leads/chat-sessions'
import { getChatMessages } from '@/lib/leads/supabase-leads'

export const dynamic = 'force-dynamic'

const DASH = (
  <span title="Not captured" className="text-muted-foreground">
    —
  </span>
)

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  const [all, session] = await Promise.all([getChatMessages(id), getChatSession(id)])
  const messages = all.sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  if (messages.length === 0) {
    notFound()
  }

  const startedAt = formatDual(session?.started_at ?? messages[0].created_at)
  const lastSeenAt = formatDual(session?.last_seen_at ?? messages[messages.length - 1].created_at)
  const mapsUrl = googleMapsUrl({
    latitude: session?.latitude ?? null,
    longitude: session?.longitude ?? null,
    city: session?.city ?? null,
    region: session?.region ?? null,
    country: session?.country_code ?? null,
  })

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/chats">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Chat History</h2>
          <p className="text-muted-foreground">
            Session: <span className="font-mono">{id}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-3">
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>Conversation Log</CardTitle>
              <CardDescription>Transcript of the chat assistant interaction.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {messages.map((msg: any, _index: number) => {
                const isAgent = msg.role === 'assistant'
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`mt-1 flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow ${
                        isAgent ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {isAgent ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div
                      className={`flex flex-col gap-1 rounded-2xl px-4 py-2 text-sm max-w-[80%] ${
                        isAgent
                          ? 'bg-muted rounded-tl-none'
                          : 'bg-primary text-primary-foreground rounded-tr-none'
                      }`}
                    >
                      <div className="font-semibold text-[10px] uppercase tracking-wider opacity-70">
                        {isAgent ? 'Perla Assistant' : 'User'}
                      </div>
                      <p className="leading-relaxed">{msg.content}</p>
                      <div className="text-[10px] opacity-50 text-right mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
              <CardDescription>Where this conversation came from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Started</div>
                {startedAt ? (
                  <>
                    <div className="font-medium">{startedAt.local}</div>
                    <div className="text-[11px] text-muted-foreground">{startedAt.utc}</div>
                  </>
                ) : (
                  DASH
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last seen</div>
                {lastSeenAt ? (
                  <>
                    <div className="font-medium">{lastSeenAt.local}</div>
                    <div className="text-[11px] text-muted-foreground">{lastSeenAt.utc}</div>
                  </>
                ) : (
                  DASH
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total messages</div>
                <div className="font-medium">{messages.length}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Channel</div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 text-primary" />
                  <span className="font-medium">Website Chat</span>
                </div>
              </div>
              <div className="pt-2 border-t" />
              <div>
                <div className="text-xs text-muted-foreground">IP address</div>
                <div className="font-mono text-xs">{session?.ip_address || DASH}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Country</div>
                <div>
                  {session?.country_code ? (
                    <>
                      <span className="mr-1">{flagEmoji(session.country_code)}</span>
                      {session.country_code}
                      {session.continent ? (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {session.continent}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    DASH
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">City / region</div>
                <div className="text-xs">
                  {session?.city || session?.region ? (
                    <>
                      {session?.city || ''}
                      {session?.city && session?.region ? ', ' : ''}
                      {session?.region || ''}
                    </>
                  ) : (
                    DASH
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Postal / timezone</div>
                <div className="text-xs">
                  {session?.postal_code || session?.timezone ? (
                    <>
                      {session?.postal_code || ''}
                      {session?.postal_code && session?.timezone ? ' · ' : ''}
                      {session?.timezone || ''}
                    </>
                  ) : (
                    DASH
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Coordinates</div>
                <div className="font-mono text-[11px]">
                  {typeof session?.latitude === 'number' &&
                  typeof session?.longitude === 'number' ? (
                    <>
                      {session.latitude.toFixed(4)}, {session.longitude.toFixed(4)}
                    </>
                  ) : (
                    DASH
                  )}
                </div>
              </div>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Approximate location of the IP — accuracy varies by ISP"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <MapPin className="h-3 w-3" />
                  View on Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              <div className="pt-2 border-t" />
              <div>
                <div className="text-xs text-muted-foreground">User-Agent</div>
                <div className="font-mono text-[11px] break-all">{session?.user_agent || DASH}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Accept-Language</div>
                <div className="text-xs">
                  <Globe className="inline h-3 w-3 mr-1 text-muted-foreground" />
                  {session?.accept_language || DASH}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Referrer</div>
                <div className="text-xs break-all">{session?.referrer || DASH}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
