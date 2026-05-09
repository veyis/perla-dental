'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

const highlights = [
  'Over 15 years of dental excellence',
  'Specialized in complex aesthetic restorations',
  'Bilingual staff (English, Turkish, Russian, German)',
  'Award-winning patient care and comfort',
]

export function About() {
  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative h-[600px] rounded-[40px] overflow-hidden shadow-premium">
              <Image
                src="/images/tech.png"
                alt="Our Technology"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            {/* Experience Badge */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="absolute -bottom-8 -right-8 glass p-8 rounded-3xl shadow-premium border border-white/40"
            >
              <p className="text-4xl font-heading font-bold text-primary">15+</p>
              <p className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                Years Experience
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-8">
              Why Patients Choose <br />
              <span className="text-primary text-gradient">Perla Dental Clinics</span>
            </h2>
            <p className="text-lg text-text-muted mb-10 leading-relaxed">
              Located in the heart of Lara, Antalya, we provide a world-class dental experience that
              combines advanced Turkish hospitality with cutting-edge German and American medical
              standards. Our mission is to make your "Dental Holiday" as seamless and comfortable as
              possible.
            </p>

            <ul className="space-y-4 mb-10">
              {highlights.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-lg font-medium"
                >
                  <CheckCircle2 className="text-primary w-6 h-6" />
                  {item}
                </motion.li>
              ))}
            </ul>

            <button className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary-light transition-all">
              Meet Our Specialists
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
