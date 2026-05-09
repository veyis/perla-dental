import { ArrowRight, Calendar } from 'lucide-react'
import Link from 'next/link'
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
import { getAuditEvents } from '@/lib/leads/supabase-leads'

export default async function AdminChatsPage() {
  const events = await getAuditEvents('chat_message')

  // Group events by conversation_id
  const conversations: Record<
    string,
    { id: string; lastMessageAt: string; messageCount: number; preview: string }
  > = {}

  for (const event of events) {
    const convId = event.conversation_id
    if (!convId) continue

    if (!conversations[convId]) {
      conversations[convId] = {
        id: convId,
        lastMessageAt: event.created_at,
        messageCount: 0,
        preview: (event.detail.content as string) || '',
      }
    }

    conversations[convId].messageCount++
    if (new Date(event.created_at) > new Date(conversations[convId].lastMessageAt)) {
      conversations[convId].lastMessageAt = event.created_at
      conversations[convId].preview = (event.detail.content as string) || ''
    }
  }

  const convList = Object.values(conversations).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  )

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Chat Histories</h2>
        <p className="text-muted-foreground">
          Review all interactions with the dental clinic chat assistant.
        </p>
      </div>

      <Card className="shadow-md border-none">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Sessions grouped by conversation ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Last Active</TableHead>
                <TableHead>Conversation ID</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No chat histories found.
                  </TableCell>
                </TableRow>
              ) : (
                convList.map((conv) => (
                  <TableRow key={conv.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(conv.lastMessageAt).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{conv.id}</TableCell>
                    <TableCell>{conv.messageCount}</TableCell>
                    <TableCell className="max-w-[300px] truncate italic text-muted-foreground">
                      "{conv.preview}"
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/chats/${conv.id}`}>
                          View Chat
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
