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
      'Modern biocompatible titanium or zirconia screw-shaped fixtures placed into the jawbone to replace tooth roots. Healing (osseointegration) takes 3-6 months. Brands: Straumann (Roxolid Active, Neodent), Megagen, Nobel Biocare, DXL.',
    startingPrice:
      '£400 (Megagen Anyone), £430 (Straumann Neodent), £780 (Straumann Roxolid Active)',
  },
  {
    id: 'all-on-4',
    name: 'All-on-4 Dental Implants',
    description:
      'A full-arch fixed bridge supported by four implant posts, often eliminating the need for bone grafting. Includes consultation, X-ray, 4 Neodent implants, and 12 Zirconia crowns.',
    startingPrice: 'Package deals available including hotel and VIP transfer.',
  },
  {
    id: 'all-on-6',
    name: 'All-on-6 Dental Implants',
    description:
      'Like All-on-4 but with six implants per jaw for better load distribution and stability. Includes 6 Neodent implants and 12 Zirconia crowns.',
    startingPrice: 'Package deals available including hotel and VIP transfer.',
  },
  {
    id: 'smile-makeover',
    name: 'Smile Makeover & Veneers',
    description:
      'Cosmetic techniques including E-max veneers (porcelain, transparent), Zirconium veneers/crowns (durable, opaque, Hollywood Smile), Laminate veneers (ultra-thin), and Composite Bonding (fast, minimally invasive).',
    startingPrice:
      'Zirconia Crown: £150, E-Max Crown/Veneer: £220, Laminate Veneer: £220, Composite Bonding: £90',
  },
  {
    id: 'general-dentistry',
    name: 'General & Preventive Care',
    description:
      'Teeth whitening, root canal treatment, extractions, deep cleaning, and white fillings.',
    startingPrice:
      'Whitening: £150, Root Canal: £80, Extraction: £40, Deep Cleaning: £60, Filling: £50',
  },
] as const

export const DOCTORS = [
  {
    name: 'Dr. Onur Ademhan',
    role: 'Founder & Maxillofacial Surgeon',
    bio: 'Expert in implantology, orthognathic surgery, bone grafting, and zygomatic implants.',
  },
  {
    name: 'Dr. Eldar Aydınlı',
    role: 'Orthodontist',
    bio: 'Specializes in facial harmony and dental biomechanics for adults and children.',
  },
  {
    name: 'Dr. Ali Acar',
    role: 'Aesthetic Dentist',
    bio: 'Expert in aesthetic restorative techniques and fixed prosthetic solutions.',
  },
  {
    name: 'Dr. Seda Geniş',
    role: 'Aesthetic Dentist',
    bio: 'Focuses on smile design, E-max laminate veneers, and composite bonding.',
  },
  {
    name: 'Dr. Ramazan Emre Bahşi',
    role: 'Aesthetic Dentist',
    bio: 'Combines clinical precision with aesthetic sensibility for personalized smiles.',
  },
  {
    name: 'Dr. Ibrahim Alkan',
    role: 'Prosthodontist',
    bio: 'Specialist in prosthetic dentistry and full mouth reconstructions.',
  },
  {
    name: 'Dr. Diana Gadzhaeva',
    role: 'General Dentist',
    bio: 'Comprehensive dental care and preventive treatments.',
  },
  {
    name: 'Dr. Arda Ertürk',
    role: 'Aesthetic Dentist',
    bio: 'Specialist in high-quality cosmetic dentistry and smile design.',
  },
  {
    name: 'Dr. Doğukan Kılıçkap',
    role: 'Aesthetic Dentist',
    bio: 'Focuses on aesthetic goals and modern restorative techniques.',
  },
  {
    name: 'Dr. Enes Afaruz',
    role: 'Dental Surgeon',
    bio: 'Expert in surgical procedures and oral health maintenance.',
  },
  {
    name: 'Dr. Serra Kadıoğlu',
    role: 'General Dentist',
    bio: 'Focuses on patient comfort and comprehensive dental health.',
  },
  {
    name: 'Dr. Mustafa Polat',
    role: 'Endodontist',
    bio: 'Specialist in root canal treatments and saving natural teeth.',
  },
  {
    name: 'Dr. Yusuf Al Gabri',
    role: 'Aesthetic Dentist',
    bio: 'Personalized aesthetic treatments and smile makeovers.',
  },
  {
    name: 'Dr. İlhan Altınsoy',
    role: 'Prosthodontist',
    bio: 'Expert in fixed and removable prostheses.',
  },
  {
    name: 'Dr. Mehmet Kılınçaslan',
    role: 'Periodontist',
    bio: 'Specialist in gum disease and periodontal health.',
  },
] as const

export const DENTAL_HOLIDAY = {
  description:
    'All-inclusive packages include dental treatments, panoramic X-Rays, 3D tomography, premium hotel accommodation, and free VIP transfers (Airport-Hotel-Clinic). Save up to 70% compared to UK/USA prices.',
}

export function formatKnowledge(): string {
  const treatments = TREATMENTS.map(
    (t) => `- **${t.name}**: ${t.description} (Starting from: ${t.startingPrice})`,
  ).join('\n')
  const doctors = DOCTORS.map((d) => `- **${d.name}** (${d.role}): ${d.bio}`).join('\n')
  return `
# Clinic Information
- **Name**: ${CLINIC.name}
- **Location**: ${CLINIC.location}
- **Hours**: ${CLINIC.hours}
- **Phone**: ${CLINIC.phone} | **Email**: ${CLINIC.email}
- **Credentials**: ${CLINIC.credentials}

# Treatments & Pricing
${treatments}

# Dental Holiday (All-Inclusive)
${DENTAL_HOLIDAY.description}

# Our Medical Team
${doctors}
`.trim()
}
