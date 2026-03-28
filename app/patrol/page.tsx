'use client'
// Chance Patrol — Disabled (redirects to feed)

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PatrolPage() {
  const router = useRouter()
  useEffect(() => { router.push('/') }, [router])
  return null
}
