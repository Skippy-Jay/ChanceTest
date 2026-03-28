import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Tables that use session_id and need migration
const SESSION_TABLES = [
  { table: 'points_ledger', column: 'session_id' },
  { table: 'patrol_verifications', column: 'session_id' },
  { table: 'url_events', column: 'session_id' },
  { table: 'dead_reports', column: 'session_id' },
  { table: 'reaction_accuracy', column: 'session_id' },
]

// Tables that use user_id instead of session_id
const USER_TABLES = [
  { table: 'vault_saves', column: 'user_id' },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { oldSessionId, newUserId } = body

    if (!oldSessionId || !newUserId) {
      return NextResponse.json({ error: 'Missing oldSessionId or newUserId' }, { status: 400 })
    }

    // Safety: don't migrate if old and new are the same
    if (oldSessionId === newUserId) {
      return NextResponse.json({ error: 'Old and new IDs are identical — nothing to migrate' }, { status: 400 })
    }

    // Check if this new user has already been migrated
    const { data: existingStats } = await supabase
      .from('user_stats')
      .select('total_points, session_id')
      .eq('session_id', newUserId)
      .single()

    // Check if the old session actually has data
    const { data: oldStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('session_id', oldSessionId)
      .single()

    if (!oldStats) {
      return NextResponse.json({
        success: true,
        message: 'No old data found to migrate',
        migrated: { tables: 0, rows: 0 },
      })
    }

    const results: { table: string; rows: number }[] = []

    // Migrate session_id tables
    for (const { table, column } of SESSION_TABLES) {
      try {
        // Count existing rows first
        const { count: rowCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(column, oldSessionId)

        if (rowCount && rowCount > 0) {
          const { error } = await supabase
            .from(table)
            .update({ [column]: newUserId })
            .eq(column, oldSessionId)

          if (error) {
            console.error(`Migration error on ${table}:`, error)
            results.push({ table, rows: 0 })
          } else {
            results.push({ table, rows: rowCount })
          }
        } else {
          results.push({ table, rows: 0 })
        }
      } catch (err) {
        console.error(`Migration error on ${table}:`, err)
        results.push({ table, rows: 0 })
      }
    }

    // Migrate user_id tables
    for (const { table, column } of USER_TABLES) {
      try {
        const { count: rowCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(column, oldSessionId)

        if (rowCount && rowCount > 0) {
          const { error } = await supabase
            .from(table)
            .update({ [column]: newUserId })
            .eq(column, oldSessionId)

          if (error) {
            console.error(`Migration error on ${table}:`, error)
            results.push({ table, rows: 0 })
          } else {
            results.push({ table, rows: rowCount })
          }
        } else {
          results.push({ table, rows: 0 })
        }
      } catch (err) {
        console.error(`Migration error on ${table}:`, err)
        results.push({ table, rows: 0 })
      }
    }

    // Merge user_stats: combine old stats into new account
    if (oldStats) {
      if (existingStats) {
        // New account already has some stats — merge by adding old values
        const { error } = await supabase
          .from('user_stats')
          .update({
            total_points: (existingStats.total_points || 0) + (oldStats.total_points || 0),
            current_streak: Math.max(oldStats.current_streak || 0, existingStats.total_points > 0 ? (existingStats as any).current_streak || 0 : 0),
            longest_streak: Math.max(oldStats.longest_streak || 0, (existingStats as any).longest_streak || 0),
            total_reactions: (oldStats.total_reactions || 0) + ((existingStats as any).total_reactions || 0),
            total_mindblown: (oldStats.total_mindblown || 0) + ((existingStats as any).total_mindblown || 0),
            total_yawn: (oldStats.total_yawn || 0) + ((existingStats as any).total_yawn || 0),
            total_saves: (oldStats.total_saves || 0) + ((existingStats as any).total_saves || 0),
            total_shares: (oldStats.total_shares || 0) + ((existingStats as any).total_shares || 0),
            accurate_reactions: (oldStats.accurate_reactions || 0) + ((existingStats as any).accurate_reactions || 0),
            nickname: oldStats.nickname || (existingStats as any).nickname || null,
            rank: oldStats.rank || 'newcomer',
            updated_at: new Date().toISOString(),
          })
          .eq('session_id', newUserId)

        if (!error) {
          // Delete the old user_stats row
          await supabase.from('user_stats').delete().eq('session_id', oldSessionId)
          results.push({ table: 'user_stats', rows: 1 })
        }
      } else {
        // No new stats yet — just reassign the old row
        const { error } = await supabase
          .from('user_stats')
          .update({ session_id: newUserId, updated_at: new Date().toISOString() })
          .eq('session_id', oldSessionId)

        if (!error) {
          results.push({ table: 'user_stats', rows: 1 })
        }
      }

      // Recalculate rank based on merged total
      const { data: finalStats } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('session_id', newUserId)
        .single()

      if (finalStats) {
        const pts = finalStats.total_points || 0
        let rank = 'newcomer'
        if (pts >= 10000) rank = 'legend'
        else if (pts >= 5000) rank = 'pioneer'
        else if (pts >= 1000) rank = 'curator'
        else if (pts >= 200) rank = 'explorer'
        await supabase.from('user_stats').update({ rank }).eq('session_id', newUserId)
      }
    }

    const totalRows = results.reduce((sum, r) => sum + r.rows, 0)
    const tablesAffected = results.filter(r => r.rows > 0).length

    return NextResponse.json({
      success: true,
      message: `Migration complete! ${totalRows} records moved across ${tablesAffected} tables.`,
      migrated: { tables: tablesAffected, rows: totalRows, details: results },
    })
  } catch (err: any) {
    console.error('Migration API error:', err)
    return NextResponse.json({ error: 'Migration failed: ' + err.message }, { status: 500 })
  }
}
