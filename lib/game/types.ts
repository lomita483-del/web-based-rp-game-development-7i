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

export type GameUser = { id: string; name: string }
export type GameSessionResponse = { user: GameUser | null }

export type OnlinePlayer = {
  userId: string
  displayName: string
  x: number
  z: number
  inVehicle: boolean
  updatedAt: string
}

export type PresenceResponse = { players: OnlinePlayer[] }
export type PresenceUpdate = GamePosition & { inVehicle: boolean }
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
