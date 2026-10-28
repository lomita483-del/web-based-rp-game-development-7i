import { and, desc, eq, gt } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { playerPresence } from '@/lib/db/schema'
import { getAuthenticatedGameUser } from '@/lib/game/auth'
import { PRIVATE_NO_STORE_HEADERS, readJsonBody } from '@/lib/game/http'
import { isRecord } from '@/lib/game/validation'
import type { PresenceUpdate } from '@/lib/game/types'

const ROOM_ID = 'eko-mainland'
const ACTIVE_WINDOW_MS = 30_000
const POSITION_LIMITS = { minX: -82, maxX: 82, minZ: -82, maxZ: 78 } as const

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to join the shared city.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
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
      .where(and(eq(playerPresence.roomId, ROOM_ID), gt(playerPresence.updatedAt, activeAfter)))
      .orderBy(desc(playerPresence.updatedAt))
      .limit(24)

    return NextResponse.json(
      {
        players: players.map((player) => ({ ...player, updatedAt: player.updatedAt.toISOString() })),
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

    const body = await readJsonBody(request)
    if (!isRecord(body) || typeof body.x !== 'number' || typeof body.z !== 'number' || typeof body.inVehicle !== 'boolean') {
      return NextResponse.json({ error: 'The player position is not valid.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    if (!Number.isFinite(body.x) || !Number.isFinite(body.z)) {
      return NextResponse.json({ error: 'The player position is not valid.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const position: PresenceUpdate = {
      x: Math.max(POSITION_LIMITS.minX, Math.min(POSITION_LIMITS.maxX, body.x)),
      z: Math.max(POSITION_LIMITS.minZ, Math.min(POSITION_LIMITS.maxZ, body.z)),
      inVehicle: body.inVehicle,
    }
    const updatedAt = new Date()

    await db
      .insert(playerPresence)
      .values({
        userId: user.id,
        roomId: ROOM_ID,
        displayName: user.name,
        ...position,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: playerPresence.userId,
        set: {
          roomId: ROOM_ID,
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
