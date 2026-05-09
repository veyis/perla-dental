import { ArrowLeft, Bot, MessageSquare, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuditEvents } from '@/lib/leads/supabase-leads'

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  const allEvents = await getAuditEvents('chat_message')
  const messages = allEvents
    .filter((e: any) => e.conversation_id === id)
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  if (messages.length === 0) {
    notFound()
  }

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
              {messages.map((event: any, _index: number) => {
                const isAgent = event.detail.role === 'assistant'
                return (
                  <div
                    key={event.id}
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
                      <p className="leading-relaxed">{event.detail.content}</p>
                      <div className="text-[10px] opacity-50 text-right mt-1">
                        {new Date(event.created_at).toLocaleTimeString([], {
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-muted-foreground">Started On</span>
                <span className="text-sm font-medium">
                  {new Date(messages[0].created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-col gap-1 py-2 border-b">
                <span className="text-xs text-muted-foreground">Total Messages</span>
                <span className="text-sm font-medium">{messages.length}</span>
              </div>
              <div className="flex flex-col gap-1 py-2">
                <span className="text-xs text-muted-foreground">Channel</span>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 text-primary" />
                  <span className="text-sm font-medium">Website Chat</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
