'use client'

import type { ReactNode } from 'react'

export function Conversation({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3" role="log" aria-live="polite">
      {children}
    </div>
  )
}
