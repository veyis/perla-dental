import type { Locale } from '@/i18n/config'

export type EmailTo = {
  fullName: string
  phone: string
  email: string
  preferredLanguage: Locale
  interest: string
  chronicIllnesses: string | null
  summary?: string
  leadId: string
  consentText: string
  consentGivenAt: string
}

const LANG_GREETING: Record<Locale, string> = {
  en: 'English speaker',
  tr: 'Turkish speaker',
  ru: 'Russian speaker',
  de: 'German speaker',
}

export function renderClinicEmail(lead: EmailTo) {
  const subject = `🦷 New Perla Lead: ${lead.fullName} — ${lead.interest} (${lead.preferredLanguage.toUpperCase()})`
  const text = `
PATIENT
  ${lead.fullName}
  📞 ${lead.phone}
  ✉️  ${lead.email}
  🌍 ${LANG_GREETING[lead.preferredLanguage]}

INTEREST
  ${lead.interest}

HEALTH (chronic / medications)
  ${lead.chronicIllnesses ?? '(none disclosed)'}

AI SUMMARY
  ${lead.summary ?? '(no summary)'}

CONSENT
  Given ${lead.consentGivenAt}
  "${lead.consentText}"

Reply to this email to contact the patient directly.
Lead ID: ${lead.leadId}
`.trim()
  return {
    subject,
    text,
    replyTo: lead.email,
  }
}

const PATIENT_THANKS: Record<Locale, { subject: string; text: (name: string) => string }> = {
  en: {
    subject: 'Thank you — Perla Dental Clinics',
    text: (name) =>
      `Dear ${name},\n\nThank you for reaching out to Perla Dental Clinics. Our medical team has received your details and will contact you within 24 hours.\n\n— Perla Dental Clinics`,
  },
  tr: {
    subject: 'Teşekkürler — Perla Diş Klinikleri',
    text: (name) =>
      `Sayın ${name},\n\nPerla Diş Klinikleri ile iletişime geçtiğiniz için teşekkür ederiz. Medikal ekibimiz bilgilerinizi aldı ve 24 saat içinde sizinle iletişime geçecektir.\n\n— Perla Diş Klinikleri`,
  },
  ru: {
    subject: 'Спасибо — Perla Dental Clinics',
    text: (name) =>
      `Уважаемый(ая) ${name},\n\nСпасибо, что обратились в Perla Dental Clinics. Наша медицинская команда получила ваши данные и свяжется с вами в течение 24 часов.\n\n— Perla Dental Clinics`,
  },
  de: {
    subject: 'Vielen Dank — Perla Dental Clinics',
    text: (name) =>
      `Sehr geehrte(r) ${name},\n\nVielen Dank für Ihre Anfrage bei Perla Dental Clinics. Unser medizinisches Team hat Ihre Daten erhalten und wird sich innerhalb von 24 Stunden bei Ihnen melden.\n\n— Perla Dental Clinics`,
  },
}

export function renderPatientEmail(lead: EmailTo) {
  const t = PATIENT_THANKS[lead.preferredLanguage]
  return { subject: t.subject, text: t.text(lead.fullName) }
}
