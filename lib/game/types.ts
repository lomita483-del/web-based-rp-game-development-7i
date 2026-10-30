import type { PlayerState } from '@/components/game/game-data'

export type GamePosition = { x: number; z: number }
export type GameSaveState = Omit<PlayerState, 'name'>

export type GameSavePayload = {
  playerState: GameSaveState
  position: GamePosition
  gameMinutes: number
}

export type GameSaveRecord = GameSavePayload & { updatedAt: string }
export type GameSaveResponse = { save: GameSaveRecord | null }
export type GameSaveAck = { saved: true; updatedAt: string }

export type GameUser = { id: string; name: string; isAdmin?: boolean }
export type GameSessionResponse = { user: GameUser | null }

export type OnlinePlayer = {
  userId: string
  displayName: string
  x: number
  z: number
  inVehicle: boolean
  isAdmin?: boolean
  updatedAt: string
}

export type PresenceResponse = { players: OnlinePlayer[] }
export type PresenceUpdate = GamePosition & { inVehicle: boolean; roomId: string }
export type PresenceMutation = PresenceUpdate | { method: 'DELETE' }

export type RoleplayMessage = {
  id: string
  displayName: string
  message: string
  createdAt: string
}

export type ChatResponse = { messages: RoleplayMessage[] }
export type ChatPostResponse = { message: RoleplayMessage }
export type ChatPostPayload = { message: string }

export type SaveStatus = 'local' | 'loading' | 'saving' | 'saved' | 'error'

export type AdminPlayerRow = {
  userId: string
  name: string
  online: boolean
  x: number | null
  z: number | null
  cash: number | null
  muted: boolean
  banned: boolean
  lastSeen: string | null
}

export type AdminOverview = {
  players: AdminPlayerRow[]
  chat: { id: string; displayName: string; message: string; createdAt: string }[]
  log: { id: string; action: string; target: string | null; createdAt: string }[]
  announcement: { id: string; message: string; createdAt: string } | null
}

export type PendingCommand = { id: string; type: 'give-cash' | 'heal' | 'teleport' | 'set-time' | 'notify' | 'kick'; payload: Record<string, unknown> }

export type CommandsResponse = {
  commands: PendingCommand[]
  announcement: { id: string; message: string; createdAt: string } | null
  muted: boolean
  banned: boolean
}
