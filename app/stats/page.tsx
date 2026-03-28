'use client'
// Chance Stats — Disabled (redirects to feed)

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StatsPage() {
  const router = useRouter()
  useEffect(() => { router.push('/') }, [router])
  return null
}
