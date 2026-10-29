// Shared world layout: bounds, road grid, traffic signals and the map projection.
// Pure data and functions (no three.js) so the server, HUD, traffic simulation and renderer agree.

export type Axis = 'x' | 'z'

/** Centre lines of the main street grid. Roads run along both axes at these offsets. */
export const GRID_LINES = [-66, -42, -18, 18, 42, 66] as const

/** Intersections that have traffic lights (the 4 x 4 core of the grid). */
export const SIGNAL_LINES = [-42, -18, 18, 42] as const

/** The University of Lagos campus sits west of the street grid, on its own walled ground (not under the flyover). */
export const CAMPUS_BOUNDS = { minX: -146, maxX: -92, minZ: -40, maxZ: 40 } as const

/** Z centres of the two campus gates, each 8 units wide. They line up with the h-18 and h18 avenues. */
export const CAMPUS_GATE_Z = [-18, 18] as const
export const CAMPUS_GATE_WIDTH = 8

export const WORLD_BOUNDS = { minX: -144.5, maxX: 82, minZ: -82, maxZ: 78 } as const

export function roadWidth(offset: number) {
  return Math.abs(offset) <= 42 ? 7 : 5
}

export function isInCampus(x: number, z: number) {
  return x <= CAMPUS_BOUNDS.maxX && x >= CAMPUS_BOUNDS.minX && z >= CAMPUS_BOUNDS.minZ && z <= CAMPUS_BOUNDS.maxZ
}

/** Keeps a world position inside the playable world (city grid plus the walled campus). */
export function clampToWorld(x: number, z: number) {
  return {
    x: Math.min(WORLD_BOUNDS.maxX, Math.max(WORLD_BOUNDS.minX, x)),
    z: Math.min(WORLD_BOUNDS.maxZ, Math.max(WORLD_BOUNDS.minZ, z)),
  }
}

export type WallBlock = { id: string; x: number; z: number; width: number; depth: number }

const WALL_THICKNESS = 1.4
const WALL_X = CAMPUS_BOUNDS.maxX - 0.5
const gateHalf = CAMPUS_GATE_WIDTH / 2

/** Solid walls around the campus; the only way in or out is through the two gates. */
export const CAMPUS_WALLS: WallBlock[] = [
  // East wall, broken by the two gates.
  { id: 'wall-east-a', x: WALL_X, z: (-82 + (CAMPUS_GATE_Z[0] - gateHalf)) / 2, width: WALL_THICKNESS, depth: CAMPUS_GATE_Z[0] - gateHalf + 82 },
  { id: 'wall-east-b', x: WALL_X, z: 0, width: WALL_THICKNESS, depth: CAMPUS_GATE_Z[1] - gateHalf - (CAMPUS_GATE_Z[0] + gateHalf) },
  { id: 'wall-east-c', x: WALL_X, z: (CAMPUS_GATE_Z[1] + gateHalf + 78) / 2, width: WALL_THICKNESS, depth: 78 - (CAMPUS_GATE_Z[1] + gateHalf) },
  // North, south and west walls.
  { id: 'wall-north', x: (CAMPUS_BOUNDS.minX + CAMPUS_BOUNDS.maxX) / 2, z: CAMPUS_BOUNDS.minZ - 0.7, width: CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX + 1.4, depth: WALL_THICKNESS },
  { id: 'wall-south', x: (CAMPUS_BOUNDS.minX + CAMPUS_BOUNDS.maxX) / 2, z: CAMPUS_BOUNDS.maxZ + 0.7, width: CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX + 1.4, depth: WALL_THICKNESS },
  { id: 'wall-west', x: CAMPUS_BOUNDS.minX - 0.7, z: 0, width: WALL_THICKNESS, depth: CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ + 1.4 },
]

// ---------------------------------------------------------------------------------------
// Map projection (minimap + full map). One uniform scale so streets keep their proportions.
// ---------------------------------------------------------------------------------------
export const MAP_CENTER = { x: -28, z: -2 } as const
export const MAP_SCALE = 0.4

export function worldToMapPercent(position: { x: number; z: number }) {
  return {
    x: 50 + (position.x - MAP_CENTER.x) * MAP_SCALE,
    y: 50 + (position.z - MAP_CENTER.z) * MAP_SCALE,
  }
}

// ---------------------------------------------------------------------------------------
// Roads and lanes
// ---------------------------------------------------------------------------------------
export type RoadSpec = {
  id: string
  axis: Axis
  /** Fixed coordinate of the centre line (z for axis 'x', x for axis 'z'). */
  fixed: number
  /** Extent along the axis the road runs along. */
  from: number
  to: number
  width: number
}

/** Roads that carry traffic. Campus roads extend west of the grid but carry only pedestrians/parked cars. */
export const ROADS: RoadSpec[] = [
  ...GRID_LINES.map((z): RoadSpec => ({ id: `h${z}`, axis: 'x', fixed: z, from: -88, to: 88, width: roadWidth(z) })),
  ...GRID_LINES.map((x): RoadSpec => ({
    id: `v${x}`,
    axis: 'z',
    fixed: x,
    from: Math.abs(x) >= 42 ? -68 : -88,
    to: 64,
    width: roadWidth(x),
  })),
]

/** Elevated structures that also carry traffic. */
export const FLYOVER = { z: -42, deckTop: 6.9, width: 10, from: -88, to: 88 } as const
export const BRIDGE = { z: 76, deckTop: 4.6, width: 7, from: -88, to: 88 } as const

/** How far a lane centre sits from the road centre line. */
export function laneOffset(width: number) {
  return width / 4
}

// ---------------------------------------------------------------------------------------
// Traffic signals: a shared, deterministic clock so lights and cars always agree.
// ---------------------------------------------------------------------------------------
export type SignalColor = 'green' | 'yellow' | 'red'

export const SIGNAL_GREEN = 12
export const SIGNAL_YELLOW = 2.5
export const SIGNAL_ALL_RED = 1.5
export const SIGNAL_CYCLE = 2 * (SIGNAL_GREEN + SIGNAL_YELLOW + SIGNAL_ALL_RED)

function signalOffset(ix: number, iz: number) {
  // Different phase per junction so the city never switches all at once.
  const a = SIGNAL_LINES.indexOf(ix as (typeof SIGNAL_LINES)[number])
  const b = SIGNAL_LINES.indexOf(iz as (typeof SIGNAL_LINES)[number])
  return ((a + 1) * 7 + (b + 1) * 11) % SIGNAL_CYCLE
}

/** Signal state for traffic travelling along `axis` approaching the junction at (ix, iz). */
export function getSignalState(axis: Axis, ix: number, iz: number, timeSeconds: number): SignalColor {
  const half = SIGNAL_GREEN + SIGNAL_YELLOW + SIGNAL_ALL_RED
  let t = (timeSeconds + signalOffset(ix, iz)) % SIGNAL_CYCLE
  if (t < 0) t += SIGNAL_CYCLE
  // First half of the cycle belongs to the x axis, the second half to the z axis.
  const inFirstHalf = t < half
  const phaseT = inFirstHalf ? t : t - half
  const myPhase = axis === 'x' ? inFirstHalf : !inFirstHalf
  if (!myPhase) return 'red'
  if (phaseT < SIGNAL_GREEN) return 'green'
  if (phaseT < SIGNAL_GREEN + SIGNAL_YELLOW) return 'yellow'
  return 'red'
}

// ---------------------------------------------------------------------------------------
// Route planning: walking and ride routes follow the street grid and the campus gates
// instead of cutting straight across building lots.
// ---------------------------------------------------------------------------------------
export type Point = { x: number; z: number }

/** Campus walkways used for routing: the north avenue, the south walk and the east boulevard. */
export const CAMPUS_WALK = { north: -18, south: 34, eastX: -96 } as const

const ROUTE_EPSILON = 0.6

function nearestLine(value: number, lines: readonly number[]) {
  let best = lines[0]
  for (const line of lines) if (Math.abs(line - value) < Math.abs(best - value)) best = line
  return best
}

/** The street to walk down to: the one you are standing on, otherwise the next road to the south (doors face south). */
function roadSouthOf(z: number) {
  for (const line of GRID_LINES) if (Math.abs(line - z) <= 4.5) return line
  for (const line of GRID_LINES) if (line >= z) return line
  return GRID_LINES[GRID_LINES.length - 1]
}

function dedupe(from: Point, points: Point[]) {
  const result: Point[] = []
  let last = from
  for (const point of points) {
    if (Math.hypot(point.x - last.x, point.z - last.z) < ROUTE_EPSILON) continue
    result.push(point)
    last = point
  }
  return result
}

function campusRoute(from: Point, to: Point): Point[] {
  const laneOf = (point: Point) => (point.z < 0 ? CAMPUS_WALK.north : CAMPUS_WALK.south)
  const fromLane = laneOf(from)
  const toLane = laneOf(to)
  const points: Point[] = [{ x: from.x, z: fromLane }]
  if (fromLane === toLane) {
    points.push({ x: to.x, z: toLane })
  } else {
    points.push({ x: CAMPUS_WALK.eastX, z: fromLane }, { x: CAMPUS_WALK.eastX, z: toLane }, { x: to.x, z: toLane })
  }
  points.push(to)
  return points
}

function cityRoute(from: Point, to: Point): Point[] {
  const zStart = roadSouthOf(from.z)
  const xTarget = nearestLine(to.x, GRID_LINES)
  const zEnd = roadSouthOf(to.z)
  return [
    { x: from.x, z: zStart },
    { x: xTarget, z: zStart },
    { x: xTarget, z: zEnd },
    { x: to.x, z: zEnd },
    to,
  ]
}

/** Waypoints from `from` to `to` (excluding `from`, including `to`) that follow streets and use the campus gates. */
export function planRoute(from: Point, to: Point): Point[] {
  const fromCampus = isInCampus(from.x, from.z)
  const toCampus = isInCampus(to.x, to.z)
  let points: Point[]

  if (fromCampus && toCampus) {
    points = campusRoute(from, to)
  } else if (toCampus) {
    const gate = to.z < 0 ? CAMPUS_GATE_Z[0] : CAMPUS_GATE_Z[1]
    const outside = { x: CAMPUS_BOUNDS.maxX + 6, z: gate }
    points = [
      ...cityRoute(from, outside).slice(0, -1),
      outside,
      { x: CAMPUS_WALK.eastX, z: gate },
      ...campusRoute({ x: CAMPUS_WALK.eastX, z: gate }, to),
    ]
  } else if (fromCampus) {
    const gate = from.z < 0 ? CAMPUS_GATE_Z[0] : CAMPUS_GATE_Z[1]
    const outside = { x: CAMPUS_BOUNDS.maxX + 6, z: gate }
    points = [
      ...campusRoute(from, { x: CAMPUS_WALK.eastX, z: gate }),
      outside,
      ...cityRoute(outside, to),
    ]
  } else {
    points = cityRoute(from, to)
  }
  return dedupe(from, points)
}
