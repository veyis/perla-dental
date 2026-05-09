import { Calendar, Clock, FileText } from 'lucide-react'
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
  type ElevenLabsConversation,
  getElevenLabsConversations,
} from '@/lib/voice/elevenlabs-calls'

export default async function AdminCallsPage() {
  const conversations = await getElevenLabsConversations()

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Voice Calls</h2>
          <p className="text-muted-foreground">
            Monitor and review all AI voice agent interactions.
          </p>
        </div>
      </div>

      <Card className="shadow-md border-none">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>A list of the latest calls handled by the AI agent.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Caller ID</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No conversations found.
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conv: ElevenLabsConversation) => (
                  <TableRow
                    key={conv.conversation_id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(conv.start_time_unix_ms).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {conv.metadata?.caller_id || 'Anonymous'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{Math.round(conv.duration_seconds)}s</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={conv.status === 'completed' ? 'default' : 'secondary'}>
                        {conv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/calls/${conv.conversation_id}`}>
                            <FileText className="h-4 w-4 mr-1" />
                            Review
                          </Link>
                        </Button>
                      </div>
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
