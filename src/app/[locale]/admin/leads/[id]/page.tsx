import { ArrowLeft, ExternalLink, Globe, Mail, MapPin, Phone, Shield } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { flagEmoji } from '@/lib/format/flag'
import { googleMapsUrl } from '@/lib/format/maps'
import { formatDual } from '@/lib/format/time'
import { phoneCountry } from '@/lib/leads/phone-country'
import { getLeadById } from '@/lib/leads/supabase-leads'

export const dynamic = 'force-dynamic'

const DASH = (
  <span title="Not captured" className="text-muted-foreground">
    —
  </span>
)

function isVoiceAgentSyntheticId(convId: string | null | undefined): boolean {
  return !!convId && convId.startsWith('voice_')
}

function ConversationLink({
  conversationId,
  source,
}: {
  conversationId: string | null
  source: string | null
}) {
  if (!conversationId) return DASH
  // Voice-agent leads use synthetic IDs from the voice-llm proxy that
  // don't match ElevenLabs conversation IDs, so they can't link to a
  // call recording.
  if (isVoiceAgentSyntheticId(conversationId) || source === 'voice-agent') {
    return (
      <span className="font-mono text-xs">
        {conversationId}{' '}
        <Badge variant="secondary" className="ml-2 text-[10px]">
          Voice agent session
        </Badge>
      </span>
    )
  }
  return (
    <Link
      href={`/admin/chats/${conversationId}`}
      className="font-mono text-xs text-primary hover:underline"
    >
      {conversationId}
    </Link>
  )
}

function MapLink({
  latitude,
  longitude,
  city,
  region,
  country,
}: {
  latitude: number | null
  longitude: number | null
  city: string | null
  region: string | null
  country: string | null
}) {
  const url = googleMapsUrl({ latitude, longitude, city, region, country })
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Approximate location of the IP — accuracy varies by ISP"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <MapPin className="h-3 w-3" />
      View on Google Maps
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  const lead = (await getLeadById(id)) as Record<string, unknown> | null
  if (!lead) notFound()

  const created = formatDual(lead.created_at as string | null)
  const consented = formatDual(lead.consent_given_at as string | null)

  const ip = (lead.ip_address as string | null) ?? null
  const country = (lead.country_code as string | null) ?? null
  const city = (lead.city as string | null) ?? null
  const region = (lead.region as string | null) ?? null
  const postal = (lead.postal_code as string | null) ?? null
  const continent = (lead.continent as string | null) ?? null
  const tz = (lead.timezone as string | null) ?? null
  const lat = (lead.latitude as number | null) ?? null
  const lon = (lead.longitude as number | null) ?? null
  const ua = (lead.user_agent_short as string | null) ?? null
  const referrer = (lead.referrer as string | null) ?? null
  const acceptLang = (lead.accept_language as string | null) ?? null

  const phone = (lead.phone as string | null) ?? null
  const phoneIso = phoneCountry(phone)

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {(lead.full_name as string) || 'Lead'}
          </h2>
          <p className="text-muted-foreground">Lead detail</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span>{(lead.email as string) || DASH}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{phone || DASH}</span>
              {phoneIso && (
                <span className="text-xs text-muted-foreground">
                  {flagEmoji(phoneIso)} {phoneIso}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="uppercase">{(lead.preferred_language as string) || DASH}</span>
            </div>
            <div>
              <Badge variant="outline" className="capitalize">
                {((lead.interest as string) || 'general').replace(/-/g, ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-base">Capture metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Captured at</div>
              {created ? (
                <>
                  <div className="font-medium">{created.local}</div>
                  <div className="text-xs text-muted-foreground">{created.utc}</div>
                </>
              ) : (
                DASH
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Source</div>
              <Badge variant="secondary" className="text-[10px]">
                {(lead.source as string) || 'direct'}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Conversation ID</div>
              <ConversationLink
                conversationId={(lead.conversation_id as string | null) ?? null}
                source={(lead.source as string | null) ?? null}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Client metadata
            </CardTitle>
            <CardDescription>
              Browser/network signals captured at submission. Voice-agent leads come from a
              server-to-server webhook, so most fields here will be empty for them.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">IP address</div>
              <div className="font-mono">{ip || DASH}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Country</div>
              <div>
                {country ? (
                  <>
                    <span className="mr-1">{flagEmoji(country)}</span>
                    {country}
                    {continent ? (
                      <span className="ml-2 text-xs text-muted-foreground">{continent}</span>
                    ) : null}
                  </>
                ) : (
                  DASH
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">City / region</div>
              <div>
                {city || region ? (
                  <>
                    {city || ''}
                    {city && region ? ', ' : ''}
                    {region || ''}
                  </>
                ) : (
                  DASH
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Postal code / timezone</div>
              <div>
                {postal || tz ? (
                  <>
                    {postal || ''}
                    {postal && tz ? ' · ' : ''}
                    {tz || ''}
                  </>
                ) : (
                  DASH
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Coordinates</div>
              <div>
                {typeof lat === 'number' && typeof lon === 'number' ? (
                  <span className="font-mono text-xs">
                    {lat.toFixed(4)}, {lon.toFixed(4)}
                  </span>
                ) : (
                  DASH
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Map</div>
              <MapLink
                latitude={lat}
                longitude={lon}
                city={city}
                region={region}
                country={country}
              />
              {!googleMapsUrl({
                latitude: lat,
                longitude: lon,
                city,
                region,
                country,
              }) && DASH}
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground">User-Agent</div>
              <div className="font-mono text-xs break-all">{ua || DASH}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Accept-Language</div>
              <div className="text-xs">{acceptLang || DASH}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Referrer</div>
              <div className="text-xs break-all">{referrer || DASH}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Consent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md bg-muted/50 p-3 text-xs italic">
              "{(lead.consent_text as string) || '(no consent text recorded)'}"
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Given at</div>
              {consented ? (
                <>
                  <div className="font-medium">{consented.local}</div>
                  <div className="text-xs text-muted-foreground">{consented.utc}</div>
                </>
              ) : (
                DASH
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
