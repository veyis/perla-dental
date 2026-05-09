import { Resend } from 'resend'
import { env } from '@/lib/env'

let _client: Resend | null = null
function client(): Resend {
  if (!_client) {
    _client = new Resend(env.RESEND_API_KEY)
  }
  return _client
}

export async function sendEmail(args: {
  to: string
  from: string
  subject: string
  text: string
  replyTo?: string
}) {
  const { data, error } = await client().emails.send({
    to: args.to,
    from: args.from,
    subject: args.subject,
    text: args.text,
    replyTo: args.replyTo,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
  return { id: data?.id ?? 'unknown' }
}
