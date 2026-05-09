'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { VoiceCall } from './voice-call'
import { Persona } from '@/components/ai-elements'
import { useRef } from 'react'
import { Star, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import type { Locale } from '@/i18n/config'

interface HeroProps {
  title: string
  subtitle: string
  status: string
  locale: Locale
}

export function Hero({ title, subtitle, status, locale }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  
  // Parallax effects
  const y1 = useTransform(scrollY, [0, 500], [0, 100])
  const y2 = useTransform(scrollY, [0, 500], [0, -150])

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden bg-[#fafafa]">
      {/* Dynamic Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-highlight/10 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-accent/40 rounded-full blur-[80px]" />
      </div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#1e5f74 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      <div className="container mx-auto px-6 relative">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          
          {/* Content Side */}
          <div className="lg:col-span-7 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white shadow-premium border border-black/5"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-accent overflow-hidden">
                    <Image src={`/images/smile.png`} alt="Patient" width={24} height={24} className="object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-highlight text-highlight" />)}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted ml-1">Trusted by 5k+ Patients</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-6xl md:text-8xl font-heading font-bold mb-8 leading-[0.95] tracking-tight"
            >
              {title.split('—').map((part, i) => (
                <span key={i} className="block">
                  {i === 1 ? <span className="text-gradient italic font-normal serif">{part}</span> : part}
                </span>
              ))}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-text-muted mb-12 leading-relaxed max-w-xl font-medium"
            >
              {subtitle}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap items-center gap-8"
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-highlight to-primary-light rounded-full blur opacity-20 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <VoiceCall locale={locale} />
              </div>
              
              <div className="flex items-center gap-5 p-5 pr-8 rounded-[2rem] glass border border-white/50 shadow-premium hover:shadow-2xl transition-all duration-500 cursor-pointer group">
                <div className="relative">
                  <Persona state={status === 'streaming' ? 'thinking' : 'idle'} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-primary group-hover:translate-x-1 transition-transform">AI Health Concierge</p>
                  <p className="text-sm text-text-muted">Available 24/7 for you</p>
                </div>
              </div>
            </motion.div>

            {/* Micro USP list */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="mt-16 flex gap-10 opacity-60"
            >
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight uppercase">
                <ShieldCheck className="w-4 h-4 text-primary" /> Specialist Care
              </div>
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight uppercase">
                <Zap className="w-4 h-4 text-highlight" /> Instant Support
              </div>
            </motion.div>
          </div>

          {/* Visual Side */}
          <div className="lg:col-span-5 relative h-full">
            <motion.div 
              style={{ y: y1 }}
              className="relative aspect-[4/5] w-full"
            >
              {/* Main Image Container */}
              <div className="relative h-full w-full rounded-[60px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.15)] group">
                <Image 
                  src="/images/hero.png" 
                  alt="Premium Dental Clinic" 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-[2s]"
                  priority
                  loading="eager"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                
                {/* Image Overlay Label */}
                <div className="absolute bottom-10 left-10 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1 opacity-80">Antalya, Turkey</p>
                  <p className="text-2xl font-heading font-medium">Lara Elite District</p>
                </div>
              </div>
              
              {/* Floating Technology Card */}
              <motion.div 
                style={{ y: y2 }}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                className="absolute -right-12 top-1/4 glass p-8 rounded-[40px] shadow-premium max-w-[280px] border border-white/60"
              >
                <div className="w-14 h-14 rounded-2xl bg-highlight/10 flex items-center justify-center text-highlight mb-6">
                  <Zap className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">AI-Driven Precision</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  We use the latest digital scanning and 3D imaging technology for perfect results.
                </p>
                <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm">
                  Explore Tech <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>

              {/* Floating Reviews Card */}
              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-16 -bottom-10 glass px-10 py-8 rounded-[40px] shadow-premium border border-white/60 hidden xl:block"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                       <Star className="w-8 h-8 fill-highlight text-highlight" />
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-heading font-bold">4.9/5</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Global Rating</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
