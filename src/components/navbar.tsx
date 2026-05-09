'use client'

import { LanguageSwitcher } from './language-switcher'
import { motion } from 'framer-motion'
import type { Locale } from '@/i18n/config'

export function Navbar({ locale }: { locale: Locale }) {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass px-6 py-4 flex justify-between items-center"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-heading font-bold">P</span>
        </div>
        <span className="font-heading text-xl font-semibold tracking-tight">Perla Dental</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#services" className="hover:text-primary transition-colors">Services</a>
        <a href="#about" className="hover:text-primary transition-colors">About</a>
        <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
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
