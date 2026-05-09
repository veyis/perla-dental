'use client'

import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react'

export function Contact() {
  return (
    <section id="contact" className="py-24 bg-accent/5">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto glass rounded-[50px] shadow-premium overflow-hidden border border-white/40">
          <div className="grid lg:grid-cols-2">
            {/* Contact Info */}
            <div className="p-12 lg:p-20 bg-white">
              <h2 className="text-4xl font-heading font-bold mb-8">Plan Your Visit</h2>
              <p className="text-text-muted mb-12 text-lg">
                Ready for your transformation? Get in touch with our bilingual coordinators for a free consultation and personalized travel plan.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold mb-1">Call / WhatsApp</p>
                    <a href="tel:+905342266059" className="text-xl hover:text-primary transition-colors">+90 534 226 60 59</a>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold mb-1">Our Clinic</p>
                    <p className="text-text-muted">Lara Caddesi, 1964. Sk. No:7, <br/>Lara / Antalya, Turkey</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold mb-1">Working Hours</p>
                    <p className="text-text-muted">Mon - Sat: 09:00 - 19:00 <br/>Sunday: Emergency Only</p>
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t flex gap-4">
                <button className="flex-1 px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-light transition-all">
                  Book Now
                </button>
                <button className="flex-1 px-8 py-4 bg-accent border border-primary/20 text-primary rounded-2xl font-bold hover:bg-white transition-all">
                  Get Free Quote
                </button>
              </div>
            </div>

            {/* Map Placeholder / Visual */}
            <div className="relative min-h-[400px] bg-primary/5 p-12 lg:p-20 flex flex-col justify-center items-center text-center overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                {/* SVG Pattern for map feeling */}
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,50 Q25,0 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  <path d="M0,30 Q25,80 50,30 T100,30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white mb-6 mx-auto shadow-xl animate-bounce">
                  <MapPin className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-4">Visit Us in Sunny Antalya</h3>
                <p className="text-text-muted mb-8 max-w-sm mx-auto">
                  Combine your treatment with a vacation in Turkey's most beautiful coastal city.
                </p>
                <button className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                  Open in Google Maps <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              
              {/* Floating Cities Decor */}
              <div className="absolute top-10 left-10 text-[10px] uppercase tracking-widest text-primary/40 font-bold">Berlin</div>
              <div className="absolute bottom-10 right-10 text-[10px] uppercase tracking-widest text-primary/40 font-bold">London</div>
              <div className="absolute top-1/2 right-10 text-[10px] uppercase tracking-widest text-primary/40 font-bold">Moscow</div>
              <div className="absolute bottom-1/3 left-10 text-[10px] uppercase tracking-widest text-primary/40 font-bold">Dubai</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
