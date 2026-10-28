export const WORLD_LOCATIONS = [
  {
    id: 'square',
    name: 'Eko Civic Square',
    district: 'Victoria Island',
    x: 0,
    z: 3,
    kind: 'square',
    description: 'The city’s central plaza, framed by offices, cafés, and bus stops.',
  },
  {
    id: 'market',
    name: 'Balogun Night Market',
    district: 'Lagos Island',
    x: 20,
    z: -18,
    kind: 'market',
    description: 'A crowded trading street where couriers and stall owners find work.',
  },
  {
    id: 'club',
    name: 'Afterglow Social Club',
    district: 'Yaba',
    x: -20,
    z: 22,
    kind: 'club',
    description: 'A live-music room and neighborhood clubhouse with a late crowd.',
  },
  {
    id: 'garage',
    name: 'Mainland Motors',
    district: 'Surulere',
    x: 22,
    z: 18,
    kind: 'garage',
    description: 'A working garage, scooter hire desk, and local transport hub.',
  },
  {
    id: 'hotel',
    name: 'Marina House',
    district: 'Victoria Island',
    x: -24,
    z: -20,
    kind: 'hotel',
    description: 'A modest city hotel with rooms above a busy waterfront road.',
  },
  {
    id: 'cafe',
    name: 'Palm & Pepper',
    district: 'Surulere',
    x: 2,
    z: 22,
    kind: 'cafe',
    description: 'Suya, cold drinks, and a familiar place to catch your breath.',
  },
  {
    id: 'waterfront',
    name: 'Third Mainland Bridge',
    district: 'The Lagoon',
    x: 12,
    z: 73,
    kind: 'bridge',
    description: 'A long causeway over the lagoon, with the city lights behind you.',
  },
  {
    id: 'police',
    name: 'Adekunle Police Division',
    district: 'Yaba',
    x: -46,
    z: -18,
    kind: 'police',
    description: 'A neighborhood station, community desk, and public-service workplace.',
  },
  {
    id: 'court',
    name: 'Lagos High Court',
    district: 'Ikeja',
    x: -58,
    z: -40,
    kind: 'court',
    description: 'The civic court and public records office for the district.',
  },
  {
    id: 'hospital',
    name: 'Mainland General Hospital',
    district: 'Ikeja',
    x: -70,
    z: -5,
    kind: 'hospital',
    description: 'A round-the-clock hospital with a busy emergency entrance.',
  },
  {
    id: 'university',
    name: 'University of Lagos',
    district: 'Akoka',
    x: -52,
    z: -60,
    kind: 'university',
    description: 'A large campus of lecture halls, libraries, and student housing.',
  },
  {
    id: 'school',
    name: 'Eko Secondary School',
    district: 'Mushin',
    x: -12,
    z: -62,
    kind: 'school',
    description: 'A neighborhood secondary school with evening study groups.',
  },
  {
    id: 'stadium',
    name: 'National City Stadium',
    district: 'Surulere',
    x: 50,
    z: -22,
    kind: 'stadium',
    description: 'A floodlit football ground with match-day and grounds-crew shifts.',
  },
  {
    id: 'government',
    name: 'State Government House',
    district: 'Alausa',
    x: -52,
    z: 42,
    kind: 'government',
    description: 'The seat of state administration and the district’s civic offices.',
  },
  {
    id: 'polling',
    name: 'Ward 08 Polling Unit',
    district: 'Alausa',
    x: -22,
    z: 50,
    kind: 'polling',
    description: 'Register as a voter and take part in the city’s local elections.',
  },
  {
    id: 'bungalow',
    name: 'Abule Egba Bungalows',
    district: 'Mainland Estates',
    x: 22,
    z: 50,
    kind: 'bungalow',
    description: 'Low-rise homes behind courtyard walls and roadside gardens.',
  },
  {
    id: 'estate',
    name: 'Lekki Garden Estate',
    district: 'Lekki',
    x: 58,
    z: 44,
    kind: 'estate',
    description: 'A gated residential estate with townhouses and a shared clubhouse.',
  },
  {
    id: 'village',
    name: 'Ibeju Farm Village',
    district: 'Ibeju-Lekki',
    x: -62,
    z: 58,
    kind: 'village',
    description: 'A close-knit village at the edge of the city’s agricultural belt.',
  },
  {
    id: 'farm',
    name: 'Epe Food Cooperative',
    district: 'Epe',
    x: 14,
    z: 66,
    kind: 'farm',
    description: 'Small farms and a produce cooperative supplying the city markets.',
  },
  {
    id: 'airport',
    name: 'Murtala Muhammed Airport',
    district: 'Ikeja',
    x: 60,
    z: -62,
    kind: 'airport',
    description: 'The international terminal and ground crew hiring office.',
  },
  {
    id: 'port',
    name: 'Apapa Shipping Port',
    district: 'Apapa',
    x: 66,
    z: 24,
    kind: 'port',
    description: 'A working container port with logistics and dockside shifts.',
  },
  {
    id: 'clubhouse',
    name: 'Mainland Athletic Club',
    district: 'Surulere',
    x: -24,
    z: -44,
    kind: 'clubhouse',
    description: 'A community sports clubhouse for football, fitness, and local events.',
  },
  {
    id: 'event-center',
    name: 'Eko Convention & Events Centre',
    district: 'Victoria Island',
    x: -4,
    z: -32,
    kind: 'event-center',
    description: 'A waterfront convention hall hosting concerts, community fairs, and city meetings.',
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
    color: '#bc7251',
    skinTone: '#875b45',
    hairColor: '#231b18',
    accentColor: '#d7a76c',
    intro: 'You look new around here. Every good Lagos story begins with the wrong turn.',
  },
  {
    id: 'tunde',
    name: 'Tunde',
    role: 'Independent courier',
    x: 18,
    z: -16,
    locationId: 'market',
    color: '#315b72',
    skinTone: '#754c39',
    hairColor: '#211b18',
    accentColor: '#d7ad58',
    intro: 'One last parcel needs to get across town. Ada at Afterglow is expecting it.',
  },
  {
    id: 'ada',
    name: 'Ada',
    role: 'Afterglow host',
    x: -18,
    z: 20,
    locationId: 'club',
    color: '#763f42',
    skinTone: '#9b6a4d',
    hairColor: '#241b1a',
    accentColor: '#e0b765',
    intro: 'People come here to be remembered. Bring me a good story and we will talk.',
  },
  {
    id: 'kunle',
    name: 'Kunle',
    role: 'Mechanic & rider',
    x: 20,
    z: 16,
    locationId: 'garage',
    color: '#3b5261',
    skinTone: '#684332',
    hairColor: '#1d1815',
    accentColor: '#c77b54',
    intro: 'A scooter is not pretty, but it can pay for itself in one night.',
  },
  {
    id: 'sade',
    name: 'Sade',
    role: 'Palm & Pepper owner',
    x: 1,
    z: 19,
    locationId: 'cafe',
    color: '#8b5535',
    skinTone: '#9c6849',
    hairColor: '#2a1c18',
    accentColor: '#d7ad69',
    intro: 'Suya first. Big decisions after.',
  },
  {
    id: 'chika',
    name: 'Chika',
    role: 'Community police officer',
    x: -44,
    z: -16,
    locationId: 'police',
    color: '#273f58',
    skinTone: '#80533f',
    hairColor: '#1e1b18',
    accentColor: '#c65c4b',
    intro: 'We keep this neighborhood safe together. Ask at the front desk about a patrol shift.',
  },
  {
    id: 'amina',
    name: 'Amina',
    role: 'Hospital nurse',
    x: -68,
    z: -3,
    locationId: 'hospital',
    color: '#e1ddd1',
    skinTone: '#98654a',
    hairColor: '#251c19',
    accentColor: '#4b8a91',
    intro: 'Long night? Take a breath. The clinic is open, and we always need an extra pair of hands.',
  },
  {
    id: 'wale',
    name: 'Wale',
    role: 'Stadium groundskeeper',
    x: 48,
    z: -20,
    locationId: 'stadium',
    color: '#364a43',
    skinTone: '#87583f',
    hairColor: '#211b17',
    accentColor: '#d0a552',
    intro: 'Match day starts before sunrise. Good grounds crew can make a name here.',
  },
  {
    id: 'tobi',
    name: 'Tobi',
    role: 'University teaching assistant',
    x: -50,
    z: -58,
    locationId: 'university',
    color: '#725044',
    skinTone: '#87583f',
    hairColor: '#1d1917',
    accentColor: '#d5ba8b',
    intro: 'The campus has a public lecture tonight. There is always room for curious people.',
  },
  {
    id: 'iyabo',
    name: 'Iyabo',
    role: 'Farmer & cooperative lead',
    x: 12,
    z: 64,
    locationId: 'farm',
    color: '#694c38',
    skinTone: '#925d43',
    hairColor: '#2b201b',
    accentColor: '#b87949',
    intro: 'Fresh produce keeps the whole city moving. We could use another reliable hand.',
  },
  {
    id: 'emeka',
    name: 'Emeka',
    role: 'Port dispatch coordinator',
    x: 64,
    z: 22,
    locationId: 'port',
    color: '#39525c',
    skinTone: '#76503b',
    hairColor: '#1f1b18',
    accentColor: '#d2aa61',
    intro: 'Containers arrive all night. If you can keep a schedule, the docks have work.',
  },
  {
    id: 'kemi',
    name: 'Kemi',
    role: 'Civic information officer',
    x: -50,
    z: 40,
    locationId: 'government',
    color: '#614b51',
    skinTone: '#9a694d',
    hairColor: '#261d19',
    accentColor: '#d7ad67',
    intro: 'Local decisions are made by people who show up. Start at the ward polling unit.',
  },
  {
    id: 'moyo',
    name: 'Moyo',
    role: 'Events producer',
    x: -4,
    z: -23,
    locationId: 'event-center',
    color: '#574653',
    skinTone: '#87583f',
    hairColor: '#211a17',
    accentColor: '#d2aa61',
    intro: 'We are turning the hall around for a community night market. The floor crew board is open.',
  },
] as const

export type CharacterId = (typeof CITY_CHARACTERS)[number]['id']
export type CityCharacter = (typeof CITY_CHARACTERS)[number]

export const CITY_JOBS = [
  {
    id: 'market-loader',
    title: 'Market loading crew',
    employer: 'Balogun Night Market',
    locationId: 'market',
    category: 'RETAIL & LOGISTICS',
    pay: 360,
    reputation: 8,
    description: 'Help stall owners move produce and close up before the morning rush.',
  },
  {
    id: 'clinic-porter',
    title: 'Clinic support assistant',
    employer: 'Mainland General Hospital',
    locationId: 'hospital',
    category: 'HEALTHCARE',
    pay: 480,
    reputation: 12,
    description: 'Support the night team with supply runs and patient check-ins.',
  },
  {
    id: 'farmhand',
    title: 'Farm cooperative hand',
    employer: 'Epe Food Cooperative',
    locationId: 'farm',
    category: 'AGRICULTURE',
    pay: 540,
    reputation: 14,
    description: 'Harvest and pack a market order with the local growers.',
  },
  {
    id: 'port-clerk',
    title: 'Dock dispatch clerk',
    employer: 'Apapa Shipping Port',
    locationId: 'port',
    category: 'MARITIME',
    pay: 620,
    reputation: 15,
    description: 'Check a cargo manifest and guide a shipment to the right yard.',
  },
  {
    id: 'community-patrol',
    title: 'Community patrol partner',
    employer: 'Adekunle Police Division',
    locationId: 'police',
    category: 'PUBLIC SERVICE',
    pay: 460,
    reputation: 16,
    description: 'Join a supervised neighborhood walk and log street-light issues.',
  },
  {
    id: 'stadium-crew',
    title: 'Stadium grounds crew',
    employer: 'National City Stadium',
    locationId: 'stadium',
    category: 'SPORT & EVENTS',
    pay: 500,
    reputation: 11,
    description: 'Prepare the pitch perimeter and stands for the next local fixture.',
  },
  {
    id: 'event-crew',
    title: 'Convention floor crew',
    employer: 'Eko Convention & Events Centre',
    locationId: 'event-center',
    category: 'EVENTS & HOSPITALITY',
    pay: 520,
    reputation: 13,
    description: 'Set up a night market expo, guide guests through the hall, and close out the venue.',
  },
] as const

export type JobId = (typeof CITY_JOBS)[number]['id']
export type CityJob = (typeof CITY_JOBS)[number]

export const CITY_FACTIONS = [
  {
    id: 'night-market-union',
    name: 'Night Market Union',
    district: 'Lagos Island',
    locationId: 'market',
    members: 'Traders & couriers',
    description: 'Back local traders, share delivery routes, and keep the market moving.',
  },
  {
    id: 'mainland-athletic-club',
    name: 'Mainland Athletic Club',
    district: 'Surulere',
    locationId: 'clubhouse',
    members: 'Players & coaches',
    description: 'A neighborhood sports group built around football and community events.',
  },
  {
    id: 'eko-civic-watch',
    name: 'Eko Civic Watch',
    district: 'Yaba',
    locationId: 'police',
    members: 'Residents & volunteers',
    description: 'Work with residents and officers to improve everyday street safety.',
  },
  {
    id: 'epe-growers-coop',
    name: 'Epe Growers Cooperative',
    district: 'Epe',
    locationId: 'farm',
    members: 'Growers & suppliers',
    description: 'Connect local farms with markets, homes, and port-side buyers.',
  },
] as const

export type FactionId = (typeof CITY_FACTIONS)[number]['id']

export const CITY_HOMES = [
  {
    id: 'marina-room',
    name: 'Marina room & parlour',
    district: 'Victoria Island',
    locationId: 'hotel',
    price: 650,
    tenure: 'Weekly room lease',
    description: 'A small furnished room above the Marina road.',
  },
  {
    id: 'mainland-bungalow',
    name: 'Surulere bungalow',
    district: 'Mainland Estates',
    locationId: 'bungalow',
    price: 8_000,
    tenure: 'Home purchase',
    description: 'A one-bedroom bungalow with a shaded front courtyard.',
  },
  {
    id: 'lekki-townhouse',
    name: 'Lekki estate townhouse',
    district: 'Lekki',
    locationId: 'estate',
    price: 24_000,
    tenure: 'Home purchase',
    description: 'A two-storey home inside a gated residential estate.',
  },
  {
    id: 'epe-farmstead',
    name: 'Epe farmstead',
    district: 'Epe',
    locationId: 'farm',
    price: 6_500,
    tenure: 'Home purchase',
    description: 'A compact farmhouse beside the cooperative fields.',
  },
] as const

export type HomeId = (typeof CITY_HOMES)[number]['id']

export type MissionStage = 'meet-bisi' | 'find-tunde' | 'delivery' | 'free-roam'
export type GamePanel = 'none' | 'map' | 'jobs' | 'life' | 'inventory' | 'online'

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
  completedShifts: number
  job: JobId | null
  faction: FactionId | null
  home: HomeId | null
  voterRegistered: boolean
  wantedLevel: number
}

export type RemotePlayer = {
  userId: string
  displayName: string
  x: number
  z: number
  inVehicle: boolean
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
  completedShifts: 0,
  job: null,
  faction: null,
  home: null,
  voterRegistered: false,
  wantedLevel: 0,
}

export type PlayerAction =
  | { type: 'restore'; player: PlayerState }
  | { type: 'rename'; name: string }
  | { type: 'meet-bisi' }
  | { type: 'accept-delivery' }
  | { type: 'complete-delivery' }
  | { type: 'rent-scooter' }
  | { type: 'toggle-vehicle' }
  | { type: 'rest' }
  | { type: 'buy-food' }
  | { type: 'eat-food' }
  | { type: 'apply-job'; jobId: JobId }
  | { type: 'complete-shift'; jobId: JobId }
  | { type: 'join-faction'; factionId: FactionId | null }
  | { type: 'lease-home'; homeId: HomeId }
  | { type: 'register-voter' }
  | { type: 'resolve-court' }

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
    case 'restore':
      return action.player
    case 'rename':
      return { ...state, name: action.name }
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
    case 'apply-job':
      return { ...state, job: action.jobId }
    case 'complete-shift': {
      const job = CITY_JOBS.find((entry) => entry.id === action.jobId)
      if (!job || state.job !== action.jobId) return state
      const reputation = state.reputation + job.reputation
      return {
        ...state,
        cash: state.cash + job.pay,
        energy: Math.max(0, state.energy - 10),
        hunger: Math.max(0, state.hunger - 8),
        completedShifts: state.completedShifts + 1,
        ...updateReputation(state, reputation),
      }
    }
    case 'join-faction':
      return { ...state, faction: action.factionId }
    case 'lease-home': {
      const home = CITY_HOMES.find((entry) => entry.id === action.homeId)
      if (!home || state.home || state.cash < home.price) return state
      return { ...state, cash: state.cash - home.price, home: home.id }
    }
    case 'register-voter': {
      if (state.voterRegistered) return state
      const reputation = state.reputation + 5
      return { ...state, voterRegistered: true, ...updateReputation(state, reputation) }
    }
    case 'resolve-court': {
      if (state.wantedLevel < 1) return state
      const fine = state.wantedLevel * 300
      if (state.cash < fine) return state
      return { ...state, cash: state.cash - fine, wantedLevel: 0 }
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
