// Street furniture layout computed from the real road grid, so trees, lamps, signs and traffic
// lights always stand on the kerb side (sidewalk), never in the carriageway or a junction.
import { ENTRANCES } from '@/components/game/game-data'
import { FLYOVER, GRID_LINES, ROADS, SIGNAL_LINES, WORLD_BOUNDS, type Axis } from './world'
import { STOP_LINE_DISTANCE } from './traffic-sim'

export type Prop = { x: number; z: number; /** Rotation about Y that makes the prop face the road. */ rotY: number; scale: number }
export type SignalHead = {
  id: string
  x: number
  z: number
  /** Axis of travel this head controls. */
  axis: Axis
  /** Junction the head belongs to. */
  ix: number
  iz: number
  /** Rotation about Y so the lamps face oncoming traffic. */
  rotY: number
}
export type Billboard = Prop & { text: string; color: string; width: number; height: number; poleHeight: number }

/** Distance from a road's centre line to the centre of its sidewalk strip. */
export const SIDEWALK_CENTRE = 0.8
/** Where poles and trunks stand: inside the sidewalk, clear of the kerb. */
const FURNITURE_OFFSET = 1.1

const GRID_ROADS = ROADS.filter((road) => /^[hv]-?\d+$/.test(road.id))

function halfWidthOf(fixed: number) {
  return Math.abs(fixed) <= 42 ? 3.5 : 2.5
}

/** True if a point lies on tarmac, a kerb or a zebra crossing (with a margin). */
export function isOnCarriageway(x: number, z: number, margin = 0.35) {
  for (const road of GRID_ROADS) {
    const half = road.width / 2 + margin
    if (road.axis === 'x') {
      if (x >= road.from - 1 && x <= road.to + 1 && Math.abs(z - road.fixed) < half) return true
    } else if (z >= road.from - 1 && z <= road.to + 1 && Math.abs(x - road.fixed) < half) return true
  }
  return false
}

/** Distance along a road before a junction where furniture must not stand (junction + crossing + queue space). */
function junctionClearance(crossFixed: number) {
  return halfWidthOf(crossFixed) + 4.2
}

function nearJunction(road: (typeof GRID_ROADS)[number], t: number, pad = 0) {
  for (const line of GRID_LINES) {
    if (Math.abs(t - line) < junctionClearance(line) + pad) return true
  }
  return false
}

function nearEntrance(x: number, z: number, radius = 3.2) {
  return ENTRANCES.some((entrance) => Math.hypot(entrance.x - x, entrance.z - z) < radius)
}

function inWorld(x: number, z: number) {
  return x > WORLD_BOUNDS.minX + 1 && x < WORLD_BOUNDS.maxX - 1 && z > WORLD_BOUNDS.minZ + 1 && z < WORLD_BOUNDS.maxZ - 8
}

/** Roads whose sidewalks are kept free (the flyover deck covers its road). */
function isCovered(road: (typeof GRID_ROADS)[number]) {
  return road.axis === 'x' && road.fixed === FLYOVER.z
}

function sidewalkPoint(road: (typeof GRID_ROADS)[number], t: number, side: -1 | 1, offset: number) {
  const half = road.width / 2
  const lateral = road.fixed + side * (half + offset)
  return road.axis === 'x' ? { x: t, z: lateral } : { x: lateral, z: t }
}

/** Rotation about Y so a prop that faces +Z looks at the road centre line. */
function facingRoad(road: (typeof GRID_ROADS)[number], side: -1 | 1) {
  // Facing the road means looking in -side along the cross axis.
  if (road.axis === 'x') return side > 0 ? Math.PI : 0
  return side > 0 ? -Math.PI / 2 : Math.PI / 2
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function placeAlong(spacing: number, phase: number, build: (road: (typeof GRID_ROADS)[number], t: number, side: -1 | 1, index: number) => Prop | null) {
  const result: Prop[] = []
  GRID_ROADS.forEach((road, roadIndex) => {
    if (isCovered(road)) return
    for (const side of [-1, 1] as const) {
      const sideShift = side > 0 ? spacing / 2 : 0
      for (let t = road.from + 6 + phase + sideShift; t < road.to - 6; t += spacing) {
        const prop = build(road, t + (hash(t + roadIndex * 17 + side) - 0.5) * 2.4, side, result.length)
        if (prop) result.push(prop)
      }
    }
  })
  return result
}

export function createTrees(): Prop[] {
  return placeAlong(15, 3, (road, t, side, index) => {
    if (nearJunction(road, t, 1.2)) return null
    const point = sidewalkPoint(road, t, side, FURNITURE_OFFSET + 0.15)
    if (!inWorld(point.x, point.z) || isOnCarriageway(point.x, point.z) || nearEntrance(point.x, point.z, 4)) return null
    return { ...point, rotY: hash(index) * Math.PI * 2, scale: 0.8 + hash(index + 9) * 0.32 }
  })
}

export function createLamps(): Prop[] {
  return placeAlong(24, 10.5, (road, t, side) => {
    if (nearJunction(road, t, 0.4)) return null
    const point = sidewalkPoint(road, t, side, FURNITURE_OFFSET - 0.15)
    if (!inWorld(point.x, point.z) || isOnCarriageway(point.x, point.z) || nearEntrance(point.x, point.z)) return null
    return { ...point, rotY: facingRoad(road, side), scale: 1 }
  })
}

const BILLBOARD_ADS = [
  { text: 'EKO CIVIC SQUARE', color: '#132b3b' },
  { text: 'VICTORIA ISLAND', color: '#174c48' },
  { text: 'LAGOS BUSINESS DISTRICT', color: '#6a3b25' },
  { text: 'BALOGUN MARKET · OPEN LATE', color: '#5b2433' },
  { text: 'DRINK ZOBO · STAY COOL', color: '#7a2f2a' },
  { text: 'IKEJA AIRPORT · 12 MIN', color: '#23405e' },
  { text: 'UNILAG · OPEN DAY', color: '#244d2c' },
  { text: 'KEKE FARES · ASK FIRST', color: '#6b5a1e' },
]

/** Roadside signs and billboards, each standing on a sidewalk facing traffic. */
export function createBillboards(): Billboard[] {
  const picks: { road: string; t: number; side: -1 | 1 }[] = [
    { road: 'h-18', t: -52, side: -1 },
    { road: 'h18', t: 32, side: 1 },
    { road: 'h42', t: -60, side: -1 },
    { road: 'h-18', t: 56, side: -1 },
    { road: 'v-18', t: 8, side: 1 },
    { road: 'v18', t: -28, side: -1 },
    { road: 'h42', t: 56, side: 1 },
    { road: 'v66', t: -20, side: -1 },
  ]
  const boards: Billboard[] = []
  picks.forEach((pick, index) => {
    const road = GRID_ROADS.find((entry) => entry.id === pick.road)
    if (!road) return
    // Slide along the road until the spot is clear of junctions and doorways.
    for (let shift = 0; shift < 60; shift += 3) {
      for (const sign of [1, -1]) {
        const t = pick.t + shift * sign
        if (nearJunction(road, t, 6.5)) continue
        const point = sidewalkPoint(road, t, pick.side, 1.3)
        if (!inWorld(point.x, point.z) || nearEntrance(point.x, point.z, 5)) continue
        const ad = BILLBOARD_ADS[index % BILLBOARD_ADS.length]
        boards.push({ ...point, rotY: facingRoad(road, pick.side), scale: 1, ...ad, width: index % 3 === 0 ? 10 : 7, height: index % 3 === 0 ? 3.4 : 2.6, poleHeight: index % 3 === 0 ? 7.2 : 5.4 })
        return
      }
    }
  })
  return boards
}

/** Four signal heads per junction, each on the driver's right-hand kerb just behind its stop line. */
export function createSignalHeads(): SignalHead[] {
  const heads: SignalHead[] = []
  for (const ix of SIGNAL_LINES) {
    for (const iz of SIGNAL_LINES) {
      const halfX = halfWidthOf(ix)
      const halfZ = halfWidthOf(iz)
      const back = STOP_LINE_DISTANCE + 0.8
      // Traffic along x: +x lane is on the +z side (driver's right is +z); heads face the approaching traffic.
      heads.push({ id: `${ix},${iz}:x+`, axis: 'x', ix, iz, x: ix - back, z: iz + halfZ + 0.75, rotY: -Math.PI / 2 })
      heads.push({ id: `${ix},${iz}:x-`, axis: 'x', ix, iz, x: ix + back, z: iz - halfZ - 0.75, rotY: Math.PI / 2 })
      // Traffic along z: +z lane is on the -x side.
      heads.push({ id: `${ix},${iz}:z+`, axis: 'z', ix, iz, x: ix - halfX - 0.75, z: iz - back, rotY: Math.PI })
      heads.push({ id: `${ix},${iz}:z-`, axis: 'z', ix, iz, x: ix + halfX + 0.75, z: iz + back, rotY: 0 })
    }
  }
  return heads
}
