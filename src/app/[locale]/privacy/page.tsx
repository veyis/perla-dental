export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-neutral-500">
        This page is currently available in English only. Translations are coming soon.
      </p>
      <h1>Privacy Policy</h1>
      <p>Effective date: 2026-05-08</p>
      <h2>Data We Collect</h2>
      <p>
        When you submit a lead, we collect: full name, phone, email, language preference, treatment
        interest, and any chronic illness or medication you disclose.
      </p>
      <h2>Lawful Basis</h2>
      <p>
        GDPR Article 6(1)(a) consent + Article 9(2)(a) explicit consent for health data. Turkish
        KVKK consent.
      </p>
      <h2>Sub-processors</h2>
      <ul>
        <li>Vercel (hosting)</li>
        <li>Anthropic (LLM)</li>
        <li>Deepgram (speech-to-text)</li>
        <li>ElevenLabs (text-to-speech)</li>
        <li>Google (Sheets storage)</li>
        <li>Resend (email delivery)</li>
        <li>Upstash (rate-limit cache)</li>
      </ul>
      <h2>Retention</h2>
      <p>Lead records retained for 24 months, then archived.</p>
      <h2>Your Rights</h2>
      <p>
        You may request deletion at any time by emailing{' '}
        <a href="mailto:info@perladentalclinics.com">info@perladentalclinics.com</a>.
      </p>
    </article>
  )
}
