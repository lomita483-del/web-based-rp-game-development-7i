'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { Color, MathUtils, MeshBasicMaterial, MeshStandardMaterial, type Group } from 'three'
import { getTrafficWorld } from '@/lib/game/traffic-runtime'
import { STOP_LINE_DISTANCE } from '@/lib/game/traffic-sim'
import { GRID_LINES, SIGNAL_LINES, getSignalState, planRoute, type Point } from '@/lib/game/world'
import { PAINT, vehicleModels } from './traffic-layer'

export type RideKind = 'cab' | 'bike' | 'driver'
export type RidePhase = 'arriving' | 'waiting' | 'riding'
export type RideState = { id: number; kind: RideKind; phase: RidePhase; destination: Point; pickup: Point | null }
export type RideEvent = { type: 'arrived'; at: Point } | { type: 'completed' } | { type: 'failed' }
export type RidePose = { x: number; z: number; heading: number }

const MODEL = { cab: 'car', driver: 'car', bike: 'bike' } as const
const COLOR = { cab: '#e8b923', driver: '#1f1f22', bike: '#c94a3a' } as const
const SPEED = { cab: 11, driver: 12, bike: 12.5 } as const

/** Offsets each segment to the driver's right-hand lane so ride vehicles keep to their side of the road. */
function laneRoute(from: Point, waypoints: Point[]): Point[] {
  const out: Point[] = []
  let previous = from
  for (const point of waypoints) {
    const dx = point.x - previous.x
    const dz = point.z - previous.z
    const length = Math.hypot(dx, dz)
    if (length > 0.01) {
      const ux = dx / length
      const uz = dz / length
      const offset = 1.4
      out.push({ x: previous.x - uz * offset, z: previous.z + ux * offset })
      out.push({ x: point.x - uz * offset, z: point.z + ux * offset })
    }
    previous = point
  }
  return out
}

/** A signalised junction ahead on the current segment that is not green: returns the distance to hold at. */
function redAhead(position: Point, dirX: number, dirZ: number): boolean {
  const time = getTrafficWorld().time
  const axis = dirX !== 0 ? 'x' : 'z'
  for (const jx of SIGNAL_LINES) {
    for (const jz of SIGNAL_LINES) {
      const along = axis === 'x' ? (jx - position.x) * dirX : (jz - position.z) * dirZ
      const across = axis === 'x' ? Math.abs(jz - position.z) : Math.abs(jx - position.x)
      if (across > 3 || along < STOP_LINE_DISTANCE - 1.2 || along > STOP_LINE_DISTANCE + 0.8) continue
      if (getSignalState(axis, jx, jz, time) !== 'green') return true
    }
  }
  return false
}

function pickSpawn(target: Point): Point {
  let best: Point = { x: GRID_LINES[0], z: GRID_LINES[0] }
  let bestScore = Infinity
  for (const x of GRID_LINES) {
    for (const z of GRID_LINES) {
      const distance = Math.hypot(x - target.x, z - target.z)
      const score = Math.abs(distance - 55)
      if (score < bestScore) { bestScore = score; best = { x, z } }
    }
  }
  return best
}

export function RideVehicle({
  ride,
  playerRef,
  poseRef,
  onEvent,
}: {
  ride: RideState
  playerRef: MutableRefObject<Point>
  poseRef: MutableRefObject<RidePose | null>
  onEvent: (event: RideEvent) => void
}) {
  const group = useRef<Group>(null!)
  const models = useMemo(() => vehicleModels(), [])
  const model = models[MODEL[ride.kind]]
  const body = useMemo(() => new MeshStandardMaterial({ vertexColors: true, color: new Color(COLOR[ride.kind]), roughness: 0.5, metalness: 0.25 }), [ride.kind])
  const lights = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  useEffect(() => () => { Object.values(models).forEach((m) => { (m as { body: { dispose: () => void }; lights: { dispose: () => void } }).body.dispose(); (m as { body: { dispose: () => void }; lights: { dispose: () => void } }).lights.dispose() }); body.dispose(); lights.dispose() }, [models, body, lights])
  void PAINT

  const eventRef = useRef(onEvent)
  eventRef.current = onEvent
  const state = useRef<{ route: Point[]; index: number; phase: RidePhase | 'init'; stuck: number; speed: number; started: boolean }>({ route: [], index: 0, phase: 'init', stuck: 0, speed: 0, started: false })

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const g = group.current
    if (!g) return
    const s = state.current

    if (ride.phase === 'waiting') {
      s.speed = MathUtils.damp(s.speed, 0, 6, delta)
      return
    }

    if (s.phase !== ride.phase) {
      s.phase = ride.phase
      s.index = 0
      s.stuck = 0
      if (ride.phase === 'arriving') {
        const target = playerRef.current
        const spawn = pickSpawn(target)
        g.position.set(spawn.x, 0, spawn.z)
        s.route = laneRoute(spawn, planRoute(spawn, target))
        s.started = true
      } else if (ride.phase === 'riding') {
        const from = { x: g.position.x, z: g.position.z }
        s.route = laneRoute(from, planRoute(from, ride.destination))
      }
    }

    const next = s.route[s.index]
    if (!next) {
      if (ride.phase === 'arriving') eventRef.current({ type: 'arrived', at: { x: g.position.x, z: g.position.z } })
      else eventRef.current({ type: 'completed' })
      s.phase = 'init'
      return
    }
    const dx = next.x - g.position.x
    const dz = next.z - g.position.z
    const distance = Math.hypot(dx, dz)
    if (distance < 0.6) { s.index += 1; return }
    const ux = dx / distance
    const uz = dz / distance
    // Slow for corners and hold at red lights, like the other traffic.
    const cornerSlow = distance < 6 ? 0.55 : 1
    const hold = Math.abs(ux) + Math.abs(uz) > 0.9 && (Math.abs(ux) > 0.95 || Math.abs(uz) > 0.95) && redAhead({ x: g.position.x, z: g.position.z }, Math.round(ux), Math.round(uz))
    const target = hold ? 0 : SPEED[ride.kind] * cornerSlow
    s.speed = MathUtils.damp(s.speed, target, hold ? 4 : 1.6, delta)
    s.stuck = hold || s.speed > 1 ? 0 : s.stuck + delta
    g.position.x += ux * s.speed * delta
    g.position.z += uz * s.speed * delta
    const heading = Math.atan2(ux, uz)
    let diff = heading - g.rotation.y
    diff = Math.atan2(Math.sin(diff), Math.cos(diff))
    g.rotation.y += diff * (1 - Math.exp(-delta * 7))
    if (ride.phase === 'riding') poseRef.current = { x: g.position.x, z: g.position.z, heading: g.rotation.y }
    if (s.stuck > 25) eventRef.current({ type: 'failed' })
  })

  return (
    <group ref={group}>
      <mesh geometry={model.body} material={body} />
      <mesh geometry={model.lights} material={lights} />
      {ride.kind === 'cab' && (
        <mesh position={[0, 1.66, -0.2]}><boxGeometry args={[0.7, 0.2, 0.3]} /><meshBasicMaterial color="#fff2b0" /></mesh>
      )}
    </group>
  )
}
