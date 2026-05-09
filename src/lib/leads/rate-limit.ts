import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

let _redis: Redis | null = null
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

const LIMIT = 3
const WINDOW_SECONDS = 60 * 60

export async function allowLead(ip: string): Promise<boolean> {
  const key = `rl:lead:${ip}`
  const r = redis()
  const count = await r.incr(key)
  if (count === 1) {
    await r.expire(key, WINDOW_SECONDS)
  }
  return count <= LIMIT
}
