import { ArrowRight, Calendar, Globe, Mail, Phone } from 'lucide-react'
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
import { flagEmoji } from '@/lib/format/flag'
import { formatDual } from '@/lib/format/time'
import { getLeads } from '@/lib/leads/supabase-leads'

export const dynamic = 'force-dynamic'

export default async function AdminLeadsPage() {
  const leads = await getLeads()

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Patient Leads</h2>
        <p className="text-muted-foreground">
          Contact information and details captured from patient interactions.
        </p>
      </div>

      <Card className="shadow-md border-none">
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            Potential patients who have shared their contact details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Captured At</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead: any) => {
                  const ts = formatDual(lead.created_at)
                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span>{ts?.local ?? '—'}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {ts?.utc ?? ''}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{lead.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {lead.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {lead.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {lead.interest?.replace(/-/g, ' ') || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 uppercase text-xs font-bold">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          {lead.preferred_language}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.country_code ? (
                          <span className="text-xs">
                            <span className="mr-1">{flagEmoji(lead.country_code)}</span>
                            {lead.country_code}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/leads/${lead.id}`}>
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
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
