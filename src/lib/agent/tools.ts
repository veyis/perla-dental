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

export type ToolDeps = {
  onSubmitLead: (input: SubmitLeadInput) => Promise<{ leadId: string }>
  onEscalateEmergency: (input: EscalateEmergencyInput) => Promise<{ ack: true }>
}

export function buildTools(deps: ToolDeps) {
  return {
    submitLead: tool({
      description:
        'Save patient contact info to the clinic CRM. Call ONLY after collecting all required fields AND receiving explicit consent in the conversation. consentGiven must be true.',
      inputSchema: submitLeadParams,
      execute: async (input) => deps.onSubmitLead(input),
    }),
    escalateEmergency: tool({
      description:
        'Trigger when the patient describes acute pain, swelling, bleeding, or any condition requiring urgent care. Provide a concise English summary.',
      inputSchema: escalateEmergencyParams,
      execute: async (input) => deps.onEscalateEmergency(input),
    }),
  }
}
