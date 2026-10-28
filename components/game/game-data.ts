export const WORLD_LOCATIONS = [
  {
    id: 'square',
    name: 'Eko Civic Square',
    district: 'Victoria Island',
    x: 0,
    z: 3,
    kind: 'square',
    description: 'A bright meeting point between the island and the mainland.',
  },
  {
    id: 'market',
    name: 'Balogun Night Market',
    district: 'Lagos Island',
    x: 23,
    z: -22,
    kind: 'market',
    description: 'Food stalls, late traders, and a courier who knows every shortcut.',
  },
  {
    id: 'club',
    name: 'Afterglow Social Club',
    district: 'Yaba',
    x: -22,
    z: 22,
    kind: 'club',
    description: 'A rooftop spot where every night has a different story.',
  },
  {
    id: 'garage',
    name: 'Mainland Motors',
    district: 'Surulere',
    x: 23,
    z: 18,
    kind: 'garage',
    description: 'Rent a scooter, tune a ride, or hear the latest road gossip.',
  },
  {
    id: 'hotel',
    name: 'Marina House',
    district: 'Victoria Island',
    x: -23,
    z: -22,
    kind: 'hotel',
    description: 'A quiet room above the city when the night runs long.',
  },
  {
    id: 'cafe',
    name: 'Palm & Pepper',
    district: 'Surulere',
    x: 1,
    z: 22,
    kind: 'cafe',
    description: 'Fresh suya, cold drinks, and a good place to reset.',
  },
  {
    id: 'waterfront',
    name: 'Third Mainland Lookout',
    district: 'The Lagoon',
    x: 0,
    z: 45,
    kind: 'waterfront',
    description: 'A calm view over the lagoon and the lights of the city.',
  },
] as const

export type LocationId = (typeof WORLD_LOCATIONS)[number]['id']
export type WorldLocation = (typeof WORLD_LOCATIONS)[number]

export const CITY_CHARACTERS = [
  {
    id: 'bisi',
    name: 'Bisi',
    role: 'Neighborhood regular',
    x: -2,
    z: 5,
    locationId: 'square',
    color: '#e9a36f',
    intro: 'You look new around here. Every good Lagos story begins with the wrong turn.',
  },
  {
    id: 'tunde',
    name: 'Tunde',
    role: 'Independent courier',
    x: 20,
    z: -19,
    locationId: 'market',
    color: '#8ad5ba',
    intro: 'One last parcel needs to get across town. Ada at Afterglow is expecting it.',
  },
  {
    id: 'ada',
    name: 'Ada',
    role: 'Afterglow host',
    x: -19,
    z: 20,
    locationId: 'club',
    color: '#e7c46d',
    intro: 'People come here to be remembered. Bring me a good story and we will talk.',
  },
  {
    id: 'kunle',
    name: 'Kunle',
    role: 'Mechanic & rider',
    x: 20,
    z: 16,
    locationId: 'garage',
    color: '#e08c73',
    intro: 'A scooter is not pretty, but it can pay for itself in one night.',
  },
  {
    id: 'sade',
    name: 'Sade',
    role: 'Palm & Pepper owner',
    x: 1,
    z: 19,
    locationId: 'cafe',
    color: '#b6d66f',
    intro: 'Suya first. Big decisions after.',
  },
] as const

export type CharacterId = (typeof CITY_CHARACTERS)[number]['id']
export type CityCharacter = (typeof CITY_CHARACTERS)[number]

export type MissionStage = 'meet-bisi' | 'find-tunde' | 'delivery' | 'free-roam'
export type GamePanel = 'none' | 'map' | 'jobs' | 'inventory' | 'online'

export type InventoryItemId = 'city-guide' | 'suya' | 'parcel'

export type InventoryItem = {
  id: InventoryItemId
  name: string
  quantity: number
  detail: string
}

export type PlayerState = {
  name: string
  cash: number
  reputation: number
  level: number
  energy: number
  hunger: number
  stage: MissionStage
  inventory: InventoryItem[]
  ownsScooter: boolean
  inVehicle: boolean
  completedRuns: number
}

export const STARTING_PLAYER: PlayerState = {
  name: 'Kola',
  cash: 1850,
  reputation: 46,
  level: 1,
  energy: 83,
  hunger: 64,
  stage: 'meet-bisi',
  inventory: [
    {
      id: 'city-guide',
      name: 'Folded city guide',
      quantity: 1,
      detail: 'A hand-marked map of the neighborhoods.',
    },
    {
      id: 'suya',
      name: 'Suya wrap',
      quantity: 1,
      detail: 'A warm street-food snack. Restores energy and hunger.',
    },
  ],
  ownsScooter: false,
  inVehicle: false,
  completedRuns: 0,
}

export type PlayerAction =
  | { type: 'meet-bisi' }
  | { type: 'accept-delivery' }
  | { type: 'complete-delivery' }
  | { type: 'rent-scooter' }
  | { type: 'toggle-vehicle' }
  | { type: 'rest' }
  | { type: 'buy-food' }
  | { type: 'eat-food' }

function updateReputation(state: PlayerState, reputation: number): Pick<PlayerState, 'reputation' | 'level'> {
  return {
    reputation,
    level: 1 + Math.floor(reputation / 100),
  }
}

function updateInventory(
  inventory: InventoryItem[],
  id: InventoryItemId,
  amount: number,
  item: Omit<InventoryItem, 'quantity'>,
): InventoryItem[] {
  const existing = inventory.find((entry) => entry.id === id)
  if (existing) {
    const nextQuantity = existing.quantity + amount
    return nextQuantity > 0
      ? inventory.map((entry) => (entry.id === id ? { ...entry, quantity: nextQuantity } : entry))
      : inventory.filter((entry) => entry.id !== id)
  }
  return amount > 0 ? [...inventory, { ...item, quantity: amount }] : inventory
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'meet-bisi': {
      if (state.stage !== 'meet-bisi') return state
      const reputation = state.reputation + 12
      return {
        ...state,
        cash: state.cash + 200,
        ...updateReputation(state, reputation),
        stage: 'find-tunde',
      }
    }
    case 'accept-delivery': {
      if (state.stage !== 'find-tunde' && state.stage !== 'free-roam') return state
      return {
        ...state,
        stage: 'delivery',
        inventory: updateInventory(state.inventory, 'parcel', 1, {
          id: 'parcel',
          name: 'Sealed delivery',
          detail: 'A rush parcel for Ada at Afterglow Social Club.',
        }),
      }
    }
    case 'complete-delivery': {
      if (state.stage !== 'delivery') return state
      const reputation = state.reputation + 25
      return {
        ...state,
        cash: state.cash + 480,
        ...updateReputation(state, reputation),
        stage: 'free-roam',
        completedRuns: state.completedRuns + 1,
        inventory: updateInventory(state.inventory, 'parcel', -1, {
          id: 'parcel',
          name: 'Sealed delivery',
          detail: 'A rush parcel for Ada at Afterglow Social Club.',
        }),
      }
    }
    case 'rent-scooter': {
      if (state.ownsScooter || state.cash < 350) return state
      return {
        ...state,
        cash: state.cash - 350,
        ownsScooter: true,
        inVehicle: true,
      }
    }
    case 'toggle-vehicle':
      if (!state.ownsScooter) return state
      return { ...state, inVehicle: !state.inVehicle }
    case 'rest':
      return { ...state, energy: 100, hunger: Math.max(state.hunger, 78), inVehicle: false }
    case 'buy-food': {
      if (state.cash < 90) return state
      return {
        ...state,
        cash: state.cash - 90,
        inventory: updateInventory(state.inventory, 'suya', 1, {
          id: 'suya',
          name: 'Suya wrap',
          detail: 'A warm street-food snack. Restores energy and hunger.',
        }),
      }
    }
    case 'eat-food': {
      const suya = state.inventory.find((item) => item.id === 'suya')
      if (!suya || suya.quantity < 1) return state
      return {
        ...state,
        energy: Math.min(100, state.energy + 12),
        hunger: Math.min(100, state.hunger + 28),
        inventory: updateInventory(state.inventory, 'suya', -1, {
          id: 'suya',
          name: 'Suya wrap',
          detail: 'A warm street-food snack. Restores energy and hunger.',
        }),
      }
    }
  }
}

export function getMissionDetails(stage: MissionStage) {
  switch (stage) {
    case 'meet-bisi':
      return {
        eyebrow: 'STORY 01 · FIRST IMPRESSIONS',
        title: 'A face in the crowd',
        objective: 'Meet Bisi at Eko Civic Square.',
        targetLocation: 'square' as LocationId,
        reward: '₦200 + 12 rep',
        progress: 0.22,
      }
    case 'find-tunde':
      return {
        eyebrow: 'STORY 01 · THE NIGHT SHIFT',
        title: 'A night in motion',
        objective: 'Find Tunde at Balogun Night Market.',
        targetLocation: 'market' as LocationId,
        reward: '₦480 + 25 rep',
        progress: 0.48,
      }
    case 'delivery':
      return {
        eyebrow: 'ACTIVE RUN · COURIER',
        title: 'Last-mile delivery',
        objective: 'Get the parcel to Ada at Afterglow Social Club.',
        targetLocation: 'club' as LocationId,
        reward: '₦480 + 25 rep',
        progress: 0.78,
      }
    case 'free-roam':
      return {
        eyebrow: 'OPEN CITY · YOUR STORY',
        title: 'Lagos is yours tonight',
        objective: 'Pick a shift, meet the locals, and make your own route.',
        targetLocation: null,
        reward: 'REPEATABLE JOBS',
        progress: 1,
      }
  }
}

export function distanceBetween(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatGameTime(minutes: number) {
  const dayMinutes = ((minutes % 1440) + 1440) % 1440
  const hour = Math.floor(dayMinutes / 60)
  const minute = dayMinutes % 60
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}
