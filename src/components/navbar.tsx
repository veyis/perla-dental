'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { LanguageSwitcher } from './language-switcher'

export function Navbar({ locale }: { locale: Locale }) {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass px-6 py-4 flex justify-between items-center"
    >
      <Link href={`/${locale}`} className="flex items-center" aria-label="Perla Dental Clinics">
        <Image
          src="/images/perla-logo.svg"
          alt="Perla Dental Clinics"
          width={140}
          height={32}
          priority
          className="h-8 w-auto md:h-9"
        />
      </Link>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#services" className="hover:text-primary transition-colors">
          Services
        </a>
        <a href="#about" className="hover:text-primary transition-colors">
          About
        </a>
        <a href="#contact" className="hover:text-primary transition-colors">
          Contact
        </a>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher current={locale} />
        <motion.a
          href="#contact"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-primary text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-primary-light transition-all shadow-md"
        >
          Book Now
        </motion.a>
      </div>
    </motion.nav>
  )
}
