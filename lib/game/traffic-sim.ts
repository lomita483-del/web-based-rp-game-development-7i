// Lane-based traffic simulation. Pure TypeScript (no three.js) so it can be unit tested.
//
// Every road has one lane per direction and traffic keeps to the RIGHT (as in Nigeria).
// Vehicles follow the car in front using a safe-speed rule, stop at red lights and queue,
// and a periodic breakdown on a busy road creates a realistic go-slow/traffic jam.

import {
  BRIDGE,
  FLYOVER,
  ROADS,
  SIGNAL_LINES,
  getSignalState,
  laneOffset,
  type Axis,
} from './world'

export type VehicleKind = 'car' | 'danfo' | 'keke' | 'truck' | 'bike'

export const VEHICLE_LENGTH: Record<VehicleKind, number> = {
  car: 4.2,
  danfo: 5.6,
  keke: 2.8,
  truck: 8.2,
  bike: 2.0,
}

const SPEED_RANGE: Record<VehicleKind, [number, number]> = {
  car: [9, 13],
  danfo: [8, 11],
  keke: [6, 8],
  truck: [7, 9.5],
  bike: [10, 13],
}

/** Distance from the junction centre to the front bumper of a stopped car. */
export const STOP_LINE_DISTANCE = 5.6
const MIN_GAP = 1.6
const COMFORT_BRAKE = 5
const MAX_BRAKE = 8
const ACCELERATION = 3.4

export type LaneSignal = { pStop: number; ix: number; iz: number }
export type SlowZone = { from: number; to: number; factor: number }

export type Lane = {
  id: string
  roadId: string
  axis: Axis
  dir: 1 | -1
  /** Perpendicular coordinate of the lane centre (z for axis 'x', x for axis 'z'). */
  fixed: number
  from: number
  to: number
  length: number
  /** Height of the road surface. */
  y: number
  elevated: boolean
  signals: LaneSignal[]
  slowZones: SlowZone[]
  allowed: VehicleKind[]
}

export type Breakdown = { start: number; duration: number; period: number }

export type Vehicle = {
  id: number
  lane: number
  kind: VehicleKind
  /** Distance travelled along the lane from its start. */
  p: number
  v: number
  v0: number
  length: number
  /** Sideways offset within the lane (positive towards the kerb on the driver's right). */
  lateral: number
  /** Index used by the renderer to pick a paint colour. */
  shade: number
  breakdown?: Breakdown
}

export type TrafficWorld = {
  time: number
  lanes: Lane[]
  vehicles: Vehicle[]
  /** Vehicle indices per lane, kept sorted by p. */
  byLane: number[][]
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function laneSignals(axis: Axis, dir: 1 | -1, from: number, to: number, fixedRoad: number): LaneSignal[] {
  if (!SIGNAL_LINES.includes(fixedRoad as (typeof SIGNAL_LINES)[number])) return []
  const signals: LaneSignal[] = []
  for (const c of SIGNAL_LINES) {
    const frontStopCoordinate = c - dir * STOP_LINE_DISTANCE
    const pStop = dir > 0 ? frontStopCoordinate - from : to - frontStopCoordinate
    // The first/last junctions of a lane do not need a light if they are outside the lane.
    if (pStop < 0 || pStop > to - from) continue
    signals.push({
      pStop,
      ix: axis === 'x' ? c : fixedRoad,
      iz: axis === 'x' ? fixedRoad : c,
    })
  }
  return signals.sort((a, b) => a.pStop - b.pStop)
}

function buildLanes() {
  const lanes: Lane[] = []
  for (const road of ROADS) {
    const offset = laneOffset(road.width)
    for (const dir of [1, -1] as const) {
      const fixed = road.axis === 'x' ? road.fixed + dir * offset : road.fixed - dir * offset
      lanes.push({
        id: `${road.id}:${dir > 0 ? '+' : '-'}`,
        roadId: road.id,
        axis: road.axis,
        dir,
        fixed,
        from: road.from,
        to: road.to,
        length: road.to - road.from,
        y: 0,
        elevated: false,
        signals: laneSignals(road.axis, dir, road.from, road.to, road.fixed),
        slowZones: [],
        allowed: ['car', 'danfo', 'keke', 'truck', 'bike'],
      })
    }
  }

  // The flyover and the lagoon bridge: fast roads, no keke or okada (banned on bridges in Lagos).
  const elevatedRoads = [
    { id: 'flyover', spec: FLYOVER, offset: 2.4 },
    { id: 'bridge', spec: BRIDGE, offset: 1.7 },
  ]
  for (const { id, spec, offset } of elevatedRoads) {
    for (const dir of [1, -1] as const) {
      lanes.push({
        id: `${id}:${dir > 0 ? '+' : '-'}`,
        roadId: id,
        axis: 'x',
        dir,
        fixed: spec.z + dir * offset,
        from: spec.from,
        to: spec.to,
        length: spec.to - spec.from,
        y: spec.deckTop,
        elevated: true,
        signals: [],
        slowZones: [],
        allowed: ['car', 'danfo', 'truck'],
      })
    }
  }
  return lanes
}

function pickKind(rng: () => number, allowed: VehicleKind[]): VehicleKind {
  const weights: Record<VehicleKind, number> = { car: 0.4, danfo: 0.19, keke: 0.14, truck: 0.1, bike: 0.17 }
  const total = allowed.reduce((sum, kind) => sum + weights[kind], 0)
  let roll = rng() * total
  for (const kind of allowed) {
    roll -= weights[kind]
    if (roll <= 0) return kind
  }
  return allowed[0]
}

export function laneIndexById(world: TrafficWorld, id: string) {
  return world.lanes.findIndex((lane) => lane.id === id)
}

/** `density` scales how many vehicles each lane carries (graphics setting); lanes always keep at least two. */
export function createTrafficWorld(seed = 7, density = 1): TrafficWorld {
  const rng = mulberry32(seed)
  const lanes = buildLanes()
  const vehicles: Vehicle[] = []
  const byLane: number[][] = lanes.map(() => [])

  // Go-slow: the eastbound side of the lagoon bridge crawls through its middle section.
  const bridgeEast = lanes.find((lane) => lane.id === 'bridge:+')
  if (bridgeEast) bridgeEast.slowZones.push({ from: 52, to: 112, factor: 0.28 })

  lanes.forEach((lane, laneIndex) => {
    const core = lane.roadId.length > 0 && /^[hv](-?\d+)$/.test(lane.roadId) && Math.abs(Number(lane.roadId.slice(1))) <= 42
    const spacing = lane.elevated ? 42 : core ? 46 : 60
    let count = Math.max(2, Math.round((lane.length / spacing) * density))
    // Extra demand on the two roads that jam.
    if (lane.id === 'bridge:+' || lane.id === 'h-18:+') count += Math.round(3 * density)
    const slot = lane.length / count
    for (let i = 0; i < count; i += 1) {
      const kind = pickKind(rng, lane.allowed)
      const [lo, hi] = SPEED_RANGE[kind]
      const limit = lane.elevated ? 1.45 : 1
      const vehicle: Vehicle = {
        id: vehicles.length,
        lane: laneIndex,
        kind,
        p: i * slot + slot * (0.15 + rng() * 0.5),
        v: 0,
        v0: (lo + rng() * (hi - lo)) * limit,
        length: VEHICLE_LENGTH[kind],
        lateral: kind === 'bike' ? (rng() < 0.5 ? -0.55 : 0.55) : kind === 'keke' ? 0.1 : 0,
        shade: Math.floor(rng() * 8),
      }
      vehicle.v = vehicle.v0 * 0.6
      vehicles.push(vehicle)
      byLane[laneIndex].push(vehicle.id)
    }
  })

  const world: TrafficWorld = { time: 0, lanes, vehicles, byLane }

  // A danfo breaks down beside Balogun Night Market and holds up the road behind it.
  const marketLane = laneIndexById(world, 'h-18:+')
  if (marketLane >= 0) {
    const lane = lanes[marketLane]
    const target = byLane[marketLane][Math.floor(byLane[marketLane].length / 2)]
    const broken = vehicles[target]
    broken.kind = 'danfo'
    broken.length = VEHICLE_LENGTH.danfo
    broken.v0 = 9
    broken.lateral = 0
    broken.p = 30 - lane.from // x = 30, beside the market
    broken.breakdown = { start: 4, duration: 46, period: 110 }
  }

  sortLanes(world)
  return world
}

function sortLanes(world: TrafficWorld) {
  for (const ids of world.byLane) {
    ids.sort((a, b) => world.vehicles[a].p - world.vehicles[b].p)
  }
}

export function isStalled(vehicle: Vehicle, time: number) {
  const b = vehicle.breakdown
  if (!b) return false
  const t = (((time - b.start) % b.period) + b.period) % b.period
  return time >= b.start && t < b.duration
}

function zoneFactor(lane: Lane, p: number) {
  for (const zone of lane.slowZones) {
    if (p >= zone.from && p <= zone.to) return zone.factor
  }
  return 1
}

export function stepTraffic(world: TrafficWorld, rawDt: number) {
  const dt = Math.min(Math.max(rawDt, 0), 0.05)
  if (dt === 0) return
  world.time += dt
  const { vehicles, lanes, byLane } = world

  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
    const lane = lanes[laneIndex]
    const ids = byLane[laneIndex]
    const n = ids.length
    if (n === 0) continue

    // Snapshot leader state first so every vehicle reacts to the same instant.
    const desired = new Array<number>(n)
    for (let k = 0; k < n; k += 1) {
      const vehicle = vehicles[ids[k]]
      let vmax = vehicle.v0 * zoneFactor(lane, vehicle.p)
      if (isStalled(vehicle, world.time)) vmax = 0

      if (n > 1) {
        const leader = vehicles[ids[(k + 1) % n]]
        const leaderP = k === n - 1 ? leader.p + lane.length : leader.p
        const gap = leaderP - vehicle.p - (leader.length + vehicle.length) / 2 - MIN_GAP
        vmax = Math.min(vmax, Math.sqrt(leader.v * leader.v + 2 * COMFORT_BRAKE * Math.max(0, gap)))
      }

      const front = vehicle.p + vehicle.length / 2
      for (const signal of lane.signals) {
        const distance = signal.pStop - front
        if (distance < -0.2) continue
        const state = getSignalState(lane.axis, signal.ix, signal.iz, world.time)
        if (state !== 'green') {
          const stoppingDistance = (vehicle.v * vehicle.v) / (2 * MAX_BRAKE)
          const canStop = stoppingDistance <= distance + 0.6
          const committed = !canStop && (state === 'yellow' || distance < 3)
          if (!committed) vmax = Math.min(vmax, Math.sqrt(2 * COMFORT_BRAKE * Math.max(0, distance)))
        }
        break // only the next junction matters
      }
      desired[k] = vmax
    }

    for (let k = 0; k < n; k += 1) {
      const vehicle = vehicles[ids[k]]
      const target = desired[k]
      if (vehicle.v < target) vehicle.v = Math.min(target, vehicle.v + ACCELERATION * dt)
      else vehicle.v = Math.max(target, vehicle.v - MAX_BRAKE * dt)
      vehicle.p += vehicle.v * dt
    }

    // Hard safety net: never let bodies overlap, whatever the frame rate did.
    for (let k = n - 1; k >= 0; k -= 1) {
      if (n < 2) break
      const vehicle = vehicles[ids[k]]
      const leader = vehicles[ids[(k + 1) % n]]
      const leaderP = k === n - 1 ? leader.p + lane.length : leader.p
      const limitP = leaderP - (leader.length + vehicle.length) / 2 - 0.35
      if (vehicle.p > limitP) {
        vehicle.p = limitP
        vehicle.v = Math.min(vehicle.v, leader.v)
      }
    }

    for (let k = 0; k < n; k += 1) {
      const vehicle = vehicles[ids[k]]
      if (vehicle.p >= lane.length) vehicle.p -= lane.length
      else if (vehicle.p < 0) vehicle.p += lane.length
    }
  }

  sortLanes(world)
}

export type VehiclePose = { x: number; y: number; z: number; heading: number }

/** World position and heading (rotation about Y for a model that faces +Z). */
export function vehiclePose(world: TrafficWorld, vehicle: Vehicle, out: VehiclePose): VehiclePose {
  const lane = world.lanes[vehicle.lane]
  const s = lane.dir > 0 ? lane.from + vehicle.p : lane.to - vehicle.p
  if (lane.axis === 'x') {
    out.x = s
    out.z = lane.fixed + lane.dir * vehicle.lateral
    out.heading = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2
  } else {
    out.x = lane.fixed - lane.dir * vehicle.lateral
    out.z = s
    out.heading = lane.dir > 0 ? 0 : Math.PI
  }
  out.y = lane.y
  return out
}

/** Where stalled vehicles are right now (for hazard triangles). */
export function activeBreakdowns(world: TrafficWorld) {
  const result: VehiclePose[] = []
  for (const vehicle of world.vehicles) {
    if (vehicle.breakdown && isStalled(vehicle, world.time)) {
      result.push(vehiclePose(world, vehicle, { x: 0, y: 0, z: 0, heading: 0 }))
    }
  }
  return result
}
