// lib/notifications.ts
// Helper to create notifications from any API route
// Usage: await createNotification(supabase, { session_id, type, title, body, ... })

import { SupabaseClient } from '@supabase/supabase-js'

type NotificationType =
  | 'foresight_correct'
  | 'foresight_incorrect'
  | 'streak_milestone'
  | 'rank_up'
  | 'achievement_unlock'
  | 'challenge_complete'
  | 'daily_chest'
  | 'welcome'
  | 'system'

type CreateNotificationParams = {
  session_id: string
  type: NotificationType
  title: string
  body?: string
  icon?: string
  color?: string
  metadata?: Record<string, any>
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  const { error } = await supabase.from('notifications').insert({
    session_id: params.session_id,
    type: params.type,
    title: params.title,
    body: params.body || null,
    icon: params.icon || null,
    color: params.color || null,
    metadata: params.metadata || {},
  })

  if (error) {
    console.error('Failed to create notification:', error.message)
  }
}

// ── Pre-built notification creators ─────────────────────────

export async function notifyForesightResult(
  supabase: SupabaseClient,
  sessionId: string,
  isCorrect: boolean,
  urlTitle: string,
  points: number,
  gold: number,
  urlId: string,
  userReaction: string,
  consensus: string
) {
  await createNotification(supabase, {
    session_id: sessionId,
    type: isCorrect ? 'foresight_correct' : 'foresight_incorrect',
    title: isCorrect ? 'Prediction correct!' : 'Prediction missed',
    body: isCorrect
      ? `Your early reaction on "${urlTitle}" matched the crowd. +${points} Spark +${gold} Gold`
      : `Your reaction on "${urlTitle}" didn't match consensus. ${points} Spark`,
    icon: isCorrect ? '🔮' : '❌',
    color: isCorrect ? '#a78bfa' : '#ef4444',
    metadata: { url_id: urlId, points, gold, user_reaction: userReaction, consensus, source: 'foresight' },
  })
}

export async function notifyStreakMilestone(
  supabase: SupabaseClient,
  sessionId: string,
  streak: number
) {
  // Only notify at milestones: 3, 5, 7, 10, 14, 20, 30, 50, 100
  const milestones = [3, 5, 7, 10, 14, 20, 30, 50, 100]
  if (!milestones.includes(streak)) return

  await createNotification(supabase, {
    session_id: sessionId,
    type: 'streak_milestone',
    title: `${streak}-day streak!`,
    body: streak >= 20
      ? `Incredible — ${streak} days of discovery. You're on fire!`
      : `You've been discovering for ${streak} days straight. Keep it up!`,
    icon: '🔥',
    color: '#f59e0b',
    metadata: { streak },
  })
}

export async function notifyRankUp(
  supabase: SupabaseClient,
  sessionId: string,
  newRank: string,
  totalPoints: number
) {
  const rankConfig: Record<string, { icon: string; color: string }> = {
    explorer:  { icon: '🧭', color: '#5E9ABB' },
    pioneer:   { icon: '🔭', color: '#60a5fa' },
    curator:   { icon: '✨', color: '#a78bfa' },
    visionary: { icon: '👁️', color: '#f472b6' },
    legend:    { icon: '👑', color: '#d4af37' },
  }

  const config = rankConfig[newRank] || { icon: '⬆️', color: '#828D98' }

  await createNotification(supabase, {
    session_id: sessionId,
    type: 'rank_up',
    title: `Rank up: ${newRank.charAt(0).toUpperCase() + newRank.slice(1)}!`,
    body: `You've earned ${totalPoints.toLocaleString()} Spark and reached ${newRank.charAt(0).toUpperCase() + newRank.slice(1)} rank.`,
    icon: config.icon,
    color: config.color,
    metadata: { rank: newRank, total_points: totalPoints },
  })
}
