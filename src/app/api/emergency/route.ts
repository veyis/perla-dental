import { audit } from '@/lib/observability/audit'
import { logger } from '@/lib/observability/logger'

export const maxDuration = 15

type ElevenLabsEmergencyBody = {
  phone?: string
  fullName?: string
  symptomsDescribed?: string
  conversation_id?: string
}

export async function POST(req: Request): Promise<Response> {
  let body: ElevenLabsEmergencyBody
  try {
    body = (await req.json()) as ElevenLabsEmergencyBody
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.symptomsDescribed) {
    return Response.json({ error: 'symptomsDescribed is required' }, { status: 400 })
  }

  const conversationId = body.conversation_id ?? `voice-emergency-${Date.now()}`

  logger.warn(
    {
      conversationId,
      phone: body.phone,
      name: body.fullName,
      symptoms: body.symptomsDescribed,
    },
    'EMERGENCY ESCALATION',
  )

  await audit({
    kind: 'emergency_escalated',
    conversationId,
    summary: `${body.fullName ?? 'Unknown'} | ${body.phone ?? 'no phone'} | ${body.symptomsDescribed}`,
  })

  return Response.json({ ack: true })
}
