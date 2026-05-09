'use client'

type State = 'idle' | 'listening' | 'thinking' | 'speaking'

const COLORS: Record<State, string> = {
  idle: 'bg-gradient-to-br from-accent to-surface',
  listening: 'bg-gradient-to-br from-primary to-accent animate-pulse',
  thinking: 'bg-gradient-to-br from-highlight to-accent animate-pulse',
  speaking: 'bg-gradient-to-br from-primary to-highlight animate-pulse',
}

export function Persona({ state = 'idle' }: { state?: State }) {
  return <div className={`w-32 h-32 rounded-full ${COLORS[state]} shadow-lg`} aria-hidden />
}
