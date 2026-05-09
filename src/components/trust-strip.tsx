'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ShieldCheck, Award, Users, Phone, MapPin } from 'lucide-react'

export function TrustStrip() {
  const t = useTranslations('trust')
  const f = useTranslations('footer')

  return (
    <footer className="bg-white border-t py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{t('ministry')}</p>
              <p className="text-xs text-text-muted">Certified Excellence</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{t('iso')}</p>
              <p className="text-xs text-text-muted">International Standards</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{t('specialists', { count: 7 })}</p>
              <p className="text-xs text-text-muted">Elite Professionals</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{f('phone')}</p>
              <p className="text-xs text-text-muted">24/7 Priority Support</p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{f('address')}</span>
          </div>
          <div className="flex gap-8">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <span>© 2024 Perla Dental Clinic. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
