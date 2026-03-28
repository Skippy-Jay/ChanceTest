'use client'
/**
 * GoldTickUp
 * Animates a number counting up from `from` to `to`.
 * Extracted from feed page.tsx v40.7.
 */

import { useState, useEffect } from 'react'

interface GoldTickUpProps {
  from: number
  to: number
}

export default function GoldTickUp({ from, to }: GoldTickUpProps) {
  var [display, setDisplay] = useState(from)
  useEffect(function () {
    var diff = to - from
    if (diff <= 0) { setDisplay(to); return }
    var steps = Math.min(diff, 15); var step = 0
    var interval = setInterval(function () {
      step++
      var progress = step / steps
      var eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + diff * eased))
      if (step >= steps) { clearInterval(interval); setDisplay(to) }
    }, 60)
    return function () { clearInterval(interval) }
  }, [from, to])
  return <>{display}</>
}
