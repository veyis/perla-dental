import pino, { type Logger } from 'pino'

let cached: Logger | null = null

export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop: string) {
    if (!cached) {
      cached = pino({
        level: process.env.LOG_LEVEL ?? 'info',
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
    }
    return Reflect.get(cached, prop)
  },
})
