import { and, desc, eq, gt, inArray } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { playerPresence, user as userTable } from '@/lib/db/schema'
import { getPlayerFlags, isAdminEmail } from '@/lib/game/admin'
import { getAuthenticatedGameUser } from '@/lib/game/auth'
import { PRIVATE_NO_STORE_HEADERS, readJsonBody } from '@/lib/game/http'
import { isInteriorId } from '@/components/game/game-data'
import { isRecord } from '@/lib/game/validation'
import type { PresenceUpdate } from '@/lib/game/types'

const DEFAULT_ROOM_ID = 'eko-mainland'
const ACTIVE_WINDOW_MS = 30_000
const POSITION_LIMITS = { minX: -145, maxX: 82, minZ: -82, maxZ: 78 } as const

function parseRoomId(value: unknown): string | null {
  if (value === undefined || value === null) return DEFAULT_ROOM_ID
  if (typeof value !== 'string') return null
  if (value === DEFAULT_ROOM_ID) return value
  if (value.startsWith('interior:') && isInteriorId(value.slice('interior:'.length))) return value
  return null
}

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to join the shared city.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const requestedRoomId = new URL(request.url).searchParams.get('roomId')
    const roomId = requestedRoomId?.startsWith('home:')
      ? (requestedRoomId === `home:${user.id}` ? requestedRoomId : null)
      : parseRoomId(requestedRoomId)
    if (!roomId) {
      return NextResponse.json({ error: 'That shared-world room does not exist.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const activeAfter = new Date(Date.now() - ACTIVE_WINDOW_MS)
    const players = await db
      .select({
        userId: playerPresence.userId,
        displayName: playerPresence.displayName,
        x: playerPresence.x,
        z: playerPresence.z,
        inVehicle: playerPresence.inVehicle,
        updatedAt: playerPresence.updatedAt,
      })
      .from(playerPresence)
      .where(and(eq(playerPresence.roomId, roomId), gt(playerPresence.updatedAt, activeAfter)))
      .orderBy(desc(playerPresence.updatedAt))
      .limit(24)

    const emails = players.length > 0
      ? await db.select({ id: userTable.id, email: userTable.email }).from(userTable).where(inArray(userTable.id, players.map((player) => player.userId)))
      : []
    const adminIds = new Set(emails.filter((entry) => isAdminEmail(entry.email)).map((entry) => entry.id))

    return NextResponse.json(
      {
        players: players.map((player) => ({ ...player, isAdmin: adminIds.has(player.userId), updatedAt: player.updatedAt.toISOString() })),
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[game] Presence read failed', error)
    return NextResponse.json(
      { error: 'Unable to connect to the shared city right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to join the shared city.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const flags = await getPlayerFlags(user.id)
    if (flags.banned) {
      return NextResponse.json({ error: 'You are banned from the shared city.' }, { status: 403, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const body = await readJsonBody(request)
    if (!isRecord(body) || typeof body.x !== 'number' || typeof body.z !== 'number' || typeof body.inVehicle !== 'boolean') {
      return NextResponse.json({ error: 'The player position is not valid.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const roomId = typeof body.roomId === 'string' && body.roomId.startsWith('home:')
      ? (body.roomId === `home:${user.id}` ? body.roomId : null)
      : parseRoomId(body.roomId)
    if (!roomId) {
      return NextResponse.json({ error: 'That shared-world room does not exist.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    if (!Number.isFinite(body.x) || !Number.isFinite(body.z)) {
      return NextResponse.json({ error: 'The player position is not valid.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const position: PresenceUpdate = {
      x: Math.max(POSITION_LIMITS.minX, Math.min(POSITION_LIMITS.maxX, body.x)),
      z: Math.max(POSITION_LIMITS.minZ, Math.min(POSITION_LIMITS.maxZ, body.z)),
      inVehicle: body.inVehicle,
      roomId,
    }
    const updatedAt = new Date()

    await db
      .insert(playerPresence)
      .values({
        userId: user.id,
        displayName: user.name,
        ...position,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: playerPresence.userId,
        set: {
          displayName: user.name,
          ...position,
          updatedAt,
        },
      })

    return NextResponse.json({ online: true }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    console.error('[game] Presence write failed', error)
    return NextResponse.json(
      { error: 'Unable to update your shared-city position right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to leave the shared city.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    await db.delete(playerPresence).where(eq(playerPresence.userId, user.id))
    return NextResponse.json({ online: false }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    console.error('[game] Presence leave failed', error)
    return NextResponse.json(
      { error: 'Unable to leave the shared city right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}
