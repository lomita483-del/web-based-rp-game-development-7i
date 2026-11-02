import { auth } from '@/lib/auth'
import { isAdminEmail } from './admin'
import type { GameUser } from './types'

export function sanitizeDisplayName(value: string): string {
  const name = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32)
  return name || 'Night Courier'
}

export async function getAuthenticatedGameUser(request: Request): Promise<GameUser | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  return { id: session.user.id, name: sanitizeDisplayName(session.user.name), isAdmin: isAdminEmail(session.user.email) }
}
