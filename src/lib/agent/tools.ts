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

export const escalateToHumanParams = z.object({
  reason: z.string().min(3),
  contactInfo: z.string().nullable(),
})

export type SubmitLeadInput = z.infer<typeof submitLeadParams>
export type EscalateEmergencyInput = z.infer<typeof escalateEmergencyParams>
export type EscalateToHumanInput = z.infer<typeof escalateToHumanParams>

/**
 * Discriminated tool result. The chat path defers writes to the user
 * confirmation card and returns `pending_consent`. The voice path
 * obtains verbal consent in-call and writes immediately, returning
 * `saved` so the model knows the row is already on disk.
 */
export type ProposeLeadResult =
  | { status: 'pending_consent'; fields: SubmitLeadInput; fingerprint: string }
  | { status: 'saved'; fields: SubmitLeadInput; leadId: string }

export type ToolDeps = {
  /**
   * Chat path: returns a signed envelope for the user-facing consent card
   * (does NOT write — write happens at /api/lead/submit after the user
   * clicks "Send to clinic").
   * Voice path: writes immediately with verbal consent and returns `saved`.
   */
  onProposeLead: (input: SubmitLeadInput) => Promise<ProposeLeadResult>
  onEscalateEmergency: (input: EscalateEmergencyInput) => Promise<{ ack: true }>
  onEscalateToHuman: (input: EscalateToHumanInput) => Promise<{ ack: true }>
}

export function buildTools(deps: ToolDeps) {
  return {
    submitLead: tool({
      description:
        'Save the patient lead. Call ONLY when full name, phone, email, treatment interest and preferredLanguage are gathered, the chronic-illness disclosure has been asked, AND the patient has explicitly agreed to be contacted (consentGiven=true). On voice calls the lead is written immediately and you should briefly confirm and move to closing. On chat the result will indicate the patient still needs to confirm via a consent card; in that case ask them to review and confirm before declaring the lead saved.',
      inputSchema: submitLeadParams,
      execute: async (input) => deps.onProposeLead(input),
    }),
    escalateEmergency: tool({
      description:
        'Trigger when the caller describes a clinical emergency: severe facial swelling with fever, uncontrolled bleeding, jaw trauma, or difficulty breathing or swallowing. After calling, advise the caller to go to their nearest emergency room or call their local emergency number, capture name and phone only, and end the call gently. Provide a concise English summary.',
      inputSchema: escalateEmergencyParams,
      execute: async (input) => deps.onEscalateEmergency(input),
    }),
    escalateToHuman: tool({
      description:
        'Trigger when the caller explicitly asks to speak with a person, expresses sustained frustration, or asks something clearly outside your knowledge. Provide a short English reason and the best contact info you have (phone or email). After calling, tell the caller a medical consultant will reach out directly and end warmly.',
      inputSchema: escalateToHumanParams,
      execute: async (input) => deps.onEscalateToHuman(input),
    }),
  }
}
