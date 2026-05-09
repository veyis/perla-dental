import pino from 'pino'
import { env } from '@/lib/env'

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'fullName',
      'phone',
      'email',
      'chronicIllnesses',
      '*.fullName',
      '*.phone',
      '*.email',
      '*.chronicIllnesses',
    ],
    censor: '[REDACTED]',
  },
})
