'use client'

import type { ReactNode } from 'react'

type Role = 'user' | 'assistant' | 'system'

export function Message({ role, children }: { role: Role; children?: ReactNode }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? 'bg-primary text-white' : 'bg-accent text-text'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
