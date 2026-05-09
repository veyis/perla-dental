import { ArrowLeft, Bot, Calendar, Clock, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type ElevenLabsConversation,
  getElevenLabsConversation,
} from '@/lib/voice/elevenlabs-calls'

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
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>
                <span className="text-sm font-medium">
                  {new Date(conversation.start_time_unix_ms).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Start Time</span>
                </div>
                <span className="text-sm font-medium">
                  {new Date(conversation.start_time_unix_ms).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duration</span>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(conversation.duration_seconds)}s
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Status</span>
                </div>
                <Badge variant={conversation.status === 'completed' ? 'default' : 'secondary'}>
                  {conversation.status}
                </Badge>
              </div>
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
