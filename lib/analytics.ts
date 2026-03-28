import posthog from 'posthog-js'

// Initialize PostHog — call this once on app load
export function initAnalytics() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return // Already initialized

  posthog.init('phc_MXOYbCWRCKexb5WfJr4CAgNJOah0LFbrwbrcpiGYYHw', {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // We'll track events manually for precision
    persistence: 'localStorage',
    loaded: (ph) => {
      // In development/staging, optionally enable debug
      if (window.location.hostname === 'chance-staging.netlify.app') {
        ph.debug()
      }
    },
  })
}

// Identify a logged-in user (call after auth login)
export function identifyUser(userId: string, email?: string) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, {
    email: email || undefined,
  })
}

// Reset identity on logout
export function resetAnalytics() {
  if (typeof window === 'undefined') return
  posthog.reset()
}

// ============================================================
// Event tracking functions — every meaningful user action
// ============================================================

// User rolled for a new URL
export function trackRoll(urlId: number, category?: string | null) {
  posthog.capture('roll', {
    url_id: urlId,
    category: category || 'unknown',
  })
}

// User reacted to a URL
export function trackReaction(urlId: number, reaction: string, category?: string | null) {
  posthog.capture('reaction', {
    url_id: urlId,
    reaction_type: reaction,
    category: category || 'unknown',
  })
}

// User saved a URL
export function trackSave(urlId: number, category?: string | null) {
  posthog.capture('save', {
    url_id: urlId,
    category: category || 'unknown',
  })
}

// User shared a URL
export function trackShare(urlId: number, category?: string | null) {
  posthog.capture('share', {
    url_id: urlId,
    category: category || 'unknown',
  })
}

// User reported a URL as dead (from main feed)
export function trackDeadReport(urlId: number) {
  posthog.capture('dead_report', {
    url_id: urlId,
  })
}

// User clicked through to visit a URL
export function trackVisit(urlId: number, url: string, category?: string | null) {
  posthog.capture('visit', {
    url_id: urlId,
    url: url,
    category: category || 'unknown',
  })
}

// Patrol: user opened a URL for verification
export function trackPatrolCheck(urlId: number) {
  posthog.capture('patrol_check', {
    url_id: urlId,
  })
}

// Patrol: user gave a verdict
export function trackPatrolVerdict(urlId: number, verdict: string) {
  posthog.capture('patrol_verdict', {
    url_id: urlId,
    verdict: verdict,
  })
}

// Patrol: user categorized a URL
export function trackPatrolCategorize(urlId: number, category: string) {
  posthog.capture('patrol_categorize', {
    url_id: urlId,
    category: category,
  })
}

// Patrol: user skip-deleted a URL
export function trackPatrolDelete(urlId: number) {
  posthog.capture('patrol_delete', {
    url_id: urlId,
  })
}

// User signed up
export function trackSignup(userId: string, email: string) {
  posthog.capture('signup', {
    user_id: userId,
    email: email,
  })
}

// User logged in
export function trackLogin(userId: string, email: string) {
  posthog.capture('login', {
    user_id: userId,
    email: email,
  })
}

// User migrated old data
export function trackMigration(oldSessionId: string, newUserId: string, rowsMigrated: number) {
  posthog.capture('data_migration', {
    old_session_id: oldSessionId,
    new_user_id: newUserId,
    rows_migrated: rowsMigrated,
  })
}

// Session start — called when feed loads
export function trackSessionStart(isAuthenticated: boolean) {
  posthog.capture('session_start', {
    authenticated: isAuthenticated,
  })
}

// Time spent on a URL before reacting (in seconds)
export function trackTimeOnUrl(urlId: number, seconds: number) {
  posthog.capture('time_on_url', {
    url_id: urlId,
    seconds: seconds,
  })
}
