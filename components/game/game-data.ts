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
    id: 'bank',
    name: 'Eko Cooperative Bank',
    district: 'Victoria Island',
    x: 30,
    z: 0,
    kind: 'bank',
    description: 'A full-service branch with teller desks, account services, and a public ATM lobby.',
  },
  {
    id: 'market',
    name: 'Balogun Night Market',
    district: 'Lagos Island',
    x: 30,
    z: -30,
    kind: 'market',
    description: 'A crowded trading street where couriers and stall owners find work.',
  },
  {
    id: 'club',
    name: 'Afterglow Social Club',
    district: 'Yaba',
    x: -30,
    z: 30,
    kind: 'club',
    description: 'A live-music room and neighborhood clubhouse with a late crowd.',
  },
  {
    id: 'garage',
    name: 'Mainland Motors',
    district: 'Surulere',
    x: 30,
    z: 30,
    kind: 'garage',
    description: 'A working garage, scooter hire desk, and local transport hub.',
  },
  {
    id: 'hotel',
    name: 'Marina House',
    district: 'Victoria Island',
    x: -30,
    z: -30,
    kind: 'hotel',
    description: 'A modest city hotel with rooms above a busy waterfront road.',
  },
  {
    id: 'cafe',
    name: 'Palm & Pepper',
    district: 'Surulere',
    x: 0,
    z: 30,
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
    x: -54,
    z: 6,
    kind: 'police',
    description: 'A neighborhood station, community desk, and public-service workplace.',
  },
  {
    id: 'court',
    name: 'Lagos High Court',
    district: 'Ikeja',
    x: -54,
    z: -30,
    kind: 'court',
    description: 'The civic court and public records office for the district.',
  },
  {
    id: 'hospital',
    name: 'Mainland General Hospital',
    district: 'Ikeja',
    x: -30,
    z: -6,
    kind: 'hospital',
    description: 'A round-the-clock hospital with a busy emergency entrance.',
  },
  {
    id: 'university',
    name: 'University of Lagos',
    district: 'Akoka',
    x: -54,
    z: -76,
    kind: 'university',
    description: 'A dedicated Akoka campus with lecture halls, a library, student housing, and open courtyards.'
  },
  {
    id: 'school',
    name: 'Eko Secondary School',
    district: 'Mushin',
    x: -30,
    z: -54,
    kind: 'school',
    description: 'A neighborhood secondary school with evening study groups.',
  },
  {
    id: 'stadium',
    name: 'National City Stadium',
    district: 'Surulere',
    x: 54,
    z: -30,
    kind: 'stadium',
    description: 'A floodlit football ground with match-day and grounds-crew shifts.',
  },
  {
    id: 'government',
    name: 'State Government House',
    district: 'Alausa',
    x: -54,
    z: 30,
    kind: 'government',
    description: 'The seat of state administration and the district’s civic offices.',
  },
  {
    id: 'polling',
    name: 'Ward 08 Polling Unit',
    district: 'Alausa',
    x: -30,
    z: 54,
    kind: 'polling',
    description: 'Register as a voter and take part in the city’s local elections.',
  },
  {
    id: 'bungalow',
    name: 'Abule Egba Bungalows',
    district: 'Mainland Estates',
    x: 30,
    z: 54,
    kind: 'bungalow',
    description: 'Low-rise homes behind courtyard walls and roadside gardens.',
  },
  {
    id: 'estate',
    name: 'Lekki Garden Estate',
    district: 'Lekki',
    x: 54,
    z: 54,
    kind: 'estate',
    description: 'A gated residential estate with townhouses and a shared clubhouse.',
  },
  {
    id: 'village',
    name: 'Ibeju Farm Village',
    district: 'Ibeju-Lekki',
    x: -54,
    z: 54,
    kind: 'village',
    description: 'A close-knit village at the edge of the city’s agricultural belt.',
  },
  {
    id: 'farm',
    name: 'Epe Food Cooperative',
    district: 'Epe',
    x: 0,
    z: 54,
    kind: 'farm',
    description: 'Small farms and a produce cooperative supplying the city markets.',
  },
  {
    id: 'airport',
    name: 'Murtala Muhammed Airport',
    district: 'Ikeja',
    x: 54,
    z: -54,
    kind: 'airport',
    description: 'The international terminal and ground crew hiring office.',
  },
  {
    id: 'port',
    name: 'Apapa Shipping Port',
    district: 'Apapa',
    x: 54,
    z: 30,
    kind: 'port',
    description: 'A working container port with logistics and dockside shifts.',
  },
  {
    id: 'clubhouse',
    name: 'Mainland Athletic Club',
    district: 'Surulere',
    x: -30,
    z: 6,
    kind: 'clubhouse',
    description: 'A community sports clubhouse for football, fitness, and local events.',
  },
  {
    id: 'event-center',
    name: 'Eko Convention & Events Centre',
    district: 'Victoria Island',
    x: 0,
    z: -30,
    kind: 'event-center',
    description: 'A waterfront convention hall hosting concerts, community fairs, and city meetings.',
  },
] as const

export type LocationId = (typeof WORLD_LOCATIONS)[number]['id']
export type WorldLocation = (typeof WORLD_LOCATIONS)[number]

export const CITY_BUILDINGS = [
  { id: 'canal-walkups', name: 'Canal Walk-ups', district: 'Lagos Island', x: -76, z: -76, width: 8, depth: 8, height: 12, color: '#817d75', accent: '#c89b62', interiorKind: 'apartment' },
  { id: 'ikeja-quarters', name: 'Ikeja Staff Quarters', district: 'Ikeja', x: 30, z: 9, width: 9, depth: 8, height: 9, color: '#9b8c78', accent: '#c9845b', interiorKind: 'apartment' },
  { id: 'yaba-service-flats', name: 'Yaba Service Flats', district: 'Yaba', x: -30, z: -76, width: 8, depth: 8, height: 10, color: '#767c7c', accent: '#d0a263', interiorKind: 'apartment' },
  { id: 'cargo-annex', name: 'Airport Cargo Annex', district: 'Ikeja', x: 0, z: -76, width: 8, depth: 8, height: 11, color: '#777b78', accent: '#b5a06c', interiorKind: 'office' },
  { id: 'oshodi-market-row', name: 'Oshodi Market Row', district: 'Oshodi', x: 30, z: -76, width: 8, depth: 8, height: 6, color: '#99775d', accent: '#d49c54', interiorKind: 'shop' },
  { id: 'airport-staff-housing', name: 'Airport Staff Housing', district: 'Ikeja', x: -54, z: -6, width: 8, depth: 8, height: 9, color: '#8b8171', accent: '#d2a266', interiorKind: 'apartment' },
  { id: 'northern-office-block', name: 'Northern Office Block', district: 'Ikeja', x: 76, z: -76, width: 8, depth: 8, height: 13, color: '#6f7a7f', accent: '#d6b373', interiorKind: 'office' },
  { id: 'marina-apartments', name: 'Marina Apartments', district: 'Victoria Island', x: -76, z: -54, width: 8, depth: 8, height: 13, color: '#807d75', accent: '#d0a667', interiorKind: 'apartment' },
  { id: 'ikeja-bungalow-court', name: 'Ikeja Bungalow Court', district: 'Ikeja', x: 76, z: -54, width: 8, depth: 8, height: 6, color: '#a39176', accent: '#c77954', interiorKind: 'house' },
  { id: 'civic-records-annex', name: 'Civic Records Annex', district: 'Alausa', x: -76, z: -30, width: 8, depth: 8, height: 12, color: '#a49c8e', accent: '#b58c56', interiorKind: 'office' },
  { id: 'island-retail-arcade', name: 'Island Retail Arcade', district: 'Lagos Island', x: 76, z: -30, width: 8, depth: 8, height: 7, color: '#9e7858', accent: '#d2a04e', interiorKind: 'shop' },
  { id: 'mainland-walkups', name: 'Mainland Walk-ups', district: 'Surulere', x: -76, z: 0, width: 8, depth: 8, height: 11, color: '#8e8173', accent: '#c79062', interiorKind: 'apartment' },
  { id: 'lekki-garden-duplex', name: 'Lekki Garden Duplex', district: 'Lekki', x: 76, z: 0, width: 8, depth: 8, height: 8, color: '#9a8e7d', accent: '#c97c59', interiorKind: 'house' },
  { id: 'apapa-dock-apartments', name: 'Apapa Dock Apartments', district: 'Apapa', x: -76, z: 30, width: 8, depth: 8, height: 12, color: '#747c7d', accent: '#c59b65', interiorKind: 'apartment' },
  { id: 'lekki-corner-shop', name: 'Lekki Corner Shop', district: 'Lekki', x: 76, z: 30, width: 8, depth: 8, height: 6, color: '#a17d5a', accent: '#d4a452', interiorKind: 'shop' },
  { id: 'ibeju-farm-house', name: 'Ibeju Farm House', district: 'Ibeju-Lekki', x: -76, z: 54, width: 8, depth: 8, height: 6, color: '#a28d6d', accent: '#c77a52', interiorKind: 'house' },
  { id: 'lekki-townhouse-row', name: 'Lekki Townhouse Row', district: 'Lekki', x: 76, z: 54, width: 8, depth: 8, height: 8, color: '#92887b', accent: '#c88962', interiorKind: 'house' },
  { id: 'yaba-creative-studio', name: 'Yaba Creative Studio', district: 'Yaba', x: 0, z: -54, width: 8, depth: 8, height: 9, color: '#777b7a', accent: '#d1a266', interiorKind: 'office' },
  { id: 'ikeja-market-arcade', name: 'Ikeja Market Arcade', district: 'Ikeja', x: 30, z: -54, width: 8, depth: 8, height: 6, color: '#987252', accent: '#d49a4d', interiorKind: 'shop' },
  { id: 'waterfront-offices', name: 'Waterfront Offices', district: 'Apapa', x: 54, z: 0, width: 8, depth: 8, height: 12, color: '#6f7a80', accent: '#d2ad68', interiorKind: 'office' },
] as const

export type CityBuildingId = (typeof CITY_BUILDINGS)[number]['id']
export type CityBuilding = (typeof CITY_BUILDINGS)[number]

export const LOCATION_INTERIOR_KINDS = {
  market: 'market',
  club: 'club',
  garage: 'garage',
  hotel: 'hotel',
  cafe: 'cafe',
  bank: 'bank',
  police: 'police',
  court: 'court',
  hospital: 'hospital',
  university: 'university',
  school: 'school',
  stadium: 'stadium',
  government: 'government',
  polling: 'polling',
  bungalow: 'bungalow',
  estate: 'estate',
  village: 'village',
  farm: 'farm',
  airport: 'airport',
  port: 'port',
  clubhouse: 'clubhouse',
  'event-center': 'event-center',
} as const

export type InteriorLocationId = keyof typeof LOCATION_INTERIOR_KINDS
export type GenericInteriorKind = 'apartment' | 'shop' | 'office' | 'house'
export type InteriorKind = (typeof LOCATION_INTERIOR_KINDS)[InteriorLocationId] | GenericInteriorKind
export type InteriorId = InteriorLocationId | CityBuildingId

export type InteriorDefinition = {
  id: InteriorId
  name: string
  district: string
  kind: InteriorKind
  actionLabel: string
  actionPoint: { x: number; z: number }
  exitPoint: { x: number; z: number }
}

const INTERIOR_ACTION_LABELS: Record<InteriorKind, string> = {
  market: 'Work the market counter',
  club: 'Check the event schedule',
  garage: 'Visit the service desk',
  hotel: 'Visit the reception desk',
  cafe: 'Order from the counter',
  bank: 'Use the teller terminal',
  police: 'Check in at the public desk',
  court: 'Review the public docket',
  hospital: 'Visit the nurse station',
  university: 'Attend a campus lecture',
  school: 'Join the evening study room',
  stadium: 'Check the grounds crew board',
  government: 'Visit the public service desk',
  polling: 'Register at the ward desk',
  bungalow: 'Use your home services',
  estate: 'Check in with estate services',
  village: 'Visit the community hall',
  farm: 'Visit the produce cooperative',
  airport: 'Check the flight and crew board',
  port: 'Visit the dispatch desk',
  clubhouse: 'Check in for training',
  'event-center': 'Check the event board',
  apartment: 'Visit the residence desk',
  shop: 'Open the shop counter',
  office: 'Visit the reception desk',
  house: 'Use your home services',
}

export const LOCATION_FOOTPRINTS: Partial<Record<LocationId, { width: number; depth: number; offsetX?: number; offsetZ?: number }>> = {
  market: { width: 9, depth: 7 },
  club: { width: 10, depth: 7 },
  garage: { width: 10, depth: 8 },
  hotel: { width: 10, depth: 8 },
  cafe: { width: 8, depth: 7 },
  bank: { width: 10, depth: 8 },
  police: { width: 12, depth: 9 },
  court: { width: 13, depth: 10 },
  hospital: { width: 13, depth: 10 },
  university: { width: 14, depth: 10 },
  school: { width: 13, depth: 9 },
  stadium: { width: 13, depth: 13 },
  government: { width: 13, depth: 10 },
  polling: { width: 8, depth: 6 },
  bungalow: { width: 11, depth: 8 },
  estate: { width: 12, depth: 9 },
  village: { width: 5, depth: 5, offsetX: 1, offsetZ: -5 },
  farm: { width: 6, depth: 4, offsetZ: -5.5 },
  airport: { width: 14, depth: 8 },
  port: { width: 13, depth: 10 },
  clubhouse: { width: 10, depth: 8 },
  'event-center': { width: 20, depth: 14 },
}

export const LOCATION_ENTRY_OFFSETS: Partial<Record<LocationId, { x: number; z: number }>> = {
  market: { x: 0, z: 4.2 },
  club: { x: 0, z: 4.2 },
  garage: { x: 0, z: 4.8 },
  hotel: { x: 0, z: 4.8 },
  cafe: { x: 0, z: 4.2 },
  bank: { x: 0, z: 4.8 },
  police: { x: 0, z: 5.3 },
  court: { x: 0, z: 5.8 },
  hospital: { x: 0, z: 5.8 },
  university: { x: 0, z: 5.8 },
  school: { x: 0, z: 5.3 },
  stadium: { x: 0, z: 7.6 },
  government: { x: 0, z: 5.8 },
  polling: { x: 0, z: 3.8 },
  bungalow: { x: 0, z: 4.8 },
  estate: { x: 0, z: 5.3 },
  village: { x: 1, z: -2.8 },
  farm: { x: 0, z: -2.5 },
  airport: { x: 0, z: 5.2 },
  port: { x: 0, z: 6 },
  clubhouse: { x: 0, z: 4.8 },
  'event-center': { x: 0, z: 9.3 },
}

export function getLocationEntrancePosition(locationId: LocationId) {
  const location = WORLD_LOCATIONS.find((entry) => entry.id === locationId)
  const offset = LOCATION_ENTRY_OFFSETS[locationId]
  return location && offset ? { x: location.x + offset.x, z: location.z + offset.z } : null
}

export function getBuildingEntrancePosition(building: CityBuilding) {
  return { x: building.x, z: building.z + building.depth / 2 + 1.1 }
}

export function isInteriorId(value: unknown): value is InteriorId {
  return typeof value === 'string' && (
    Object.prototype.hasOwnProperty.call(LOCATION_INTERIOR_KINDS, value) ||
    CITY_BUILDINGS.some((building) => building.id === value)
  )
}

export function getInteriorDefinition(id: string): InteriorDefinition | null {
  const location = WORLD_LOCATIONS.find((entry) => entry.id === id)
  if (location && Object.prototype.hasOwnProperty.call(LOCATION_INTERIOR_KINDS, id)) {
    const kind = LOCATION_INTERIOR_KINDS[id as InteriorLocationId]
    return {
      id: id as InteriorId,
      name: location.name,
      district: location.district,
      kind,
      actionLabel: INTERIOR_ACTION_LABELS[kind],
      actionPoint: { x: 0, z: -3.4 },
      exitPoint: { x: 0, z: 6.2 },
    }
  }

  const building = CITY_BUILDINGS.find((entry) => entry.id === id)
  if (!building) return null
  return {
    id: building.id,
    name: building.name,
    district: building.district,
    kind: building.interiorKind,
    actionLabel: INTERIOR_ACTION_LABELS[building.interiorKind],
    actionPoint: { x: 0, z: -3.4 },
    exitPoint: { x: 0, z: 6.2 },
  }
}

export const CITY_COLLISION_BLOCKS = [
  ...CITY_BUILDINGS.map(({ id, x, z, width, depth }) => ({ id, x, z, width, depth })),
  ...WORLD_LOCATIONS.flatMap((location) => {
    const footprint = LOCATION_FOOTPRINTS[location.id]
    return footprint ? [{
      id: `landmark-${location.id}`,
      x: location.x + (footprint.offsetX ?? 0),
      z: location.z + (footprint.offsetZ ?? 0),
      width: footprint.width,
      depth: footprint.depth,
    }] : []
  }),
]

export const CITY_CHARACTERS = [
  {
    id: 'admin',
    name: 'Adebayo R.',
    role: 'City admin',
    x: 0,
    z: 0,
    locationId: 'square',
    color: '#d8b46f',
    skinTone: '#8f6748',
    hairColor: '#261d1a',
    accentColor: '#e5cc8d',
    intro: 'I manage the city systems, road safety, and world flow. Ask me for admin tools.',
  },
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
    x: 28,
    z: -24.5,
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
    x: -28,
    z: 36.2,
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
    x: 33,
    z: 37,
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
    x: 3,
    z: 36.5,
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
    x: -50,
    z: 12.3,
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
    x: -28,
    z: 1.5,
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
    x: 51,
    z: -20.5,
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
    x: -123,
    z: -22.4,
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
    x: 1,
    z: 52,
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
    x: 51,
    z: 37.5,
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
    z: 38,
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
    x: 0,
    z: -18.5,
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
    tasks: ['Unload produce crates', 'Restock the evening stalls', 'Log the market closeout'],
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
    tasks: ['Check the supply cart', 'Deliver ward supplies', 'Update the shift handover']
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
    tasks: ['Sort the fresh produce', 'Pack the market order', 'Load the cooperative van']
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
    tasks: ['Review the cargo manifest', 'Check container seals', 'Send dispatch clearance']
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
    tasks: ['Check in with the desk officer', 'Walk the marked route', 'Log a street-light issue']
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
    tasks: ['Inspect the pitch perimeter', 'Clear the supporter stands', 'Sign the match-day checklist']
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
    tasks: ['Set up the market stalls', 'Guide evening guests', 'Complete the venue closeout'],
  },
  {
    id: 'bank-assistant',
    title: 'Customer service associate',
    employer: 'Eko Cooperative Bank',
    locationId: 'bank',
    category: 'FINANCE & PUBLIC SERVICE',
    pay: 700,
    reputation: 18,
    description: 'Help the branch team prepare accounts and close a clean evening ledger.',
    tasks: ['Prepare the teller counter', 'Assist with customer requests', 'Reconcile the branch ledger'],
  },
  {
    id: 'campus-assistant',
    title: 'Campus research assistant',
    employer: 'University of Lagos',
    locationId: 'university',
    category: 'EDUCATION',
    pay: 560,
    reputation: 16,
    description: 'Support a seminar, organize course materials, and help the lecturer close attendance.',
    tasks: ['Collect lecture materials', 'Assist the seminar group', 'Submit the attendance record'],
  },
  {
    id: 'airport-ground-crew',
    title: 'Airport ground crew',
    employer: 'Murtala Muhammed Airport',
    locationId: 'airport',
    category: 'AVIATION & LOGISTICS',
    pay: 640,
    reputation: 14,
    description: 'Complete a safe gate turnaround and prepare the aircraft for its next departure.',
    tasks: ['Check the gate equipment', 'Guide baggage carts', 'Confirm the turnaround checklist'],
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
export type GamePanel = 'none' | 'map' | 'jobs' | 'life' | 'inventory' | 'online' | 'admin'
export type Gender = 'male' | 'female'
export type RideVehicleType = 'cab' | 'bike' | 'danfo' | 'driver'
export type RideBookingStatus = 'dispatching' | 'approaching' | 'boarding' | 'en-route' | 'arrived'
export type RideBooking = {
  id: number
  destinationId: LocationId
  mode: RideVehicleType
  fare: number
  status: RideBookingStatus
}

export function estimateRideFare(distance: number, mode: RideVehicleType) {
  const rates: Record<RideVehicleType, { base: number; perUnit: number }> = {
    cab: { base: 300, perUnit: 34 },
    bike: { base: 150, perUnit: 24 },
    danfo: { base: 80, perUnit: 9 },
    driver: { base: 800, perUnit: 46 },
  }
  const fare = rates[mode].base + Math.ceil(Math.max(0, distance) * rates[mode].perUnit)
  return Math.ceil(fare / 50) * 50
}

export type InventoryItemId = 'city-guide' | 'suya' | 'parcel'

export type InventoryItem = {
  id: InventoryItemId
  name: string
  quantity: number
  detail: string
}

export type PlayerState = {
  name: string
  gender: Gender
  cash: number
  bankBalance: number
  reputation: number
  level: number
  energy: number
  hunger: number
  educationCredits: number
  stage: MissionStage
  inventory: InventoryItem[]
  ownsScooter: boolean
  inVehicle: boolean
  completedRuns: number
  completedShifts: number
  shiftStarted: boolean
  completedShiftTasks: number[]
  currentInteriorId: InteriorId | null
  returnPosition: { x: number; z: number } | null
  job: JobId | null
  faction: FactionId | null
  home: HomeId | null
  voterRegistered: boolean
  wantedLevel: number
  adminMode: boolean
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
  gender: 'male',
  cash: 1850,
  bankBalance: 0,
  reputation: 46,
  level: 1,
  energy: 83,
  hunger: 64,
  educationCredits: 0,
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
  shiftStarted: false,
  completedShiftTasks: [],
  currentInteriorId: null,
  returnPosition: null,
  job: null,
  faction: null,
  home: null,
  voterRegistered: false,
  wantedLevel: 0,
  adminMode: false,
}

export type PlayerAction =
  | { type: 'restore'; player: PlayerState }
  | { type: 'rename'; name: string }
  | { type: 'set-gender'; gender: Gender }
  | { type: 'deposit-bank'; amount: number }
  | { type: 'withdraw-bank'; amount: number }
  | { type: 'pay-ride'; amount: number }
  | { type: 'attend-lecture' }
  | { type: 'enter-interior'; interiorId: InteriorId; returnPosition: { x: number; z: number } }
  | { type: 'exit-interior' }
  | { type: 'meet-bisi' }
  | { type: 'accept-delivery' }
  | { type: 'complete-delivery' }
  | { type: 'rent-scooter' }
  | { type: 'toggle-vehicle' }
  | { type: 'rest' }
  | { type: 'buy-food' }
  | { type: 'eat-food' }
  | { type: 'apply-job'; jobId: JobId }
  | { type: 'start-shift'; jobId: JobId }
  | { type: 'complete-work-task'; jobId: JobId; taskIndex: number }
  | { type: 'complete-shift'; jobId: JobId }
  | { type: 'join-faction'; factionId: FactionId | null }
  | { type: 'lease-home'; homeId: HomeId }
  | { type: 'register-voter' }
  | { type: 'resolve-court' }
  | { type: 'toggle-admin'; enabled?: boolean }
  | { type: 'admin-grant'; amount: number }

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
    case 'set-gender':
      return { ...state, gender: action.gender }
    case 'deposit-bank': {
      if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.amount > state.cash) return state
      if (state.bankBalance + action.amount > 1_000_000) return state
      return { ...state, cash: state.cash - action.amount, bankBalance: state.bankBalance + action.amount }
    }
    case 'withdraw-bank': {
      if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.amount > state.bankBalance) return state
      if (state.cash + action.amount > 1_000_000) return state
      return { ...state, cash: state.cash + action.amount, bankBalance: state.bankBalance - action.amount }
    }
    case 'pay-ride': {
      if (!Number.isSafeInteger(action.amount) || action.amount <= 0 || action.amount > state.cash) return state
      return { ...state, cash: state.cash - action.amount }
    }
    case 'attend-lecture': {
      if (state.energy < 12 || state.hunger < 5) return state
      const reputation = state.reputation + 8
      return {
        ...state,
        energy: state.energy - 12,
        hunger: state.hunger - 5,
        educationCredits: state.educationCredits + 1,
        ...updateReputation(state, reputation),
      }
    }
    case 'enter-interior':
      if (state.currentInteriorId) return state
      return { ...state, currentInteriorId: action.interiorId, returnPosition: action.returnPosition, inVehicle: false }
    case 'exit-interior':
      return state.currentInteriorId ? { ...state, currentInteriorId: null, returnPosition: null } : state
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
      return { ...state, job: action.jobId, shiftStarted: false, completedShiftTasks: [] }
    case 'start-shift': {
      if (state.job !== action.jobId || state.shiftStarted) return state
      return { ...state, shiftStarted: true, completedShiftTasks: [] }
    }
    case 'complete-work-task': {
      const job = CITY_JOBS.find((entry) => entry.id === action.jobId)
      if (!job || state.job !== action.jobId || !state.shiftStarted) return state
      if (!Number.isSafeInteger(action.taskIndex) || action.taskIndex < 0 || action.taskIndex >= job.tasks.length) return state
      if (state.completedShiftTasks.includes(action.taskIndex)) return state
      return {
        ...state,
        energy: Math.max(0, state.energy - 3),
        hunger: Math.max(0, state.hunger - 2),
        completedShiftTasks: [...state.completedShiftTasks, action.taskIndex].sort((a, b) => a - b),
      }
    }
    case 'complete-shift': {
      const job = CITY_JOBS.find((entry) => entry.id === action.jobId)
      if (!job || state.job !== action.jobId || !state.shiftStarted) return state
      if (state.completedShiftTasks.length !== job.tasks.length) return state
      const reputation = state.reputation + job.reputation
      return {
        ...state,
        cash: state.cash + job.pay,
        energy: Math.max(0, state.energy - 10),
        hunger: Math.max(0, state.hunger - 8),
        completedShifts: state.completedShifts + 1,
        shiftStarted: false,
        completedShiftTasks: [],
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
    case 'toggle-admin': {
      return { ...state, adminMode: action.enabled ?? !state.adminMode }
    }
    case 'admin-grant': {
      const grant = Math.max(0, action.amount)
      return {
        ...state,
        cash: state.cash + grant,
        bankBalance: state.bankBalance + grant,
        reputation: Math.max(100, state.reputation + 20),
        energy: 100,
        hunger: 100,
        wantedLevel: 0,
        adminMode: true,
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
