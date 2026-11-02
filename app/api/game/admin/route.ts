import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { ensureAdminTables } from '@/lib/game/admin'
import { getAuthenticatedGameUser } from '@/lib/game/auth'
import { PRIVATE_NO_STORE_HEADERS, readJsonBody } from '@/lib/game/http'
import { isRecord } from '@/lib/game/validation'
import type { AdminOverview, AdminPlayerRow } from '@/lib/game/types'

export const runtime = 'nodejs'

const ACTIVE_WINDOW_SECONDS = 30
const MAX_CASH = 1_000_000

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
}

async function requireAdmin(request: Request) {
  const user = await getAuthenticatedGameUser(request)
  if (!user) return { error: fail('Sign in first.', 401) }
  if (!user.isAdmin) return { error: fail('Admin access is required.', 403) }
  return { user }
}

async function log(adminId: string, action: string, target: string | null, detail: unknown) {
  await pool.query('insert into eko_admin_log ("adminId", action, target, detail) values ($1, $2, $3, $4)', [adminId, action, target, JSON.stringify(detail ?? {})])
}

export async function GET(request: Request) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return error
    await ensureAdminTables()

    const players = await pool.query<{
      userId: string
      name: string
      lastSeen: Date | null
      x: number | null
      z: number | null
      online: boolean
      cash: string | null
      mutedUntil: Date | null
      bannedUntil: Date | null
    }>(
      `select u.id as "userId", u.name, coalesce(p."updatedAt", s."updatedAt") as "lastSeen", p.x, p.z,
              (p."updatedAt" is not null and p."updatedAt" > now() - make_interval(secs => $1)) as online,
              s."playerState"->>'cash' as cash, f."mutedUntil", f."bannedUntil"
       from "user" u
       left join eko_player_presence p on p."userId" = u.id
       left join eko_game_saves s on s."userId" = u.id
       left join eko_admin_flags f on f."userId" = u.id
       order by online desc, "lastSeen" desc nulls last
       limit 60`,
      [ACTIVE_WINDOW_SECONDS],
    )
    const now = Date.now()
    const rows: AdminPlayerRow[] = players.rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      online: row.online,
      x: row.x,
      z: row.z,
      cash: row.cash === null ? null : Number(row.cash),
      muted: Boolean(row.mutedUntil && row.mutedUntil.getTime() > now),
      banned: Boolean(row.bannedUntil && row.bannedUntil.getTime() > now),
      lastSeen: row.lastSeen ? row.lastSeen.toISOString() : null,
    }))
    const chat = await pool.query<{ id: string; displayName: string; message: string; createdAt: Date }>(
      `select id, "displayName", message, "createdAt" from eko_room_messages order by "createdAt" desc limit 30`,
    )
    const logRows = await pool.query<{ id: string; action: string; target: string | null; createdAt: Date }>(
      `select id, action, target, "createdAt" from eko_admin_log order by "createdAt" desc limit 20`,
    )
    const announcement = await pool.query<{ id: string; message: string; createdAt: Date }>(
      `select id, message, "createdAt" from eko_admin_announcements order by "createdAt" desc limit 1`,
    )
    const body: AdminOverview = {
      players: rows,
      chat: chat.rows.reverse().map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      log: logRows.rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      announcement: announcement.rows[0]
        ? { ...announcement.rows[0], createdAt: announcement.rows[0].createdAt.toISOString() }
        : null,
    }
    return NextResponse.json(body, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    console.error('[game] Admin overview failed', error)
    return fail('Unable to load the admin overview.', 500)
  }
}

async function queueCommand(adminId: string, userId: string, type: string, payload: Record<string, unknown>) {
  await pool.query('insert into eko_admin_commands ("userId", type, payload, "createdBy") values ($1, $2, $3, $4)', [userId, type, JSON.stringify(payload), adminId])
}

function readInt(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max ? value : null
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
}

export async function POST(request: Request) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return error
    await ensureAdminTables()

    const body = await readJsonBody(request)
    if (!isRecord(body) || typeof body.action !== 'string') return fail('Send a valid admin action.', 400)
    const action = body.action
    const target = typeof body.userId === 'string' ? body.userId.slice(0, 128) : null

    const needsTarget = ['mute', 'unmute', 'ban', 'unban', 'kick', 'give-cash', 'heal', 'teleport', 'notify'].includes(action)
    if (needsTarget) {
      if (!target) return fail('Choose a player first.', 400)
      const exists = await pool.query('select 1 from "user" where id = $1', [target])
      if (exists.rowCount === 0) return fail('That player does not exist.', 404)
      if (target === user.id && ['mute', 'ban', 'kick'].includes(action)) return fail('You cannot do that to yourself.', 400)
    }

    switch (action) {
      case 'announce': {
        const message = cleanText(body.message, 200)
        if (!message) return fail('Write an announcement of 1–200 characters.', 400)
        await pool.query('insert into eko_admin_announcements (message, "createdBy") values ($1, $2)', [message, user.id])
        await log(user.id, 'announce', null, { message })
        break
      }
      case 'mute': {
        const minutes = readInt(body.minutes, 1, 60 * 24 * 14)
        if (!minutes || !target) return fail('Choose a mute length between 1 minute and 14 days.', 400)
        await pool.query(
          `insert into eko_admin_flags ("userId", "mutedUntil") values ($1, now() + make_interval(mins => $2))
           on conflict ("userId") do update set "mutedUntil" = excluded."mutedUntil", "updatedAt" = now()`,
          [target, minutes],
        )
        await queueCommand(user.id, target!, 'notify', { message: `You have been muted for ${minutes} minute${minutes === 1 ? '' : 's'}.` })
        await log(user.id, 'mute', target, { minutes })
        break
      }
      case 'unmute': {
        await pool.query(`update eko_admin_flags set "mutedUntil" = null, "updatedAt" = now() where "userId" = $1`, [target])
        await log(user.id, 'unmute', target, {})
        break
      }
      case 'ban':
      case 'kick': {
        const minutes = action === 'kick' ? 5 : readInt(body.minutes, 1, 60 * 24 * 365)
        if (!minutes || !target) return fail('Choose a ban length between 1 minute and 365 days.', 400)
        await pool.query(
          `insert into eko_admin_flags ("userId", "bannedUntil") values ($1, now() + make_interval(mins => $2))
           on conflict ("userId") do update set "bannedUntil" = excluded."bannedUntil", "updatedAt" = now()`,
          [target, minutes],
        )
        await pool.query('delete from eko_player_presence where "userId" = $1', [target])
        await queueCommand(user.id, target!, 'kick', { message: action === 'kick' ? 'An admin removed you from the city for a few minutes.' : 'You have been banned from the city.' })
        await log(user.id, action, target, { minutes })
        break
      }
      case 'unban': {
        await pool.query(`update eko_admin_flags set "bannedUntil" = null, "updatedAt" = now() where "userId" = $1`, [target])
        await log(user.id, 'unban', target, {})
        break
      }
      case 'give-cash': {
        const amount = readInt(body.amount, -MAX_CASH, MAX_CASH)
        if (amount === null || amount === 0) return fail('Enter a cash amount between -1,000,000 and 1,000,000.', 400)
        await queueCommand(user.id, target!, 'give-cash', { amount })
        await log(user.id, 'give-cash', target, { amount })
        break
      }
      case 'heal': {
        await queueCommand(user.id, target!, 'heal', {})
        await log(user.id, 'heal', target, {})
        break
      }
      case 'teleport': {
        const x = typeof body.x === 'number' && Number.isFinite(body.x) ? Math.max(-144, Math.min(82, body.x)) : null
        const z = typeof body.z === 'number' && Number.isFinite(body.z) ? Math.max(-82, Math.min(78, body.z)) : null
        if (x === null || z === null) return fail('Teleport needs valid coordinates.', 400)
        await queueCommand(user.id, target!, 'teleport', { x, z })
        await log(user.id, 'teleport', target, { x, z })
        break
      }
      case 'notify': {
        const message = cleanText(body.message, 160)
        if (!message) return fail('Write a message of 1–160 characters.', 400)
        await queueCommand(user.id, target!, 'notify', { message })
        await log(user.id, 'notify', target, { message })
        break
      }
      case 'set-time': {
        const minutes = readInt(body.minutes, 0, 24 * 60 - 1)
        if (minutes === null) return fail('Choose a time of day.', 400)
        const online = await pool.query<{ userId: string }>(
          `select "userId" from eko_player_presence where "updatedAt" > now() - make_interval(secs => $1)`,
          [ACTIVE_WINDOW_SECONDS],
        )
        for (const row of online.rows) await queueCommand(user.id, row.userId, 'set-time', { minutes })
        await log(user.id, 'set-time', null, { minutes, players: online.rowCount })
        break
      }
      case 'clear-chat': {
        await pool.query('delete from eko_room_messages')
        await log(user.id, 'clear-chat', null, {})
        break
      }
      case 'delete-message': {
        const id = typeof body.id === 'string' ? body.id : ''
        if (!/^[0-9a-f-]{36}$/i.test(id)) return fail('That message id is not valid.', 400)
        await pool.query('delete from eko_room_messages where id = $1', [id])
        await log(user.id, 'delete-message', id, {})
        break
      }
      default:
        return fail('Unknown admin action.', 400)
    }
    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    console.error('[game] Admin action failed', error)
    return fail('The admin action could not be completed.', 500)
  }
}
