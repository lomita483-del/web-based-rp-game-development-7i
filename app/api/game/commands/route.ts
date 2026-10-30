import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { ensureAdminTables, getPlayerFlags } from '@/lib/game/admin'
import { getAuthenticatedGameUser } from '@/lib/game/auth'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/game/http'
import type { CommandsResponse, PendingCommand } from '@/lib/game/types'

export const runtime = 'nodejs'

/** Players poll this for admin actions aimed at them (teleport, cash, notices) and the latest city announcement. */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    await ensureAdminTables()

    const consumed = await pool.query<{ id: string; type: PendingCommand['type']; payload: Record<string, unknown> }>(
      `update eko_admin_commands set "consumedAt" = now()
       where id in (select id from eko_admin_commands where "userId" = $1 and "consumedAt" is null order by "createdAt" asc limit 10)
       returning id, type, payload`,
      [user.id],
    )
    const announcementRows = await pool.query<{ id: string; message: string; createdAt: Date }>(
      `select id, message, "createdAt" from eko_admin_announcements where "createdAt" > now() - interval '10 minutes' order by "createdAt" desc limit 1`,
    )
    const flags = await getPlayerFlags(user.id)
    const latest = announcementRows.rows[0]
    const body: CommandsResponse = {
      commands: consumed.rows.map((row) => ({ id: row.id, type: row.type, payload: row.payload })),
      announcement: latest ? { id: latest.id, message: latest.message, createdAt: latest.createdAt.toISOString() } : null,
      muted: flags.muted,
      banned: flags.banned,
    }
    return NextResponse.json(body, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    console.error('[game] Command poll failed', error)
    return NextResponse.json({ error: 'Unable to check for city notices.' }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
