import {
  CITY_FACTIONS,
  CITY_HOMES,
  CITY_JOBS,
  isInteriorId,
  type FactionId,
  type HomeId,
  type InventoryItem,
  type InventoryItemId,
  type JobId,
  type Gender,
  type InteriorId,
  type MissionStage,
} from '@/components/game/game-data'
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

function parseOptionalId<T extends string>(value: unknown, allowed: readonly T[]): T | null | undefined {
  if (value === undefined || value === null) return null
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : undefined
}

function parsePosition(value: unknown): GamePosition | null {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.z !== 'number') return null
  if (!Number.isFinite(value.x) || !Number.isFinite(value.z)) return null
  return {
    x: Math.max(-145, Math.min(82, value.x)),
    z: Math.max(-82, Math.min(78, value.z)),
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
  const bankBalance = input.bankBalance === undefined ? 0 : integerInRange(input.bankBalance, 0, 1_000_000)
  const reputation = integerInRange(input.reputation, 0, 100_000)
  const energy = integerInRange(input.energy, 0, 100)
  const hunger = integerInRange(input.hunger, 0, 100)
  const fun = input.fun === undefined ? 76 : integerInRange(input.fun, 0, 100)
  const hygiene = input.hygiene === undefined ? 88 : integerInRange(input.hygiene, 0, 100)
  const bladder = input.bladder === undefined ? 18 : integerInRange(input.bladder, 0, 100)
  const educationCredits = input.educationCredits === undefined ? 0 : integerInRange(input.educationCredits, 0, 100_000)
  const completedRuns = integerInRange(input.completedRuns, 0, 100_000)
  const completedShifts = input.completedShifts === undefined ? 0 : integerInRange(input.completedShifts, 0, 100_000)
  const wantedLevel = input.wantedLevel === undefined ? 0 : integerInRange(input.wantedLevel, 0, 5)
  const voterRegistered = input.voterRegistered === undefined ? false : input.voterRegistered
  const gender: Gender | null = input.gender === undefined ? 'male' : input.gender === 'male' || input.gender === 'female' ? input.gender : null
  const shiftStarted = input.shiftStarted === undefined ? false : input.shiftStarted
  const job = parseOptionalId(input.job, CITY_JOBS.map((entry) => entry.id))
  const faction = parseOptionalId(input.faction, CITY_FACTIONS.map((entry) => entry.id))
  const home = parseOptionalId(input.home, CITY_HOMES.map((entry) => entry.id))
  const gameMinutes = integerInRange(value.gameMinutes, 0, 2_000_000_000)
  const inventory = parseInventory(input.inventory)
  const stage = MISSION_STAGES.find((candidate) => candidate === input.stage)
  const currentInteriorId = input.currentInteriorId === undefined || input.currentInteriorId === null
    ? null
    : isInteriorId(input.currentInteriorId) ? input.currentInteriorId as InteriorId : undefined
  const returnPosition = input.returnPosition === undefined || input.returnPosition === null
    ? null
    : parsePosition(input.returnPosition)
  const jobDefinition = typeof job === 'string' ? CITY_JOBS.find((entry) => entry.id === job) : null
  const completedShiftTasks = input.completedShiftTasks === undefined
    ? []
    : Array.isArray(input.completedShiftTasks) && input.completedShiftTasks.length <= (jobDefinition?.tasks.length ?? 0)
      ? input.completedShiftTasks.filter((task, index, tasks): task is number =>
          integerInRange(task, 0, (jobDefinition?.tasks.length ?? 1) - 1) !== null && tasks.indexOf(task) === index,
        )
      : null

  if (
    !position ||
    cash === null ||
    bankBalance === null ||
    reputation === null ||
    energy === null ||
    hunger === null ||
    fun === null ||
    hygiene === null ||
    bladder === null ||
    educationCredits === null ||
    gender === null ||
    completedRuns === null ||
    completedShifts === null ||
    wantedLevel === null ||
    typeof voterRegistered !== 'boolean' ||
    job === undefined ||
    faction === undefined ||
    home === undefined ||
    gameMinutes === null ||
    !inventory ||
    !stage ||
    typeof shiftStarted !== 'boolean' ||
    !completedShiftTasks ||
    (shiftStarted && !jobDefinition) ||
    (!shiftStarted && completedShiftTasks.length > 0) ||
    currentInteriorId === undefined ||
    (currentInteriorId && !returnPosition) ||
    (currentInteriorId === null && returnPosition) ||
    typeof input.ownsScooter !== 'boolean' ||
    typeof input.inVehicle !== 'boolean'
  ) {
    return null
  }

  const playerState: GameSaveState = {
    adminMode: false,
    gender,
    cash,
    bankBalance,
    reputation,
    level: 1 + Math.floor(reputation / 100),
    energy,
    hunger,
    fun,
    hygiene,
    bladder,
    educationCredits,
    stage,
    inventory,
    ownsScooter: input.ownsScooter,
    inVehicle: input.ownsScooter && input.inVehicle,
    completedRuns,
    completedShifts,
    shiftStarted,
    completedShiftTasks,
    currentInteriorId,
    returnPosition,
    wantedLevel,
    voterRegistered,
    job: job as JobId | null,
    faction: faction as FactionId | null,
    home: home as HomeId | null,
  }

  return { playerState, position, gameMinutes }
}
