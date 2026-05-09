export const CLINIC = {
  name: 'Perla Dental Clinics',
  location: 'Lara Caddesi, 1964. Sk. No:7, Lara / Antalya, Turkey',
  hours: 'Monday-Friday 09:00-18:00, Saturday 09:00-17:30, Sunday closed',
  phone: '+90 534 226 60 59',
  email: 'info@perladentalclinics.com',
  founder: 'Oral and Maxillofacial Surgeon Dr. Onur Ademhan',
  credentials:
    'Approved by the Turkish Ministry of Health and Ministry of Culture and Tourism, ISO 9001 certified',
} as const

export const TREATMENTS = [
  {
    id: 'implants',
    name: 'Dental Implants',
    description:
      'Modern biocompatible titanium or zirconia screw-shaped fixtures placed into the jawbone to replace tooth roots. Healing (osseointegration) takes 3-6 months.',
  },
  {
    id: 'all-on-4',
    name: 'All-on-4 Dental Implants',
    description:
      'A full-arch fixed bridge supported by four implant posts, with posterior implants placed at an angle to use denser jawbone, often eliminating the need for bone grafting. Immediate-load: implants and temporary bridges placed in a single day.',
  },
  {
    id: 'all-on-6',
    name: 'All-on-6 Dental Implants',
    description:
      'Like All-on-4 but with six implants per jaw. Better load distribution, greater long-term stability, restoration up to the 7th molars. Ideal for patients with good bone quality.',
  },
  {
    id: 'smile-makeover',
    name: 'Smile Makeover & Veneers',
    description:
      'Cosmetic techniques to repair cracks, reshape teeth, create balanced natural-looking smiles. Includes E-max veneers (porcelain, transparent), Zirconium veneers/crowns (durable, opaque, popular for Hollywood Smile), Laminate veneers (ultra-thin, preserves enamel), and Composite Bonding (faster, minimally invasive).',
  },
] as const

export const DOCTORS = [
  {
    name: 'Dr. Onur Ademhan',
    role: 'Founder & Chief Physician — Oral and Maxillofacial Surgeon',
    bio: 'Graduated from Ankara University (2006); specialization at Gazi University (2013). Expert in implantology, orthognathic surgery, impacted tooth extractions, bone grafting, zygomatic implants, immediate loading protocols.',
  },
  {
    name: 'Dr. Eldar Aydınlı',
    role: 'Orthodontist',
    bio: '25+ years clinical experience. Specializes in facial harmony and dental biomechanics for adults and children.',
  },
  {
    name: 'Dr. Ali Acar',
    role: 'Aesthetic Dentist',
    bio: 'Aesthetic restorative techniques and fixed prosthetic solutions. Personalized treatment processes per clinical condition.',
  },
  {
    name: 'Dr. Seda Geniş',
    role: 'Aesthetic Dentist',
    bio: 'Blends clinical precision with artistic vision. Minimally invasive methods, E-max laminate veneers, smile design, composite bonding.',
  },
  {
    name: 'Dr. Ramazan Emre Bahşi',
    role: 'Aesthetic Dentist',
    bio: 'Procedures harmonizing clinical acuity with aesthetic sensibility.',
  },
  {
    name: 'Dr. Doğukan Kılıçkap',
    role: 'Aesthetic Dentist',
    bio: 'High-quality cosmetic dentistry, smile design, personalized aesthetic goals.',
  },
  {
    name: 'Dr. Yusuf Al Gabri',
    role: 'Aesthetic Dentist',
    bio: 'High-quality cosmetic dentistry, smile design, personalized aesthetic goals.',
  },
] as const

export const DENTAL_HOLIDAY = {
  description:
    'Treatment packages for international patients include the dental treatments, panoramic X-Rays, 3D Dental tomography, all-inclusive hotel accommodation, and free VIP transfers between airport, hotel, and clinic.',
}

export function formatKnowledge(): string {
  const treatments = TREATMENTS.map((t) => `- **${t.name}** — ${t.description}`).join('\n')
  const doctors = DOCTORS.map((d) => `- **${d.name}** (${d.role}): ${d.bio}`).join('\n')
  return `
# Clinic
- Name: ${CLINIC.name}
- Location: ${CLINIC.location}
- Hours: ${CLINIC.hours}
- Phone: ${CLINIC.phone} · Email: ${CLINIC.email}
- Founder: ${CLINIC.founder}
- Credentials: ${CLINIC.credentials}

# Treatments
${treatments}

# Dental Holiday
${DENTAL_HOLIDAY.description}

# Doctors
${doctors}
`.trim()
}
