import type { InventoryItem, InventoryItemId, MissionStage } from '@/components/game/game-data'
import type { GamePosition, GameSavePayload, GameSaveState } from './types'

const ROOM_ITEMS: Record<InventoryItemId, Omit<InventoryItem, 'id' | 'quantity'>> = {
  'city-guide': {
    name: 'Folded city guide',
    detail: 'A hand-marked map of the neighborhoods.',
  },
  suya: {
    name: 'Suya wrap',
    detail: 'A warm street-food snack. Restores energy and hunger.',
  },
  parcel: {
    name: 'Sealed delivery',
    detail: 'A rush parcel for Ada at Afterglow Social Club.',
  },
}

const MISSION_STAGES: readonly MissionStage[] = ['meet-bisi', 'find-tunde', 'delivery', 'free-roam']

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function integerInRange(value: unknown, minimum: number, maximum: number): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
    ? value
    : null
}

function parsePosition(value: unknown): GamePosition | null {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.z !== 'number') return null
  if (!Number.isFinite(value.x) || !Number.isFinite(value.z)) return null
  return {
    x: Math.max(-58, Math.min(58, value.x)),
    z: Math.max(-58, Math.min(53, value.z)),
  }
}

function parseInventory(value: unknown): InventoryItem[] | null {
  if (!Array.isArray(value)) return null

  const quantities = new Map<InventoryItemId, number>()
  let capacity = 12

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== 'string') return null
    if (!Object.prototype.hasOwnProperty.call(ROOM_ITEMS, entry.id)) return null

    const id = entry.id as InventoryItemId
    const quantity = integerInRange(entry.quantity, 1, 12)
    if (quantity === null) return null

    const accepted = Math.min(quantity, capacity)
    if (accepted > 0) quantities.set(id, Math.min(12, (quantities.get(id) ?? 0) + accepted))
    capacity -= accepted
    if (capacity === 0) break
  }

  return [...quantities].map(([id, quantity]) => ({ id, quantity, ...ROOM_ITEMS[id] }))
}

export function parseGameSavePayload(value: unknown): GameSavePayload | null {
  if (!isRecord(value) || !isRecord(value.playerState)) return null

  const input = value.playerState
  const position = parsePosition(value.position)
  const cash = integerInRange(input.cash, 0, 1_000_000)
  const reputation = integerInRange(input.reputation, 0, 100_000)
  const energy = integerInRange(input.energy, 0, 100)
  const hunger = integerInRange(input.hunger, 0, 100)
  const completedRuns = integerInRange(input.completedRuns, 0, 100_000)
  const gameMinutes = integerInRange(value.gameMinutes, 0, 2_000_000_000)
  const inventory = parseInventory(input.inventory)
  const stage = MISSION_STAGES.find((candidate) => candidate === input.stage)

  if (
    !position ||
    cash === null ||
    reputation === null ||
    energy === null ||
    hunger === null ||
    completedRuns === null ||
    gameMinutes === null ||
    !inventory ||
    !stage ||
    typeof input.ownsScooter !== 'boolean' ||
    typeof input.inVehicle !== 'boolean'
  ) {
    return null
  }

  const playerState: GameSaveState = {
    cash,
    reputation,
    level: 1 + Math.floor(reputation / 100),
    energy,
    hunger,
    stage,
    inventory,
    ownsScooter: input.ownsScooter,
    inVehicle: input.ownsScooter && input.inVehicle,
    completedRuns,
  }

  return { playerState, position, gameMinutes }
}
