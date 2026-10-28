import { and, desc, eq, gt } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { roomMessages } from '@/lib/db/schema'
import { getAuthenticatedGameUser } from '@/lib/game/auth'
import { PRIVATE_NO_STORE_HEADERS, readJsonBody } from '@/lib/game/http'
import { isRecord } from '@/lib/game/validation'

const ROOM_ID = 'eko-mainland'
const CHAT_LIMIT = 50
const MESSAGE_COOLDOWN_MS = 1_500

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to read city chat.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const recentMessages = await db
      .select({
        id: roomMessages.id,
        displayName: roomMessages.displayName,
        message: roomMessages.message,
        createdAt: roomMessages.createdAt,
      })
      .from(roomMessages)
      .where(eq(roomMessages.roomId, ROOM_ID))
      .orderBy(desc(roomMessages.createdAt))
      .limit(CHAT_LIMIT)

    return NextResponse.json(
      {
        messages: recentMessages.reverse().map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
        })),
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[game] Chat read failed', error)
    return NextResponse.json(
      { error: 'Unable to load city chat right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sign in to send a message.' }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
    }

    const body = await readJsonBody(request)
    const message = isRecord(body) && typeof body.message === 'string'
      ? body.message.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
      : ''

    if (!message || [...message].length > 240) {
      return NextResponse.json(
        { error: 'Write a message of 1–240 characters.' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
      )
    }

    const tooSoon = await db
      .select({ id: roomMessages.id })
      .from(roomMessages)
      .where(and(eq(roomMessages.userId, user.id), gt(roomMessages.createdAt, new Date(Date.now() - MESSAGE_COOLDOWN_MS))))
      .limit(1)

    if (tooSoon.length > 0) {
      return NextResponse.json(
        { error: 'Give your next message a moment.' },
        { status: 429, headers: PRIVATE_NO_STORE_HEADERS },
      )
    }

    const [created] = await db
      .insert(roomMessages)
      .values({
        userId: user.id,
        roomId: ROOM_ID,
        displayName: user.name,
        message,
      })
      .returning({
        id: roomMessages.id,
        displayName: roomMessages.displayName,
        message: roomMessages.message,
        createdAt: roomMessages.createdAt,
      })

    return NextResponse.json(
      {
        message: {
          ...created,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  } catch (error) {
    console.error('[game] Chat write failed', error)
    return NextResponse.json(
      { error: 'Unable to send your message right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}
