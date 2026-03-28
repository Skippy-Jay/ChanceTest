'use client'

import { useEffect, useRef, ReactNode } from 'react'
import { initAnalytics } from '@/lib/analytics'
import * as Sentry from '@sentry/browser'

interface AnalyticsProviderProps {
  children: ReactNode
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const sentryInitialized = useRef(false)

  useEffect(() => {
    initAnalytics()

    if (!sentryInitialized.current) {
      sentryInitialized.current = true
      Sentry.init({
        dsn: 'https://b9dc2483a59fba23d811ce6b1ffae8c7@o4510985433645056.ingest.de.sentry.io/4510985442230352',
        tracesSampleRate: 1.0,
        environment: window.location.hostname === 'chanceapp.io'
          ? 'production'
          : 'staging',
        beforeSend(event) {
          if (
            event.exception?.values?.some(
              (v) =>
                v.type === 'SecurityError' &&
                v.value?.includes('replaceState')
            )
          ) {
            return null
          }
          return event
        },
      })
    }
  }, [])

  return <>{children}</>
}
