import { NextResponse } from 'next/server'
import { getAuthenticatedGameUser } from '@/lib/game/auth'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/game/http'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedGameUser(request)
    return NextResponse.json({ user }, { headers: PRIVATE_NO_STORE_HEADERS })
  } catch (error) {
    console.error('[game] Session lookup failed', error)
    return NextResponse.json(
      { error: 'Unable to check your session right now.' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }
}
