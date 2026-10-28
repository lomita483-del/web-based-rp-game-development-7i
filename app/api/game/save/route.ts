import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { gameSaves } from '@/lib/db/schema'
import { getAuthenticatedGameUser } from '@/lib/game/auth'
import { PRIVATE_NO_STORE_HEADERS, readJsonBody } from '@/lib/game/http'
import { parseGameSavePayload } from '@/lib/game/validation'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to access your save.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const [save] = await db
      .select()
      .from(gameSaves)
      .where(eq(gameSaves.userId, user.id))
      .limit(1)

    return NextResponse.json(
      {
        save: save
          ? {
              playerState: save.playerState,
              position: { x: save.positionX, z: save.positionZ },
              gameMinutes: save.gameMinutes,
              updatedAt: save.updatedAt.toISOString(),
            }
          : null,
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[game] Save read failed', error)
    return NextResponse.json(
      { error: 'Unable to load your save right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to save your game.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const payload = parseGameSavePayload(await readJsonBody(request))
    if (!payload) {
      return NextResponse.json({ error: 'The save data is not valid.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const updatedAt = new Date()
    await db
      .insert(gameSaves)
      .values({
        userId: user.id,
        playerState: payload.playerState,
        positionX: payload.position.x,
        positionZ: payload.position.z,
        gameMinutes: payload.gameMinutes,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: gameSaves.userId,
        set: {
          playerState: payload.playerState,
          positionX: payload.position.x,
          positionZ: payload.position.z,
          gameMinutes: payload.gameMinutes,
          updatedAt,
        },
      })

    return NextResponse.json(
      { saved: true, updatedAt: updatedAt.toISOString() },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[game] Save write failed', error)
    return NextResponse.json(
      { error: 'Unable to save your game right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}
