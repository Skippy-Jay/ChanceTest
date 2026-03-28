// lib/rateLimit.ts
// Upstash Redis rate limiter using REST API (no SDK dependency)
// Sliding window counters per session + IP, per-minute / per-hour / per-day

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!

// Rate limits per action type
// perMinute / perHour / perDay
const RATE_LIMITS: Record<string, { perMinute: number; perHour: number; perDay: number }> = {
  reaction:    { perMinute: 15, perHour: 120, perDay: 500 },
  save:        { perMinute: 10, perHour: 60,  perDay: 200 },
  share:       { perMinute: 5,  perHour: 30,  perDay: 100 },
  dead_report: { perMinute: 3, perHour: 999999, perDay: 999999 },
  submission:  { perMinute: 10, perHour: 999999, perDay: 999999 },
}

const DEFAULT_LIMITS = { perMinute: 30, perHour: 200, perDay: 500 }

// ── Redis REST helper ──────────────────────────────────────
async function redisCommand(command: string[]): Promise<any> {
  const res = await fetch(`${UPSTASH_REDIS_REST_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) {
    console.error('Redis error:', res.status, await res.text())
    return null
  }
  const data = await res.json()
  return data.result
}

// Pipeline: send multiple commands in one request
async function redisPipeline(commands: string[][]): Promise<any[]> {
  const res = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })
  if (!res.ok) {
    console.error('Redis pipeline error:', res.status, await res.text())
    return []
  }
  const data = await res.json()
  return data.map((r: any) => r.result)
}

// ── Sliding window rate limiter ────────────────────────────
// Uses sorted sets with timestamp scores for precise sliding windows
// Key format: rl:{identifier}:{action}:{window}

export async function checkRateLimit(
  sessionId: string,
  action: string,
  ip?: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // If Redis isn't configured, fall through (don't block users)
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return { allowed: true }
  }

  const limits = RATE_LIMITS[action] || DEFAULT_LIMITS
  const now = Date.now()
  const memberId = `${now}:${Math.random().toString(36).slice(2, 8)}`

  // Check session-based limits
  const sessionAllowed = await checkSlidingWindow(
    `rl:${sessionId}:${action}`,
    limits,
    now,
    memberId
  )

  if (!sessionAllowed.allowed) return sessionAllowed

  // If IP provided, also check IP-based limits (looser — 3x session limits)
  if (ip) {
    const ipLimits = {
      perMinute: limits.perMinute * 3,
      perHour: limits.perHour * 3,
      perDay: limits.perDay * 3,
    }
    const ipAllowed = await checkSlidingWindow(
      `rl:ip:${ip}:${action}`,
      ipLimits,
      now,
      memberId
    )
    if (!ipAllowed.allowed) return ipAllowed
  }

  return { allowed: true }
}

async function checkSlidingWindow(
  keyPrefix: string,
  limits: { perMinute: number; perHour: number; perDay: number },
  now: number,
  memberId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const minuteKey = `${keyPrefix}:min`
  const hourKey = `${keyPrefix}:hr`
  const dayKey = `${keyPrefix}:day`

  const minuteAgo = now - 60_000
  const hourAgo = now - 3_600_000
  const dayAgo = now - 86_400_000

  try {
    // Single pipeline: clean expired + count current for all 3 windows
    const results = await redisPipeline([
      // Clean expired entries
      ['ZREMRANGEBYSCORE', minuteKey, '0', String(minuteAgo)],
      ['ZREMRANGEBYSCORE', hourKey, '0', String(hourAgo)],
      ['ZREMRANGEBYSCORE', dayKey, '0', String(dayAgo)],
      // Count current entries
      ['ZCARD', minuteKey],
      ['ZCARD', hourKey],
      ['ZCARD', dayKey],
    ])

    if (results.length < 6) return { allowed: true } // Redis issue, fail open

    const [, , , minuteCount, hourCount, dayCount] = results

    // Check limits
    if (minuteCount >= limits.perMinute) {
      return { allowed: false, retryAfter: 60 }
    }
    if (hourCount >= limits.perHour) {
      return { allowed: false, retryAfter: 3600 }
    }
    if (dayCount >= limits.perDay) {
      return { allowed: false, retryAfter: 86400 }
    }

    // All good — record this action in all 3 windows
    await redisPipeline([
      ['ZADD', minuteKey, String(now), `${memberId}:min`],
      ['ZADD', hourKey, String(now), `${memberId}:hr`],
      ['ZADD', dayKey, String(now), `${memberId}:day`],
      // Set TTLs so keys auto-expire and don't fill Redis
      ['EXPIRE', minuteKey, '120'],
      ['EXPIRE', hourKey, '7200'],
      ['EXPIRE', dayKey, '172800'],
    ])

    return { allowed: true }
  } catch (err) {
    console.error('Rate limit check failed:', err)
    return { allowed: true } // Fail open — don't block users if Redis is down
  }
}

// ── Helper: get remaining quota (for UI display) ───────────
export async function getRemainingQuota(
  sessionId: string,
  action: string
): Promise<{ minute: number; hour: number; day: number }> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    const limits = RATE_LIMITS[action] || DEFAULT_LIMITS
    return { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay }
  }

  const limits = RATE_LIMITS[action] || DEFAULT_LIMITS
  const now = Date.now()
  const keyPrefix = `rl:${sessionId}:${action}`

  try {
    const results = await redisPipeline([
      ['ZCOUNT', `${keyPrefix}:min`, String(now - 60_000), String(now)],
      ['ZCOUNT', `${keyPrefix}:hr`, String(now - 3_600_000), String(now)],
      ['ZCOUNT', `${keyPrefix}:day`, String(now - 86_400_000), String(now)],
    ])

    return {
      minute: Math.max(0, limits.perMinute - (results[0] || 0)),
      hour: Math.max(0, limits.perHour - (results[1] || 0)),
      day: Math.max(0, limits.perDay - (results[2] || 0)),
    }
  } catch {
    return { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay }
  }
}
