import { MessageSquare, PhoneCall, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getChatMessages, getLeads } from '@/lib/leads/supabase-leads'
import { getElevenLabsConversations } from '@/lib/voice/elevenlabs-calls'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [leads, calls, chats] = await Promise.all([
    getLeads(),
    getElevenLabsConversations(),
    getChatMessages(),
  ])

  // Count unique chat conversations
  const chatSessions = new Set(chats.map((c: any) => c.conversation_id)).size

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">Total patient leads captured</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-chart-1/10 to-chart-1/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calls.length}</div>
            <p className="text-xs text-muted-foreground">Total AI voice calls handled</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-chart-2/10 to-chart-2/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatSessions}</div>
            <p className="text-xs text-muted-foreground">Unique chat assistant sessions</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-chart-3/10 to-chart-3/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14.2%</div>
            <p className="text-xs text-muted-foreground">+2.1% from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-md">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Interactions over time</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] w-full bg-muted/50 rounded-md flex items-center justify-center text-muted-foreground">
              [Chart Placeholder]
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 shadow-md">
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>You have 5 new leads today.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leads.slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {lead.full_name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium leading-none">{lead.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {lead.interest?.replace(/-/g, ' ')}
                    </p>
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
