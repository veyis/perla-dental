import { tool } from 'ai'
import { z } from 'zod'

export const submitLeadParams = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^\+?[\d\s()-]{7,}$/, 'phone must contain at least 7 digits'),
  email: z.string().email(),
  chronicIllnesses: z.string().nullable(),
  interest: z.enum(['implants', 'veneers', 'all-on-4', 'all-on-6', 'smile-makeover', 'other']),
  preferredLanguage: z.enum(['en', 'tr', 'ru', 'de']),
  consentGiven: z.literal(true),
})

export const escalateEmergencyParams = z.object({
  summary: z.string().min(5),
  contactInfo: z.string().nullable(),
})

export type SubmitLeadInput = z.infer<typeof submitLeadParams>
export type EscalateEmergencyInput = z.infer<typeof escalateEmergencyParams>

export type ProposeLeadResult = {
  status: 'pending_consent'
  fields: SubmitLeadInput
  fingerprint: string
}

export type ToolDeps = {
  /**
   * Returns a signed envelope for the user-facing consent card. Does NOT
   * write the lead. The actual write happens at /api/lead/submit after the
   * user clicks "Send to clinic".
   */
  onProposeLead: (input: SubmitLeadInput) => Promise<ProposeLeadResult>
  onEscalateEmergency: (input: EscalateEmergencyInput) => Promise<{ ack: true }>
}

export function buildTools(deps: ToolDeps) {
  return {
    submitLead: tool({
      description:
        'Propose a lead for the user to confirm. Call ONLY when all required fields (full name, phone, email, interest, preferredLanguage) are gathered AND chronic-illness disclosure has been asked. consentGiven must be true. The clinic CRM is written ONLY after the user clicks the consent card the client renders from your tool result — do not assume the lead is saved until you receive a follow-up user message confirming submission.',
      inputSchema: submitLeadParams,
      execute: async (input) => deps.onProposeLead(input),
    }),
    escalateEmergency: tool({
      description:
        'Trigger when the patient describes acute pain, swelling, bleeding, or any condition requiring urgent care. Provide a concise English summary.',
      inputSchema: escalateEmergencyParams,
      execute: async (input) => deps.onEscalateEmergency(input),
    }),
  }
}
