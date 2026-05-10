'use client'

import { motion } from 'framer-motion'
import { Clock, Shield, Sparkles } from 'lucide-react'
import Image from 'next/image'

const services = [
  {
    title: 'Cosmetic Dentistry',
    description:
      'Transform your smile with porcelain veneers, professional whitening, and aesthetic bonding.',
    icon: Sparkles,
    image: '/images/smile.png',
  },
  {
    title: 'Modern Technology',
    description:
      'Experience painless treatments with our state-of-the-art digital scanners and 3D imaging.',
    icon: Shield,
    image: '/images/tech.png',
  },
  {
    title: 'Preventive Care',
    description:
      'Maintain a lifetime of oral health with comprehensive cleanings and personalized dental plans.',
    icon: Clock,
    image: '/images/hero.png',
  },
]

export function Services() {
  return (
    <section id="services" className="py-24 bg-accent/10">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-heading font-bold mb-6"
          >
            World-Class Care, <br />
            <span className="text-primary">Tailored to You</span>
          </motion.h2>
          <p className="text-text-muted text-lg">
            We combine art and science to create beautiful smiles and ensure optimal oral health
            using the most advanced techniques available today.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="group bg-white rounded-[32px] p-8 shadow-sm hover:shadow-premium transition-all duration-500 border border-transparent hover:border-primary/10"
            >
              <div className="relative h-48 w-full mb-8 rounded-2xl overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-heading font-bold mb-4">{service.title}</h3>
              <p className="text-text-muted leading-relaxed mb-6">{service.description}</p>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
              >
                Learn More <span className="text-xl">→</span>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
