import { Calendar, Clock, FileText, Globe, Phone } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type ElevenLabsCallStatus,
  type ElevenLabsConversationListItem,
  getElevenLabsConversations,
} from '@/lib/voice/elevenlabs-calls'

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

export default async function AdminCallsPage() {
  const conversations = await getElevenLabsConversations()

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Voice Calls</h2>
          <p className="text-muted-foreground mt-1 text-lg">
            Monitor and review all AI voice agent interactions.
          </p>
        </div>
      </div>

      <Card className="shadow-premium border-border/40 rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>A list of the latest calls handled by the AI agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No conversations found.
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conv: ElevenLabsConversationListItem) => {
                  const startMs = conv.start_time_unix_secs * 1000
                  const isPhone = conv.direction != null
                  return (
                    <TableRow
                      key={conv.conversation_id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(startMs).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isPhone ? (
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>{isPhone ? `Phone (${conv.direction})` : 'Web widget'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground">
                        {conv.call_summary_title ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDuration(conv.call_duration_secs)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(conv.status)}>{conv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full shadow-sm hover:shadow-md transition-shadow border-border/50 bg-white"
                            asChild
                          >
                            <Link href={`/admin/calls/${conv.conversation_id}`}>
                              <FileText className="h-4 w-4 mr-1.5" />
                              Review
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
