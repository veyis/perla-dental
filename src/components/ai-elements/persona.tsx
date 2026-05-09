'use client'

import { motion, AnimatePresence } from 'framer-motion'

type State = 'idle' | 'listening' | 'thinking' | 'speaking'

export function Persona({ state = 'idle' }: { state?: State }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Background Aura */}
      <AnimatePresence>
        {state !== 'idle' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.2 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            className={`absolute inset-0 rounded-full blur-2xl ${
              state === 'listening' ? 'bg-primary' : 
              state === 'thinking' ? 'bg-highlight' : 
              'bg-primary-light'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Main Persona Body */}
      <motion.div
        animate={state !== 'idle' ? {
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`
          relative w-16 h-16 rounded-[2rem] shadow-premium transition-all duration-500
          ${state === 'idle' ? 'bg-gradient-to-br from-accent to-white scale-90' : ''}
          ${state === 'listening' ? 'bg-gradient-to-br from-primary to-primary-light scale-100 ring-4 ring-primary/20' : ''}
          ${state === 'thinking' ? 'bg-gradient-to-br from-highlight to-accent scale-100 ring-4 ring-highlight/20' : ''}
          ${state === 'speaking' ? 'bg-gradient-to-br from-primary-light to-highlight scale-110 ring-4 ring-primary/20' : ''}
        `}
      >
        {/* Inner Glow */}
        <div className="absolute inset-2 rounded-[1.5rem] bg-white/20 blur-sm" />
        
        {/* Eyes/Indicator */}
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          <motion.div 
            animate={state === 'thinking' ? { opacity: [0.3, 1, 0.3] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            className={`w-2 h-2 rounded-full ${state === 'idle' ? 'bg-primary/20' : 'bg-white'}`} 
          />
          <motion.div 
            animate={state === 'thinking' ? { opacity: [0.3, 1, 0.3] } : {}}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            className={`w-2 h-2 rounded-full ${state === 'idle' ? 'bg-primary/20' : 'bg-white'}`} 
          />
        </div>
      </motion.div>
    </div>
  )
}
