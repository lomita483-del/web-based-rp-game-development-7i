'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, ConeGeometry, type BufferGeometry, type Mesh } from 'three'
import { configureTraffic } from '@/lib/game/traffic-runtime'
import { activeBreakdowns, stepTraffic, vehiclePose, type TrafficWorld, type Vehicle, type VehicleKind, type VehiclePose } from '@/lib/game/traffic-sim'
import { box, cyl, mergeParts, sphere, type Part } from './geo'

const WHEEL = '#121212'
const GLASS = '#1b2631'

function wheel(x: number, z: number, radius = 0.36, width = 0.26): Part {
  return { geometry: cyl(radius, radius, width, 10), position: [x, radius, z], rotation: [0, 0, Math.PI / 2], color: WHEEL }
}

export function vehicleModels(): Record<VehicleKind, { body: BufferGeometry; lights: BufferGeometry }> {
  const lamp = (x: number, y: number, z: number, color: string, w = 0.34): Part => ({ geometry: box(w, 0.14, 0.06), position: [x, y, z], color })
  const HEAD = '#fff4cc'
  const TAIL = '#ff2d2d'

  const car = mergeParts([
    { geometry: box(1.8, 0.6, 4.2), position: [0, 0.66, 0], color: '#ffffff' },
    { geometry: box(1.62, 0.5, 2.3), position: [0, 1.2, -0.25], color: GLASS },
    { geometry: box(1.56, 0.07, 2.05), position: [0, 1.47, -0.25], color: '#ffffff' },
    { geometry: box(1.84, 0.22, 4.3), position: [0, 0.42, 0], color: '#26292b' },
    wheel(0.88, 1.35), wheel(-0.88, 1.35), wheel(0.88, -1.35), wheel(-0.88, -1.35),
  ])
  const carLights = mergeParts([
    lamp(0.62, 0.78, 2.11, HEAD), lamp(-0.62, 0.78, 2.11, HEAD),
    lamp(0.64, 0.8, -2.11, TAIL), lamp(-0.64, 0.8, -2.11, TAIL),
  ])

  const danfo = mergeParts([
    { geometry: box(2.0, 1.5, 5.6), position: [0, 1.4, 0], color: '#ffffff' },
    { geometry: box(2.03, 0.26, 5.64), position: [0, 1.0, 0], color: '#161616' },
    { geometry: box(2.03, 0.55, 4.5), position: [0, 1.85, -0.25], color: GLASS },
    { geometry: box(1.9, 0.08, 5.4), position: [0, 2.18, 0], color: '#ffffff' },
    { geometry: box(2.05, 0.2, 5.7), position: [0, 0.5, 0], color: '#26292b' },
    wheel(0.94, 1.9, 0.42, 0.28), wheel(-0.94, 1.9, 0.42, 0.28), wheel(0.94, -1.8, 0.42, 0.28), wheel(-0.94, -1.8, 0.42, 0.28),
  ])
  const danfoLights = mergeParts([
    lamp(0.7, 0.95, 2.82, HEAD, 0.4), lamp(-0.7, 0.95, 2.82, HEAD, 0.4),
    lamp(0.75, 1.0, -2.82, TAIL, 0.4), lamp(-0.75, 1.0, -2.82, TAIL, 0.4),
  ])

  const keke = mergeParts([
    { geometry: box(1.3, 0.7, 2.6), position: [0, 0.75, -0.1], color: '#ffffff' },
    { geometry: box(1.0, 0.7, 0.5), position: [0, 0.65, 1.2], color: '#ffffff' },
    { geometry: box(1.36, 0.07, 1.9), position: [0, 1.82, -0.45], color: '#1d1d1d' },
    { geometry: box(0.07, 0.95, 0.07), position: [0.62, 1.35, 0.45], color: '#222222' },
    { geometry: box(0.07, 0.95, 0.07), position: [-0.62, 1.35, 0.45], color: '#222222' },
    { geometry: box(0.07, 0.95, 0.07), position: [0.62, 1.35, -1.3], color: '#222222' },
    { geometry: box(0.07, 0.95, 0.07), position: [-0.62, 1.35, -1.3], color: '#222222' },
    { geometry: box(1.1, 0.55, 0.05), position: [0, 1.4, 0.5], color: GLASS },
    wheel(0, 1.2, 0.3, 0.18), wheel(0.62, -1.0, 0.3, 0.2), wheel(-0.62, -1.0, 0.3, 0.2),
  ])
  const kekeLights = mergeParts([lamp(0, 0.85, 1.46, HEAD, 0.26), lamp(0.45, 0.85, -1.4, TAIL, 0.22), lamp(-0.45, 0.85, -1.4, TAIL, 0.22)])

  const truck = mergeParts([
    { geometry: box(2.3, 1.9, 2.2), position: [0, 1.55, 2.9], color: '#ffffff' },
    { geometry: box(2.32, 0.7, 0.06), position: [0, 2.05, 4.0], color: GLASS },
    { geometry: box(2.5, 2.2, 5.7), position: [0, 2.0, -1.2], color: '#d8d3c6' },
    { geometry: box(2.1, 0.4, 8.0), position: [0, 0.55, 0], color: '#26292b' },
    wheel(1.05, 3.1, 0.5, 0.34), wheel(-1.05, 3.1, 0.5, 0.34),
    wheel(1.05, -1.2, 0.5, 0.34), wheel(-1.05, -1.2, 0.5, 0.34), wheel(1.05, -2.6, 0.5, 0.34), wheel(-1.05, -2.6, 0.5, 0.34),
  ])
  const truckLights = mergeParts([
    lamp(0.85, 0.95, 4.02, HEAD, 0.4), lamp(-0.85, 0.95, 4.02, HEAD, 0.4),
    lamp(0.9, 0.95, -4.05, TAIL, 0.4), lamp(-0.9, 0.95, -4.05, TAIL, 0.4),
  ])

  const bike = mergeParts([
    { geometry: box(0.28, 0.32, 1.2), position: [0, 0.6, 0], color: '#ffffff' },
    { geometry: box(0.26, 0.1, 0.7), position: [0, 0.82, -0.3], color: '#1a1a1a' },
    { geometry: box(0.7, 0.05, 0.05), position: [0, 1.0, 0.45], color: '#222222' },
    { geometry: cyl(0.3, 0.3, 0.1, 10), position: [0, 0.3, 0.7], rotation: [0, 0, Math.PI / 2], color: WHEEL },
    { geometry: cyl(0.3, 0.3, 0.12, 10), position: [0, 0.3, -0.7], rotation: [0, 0, Math.PI / 2], color: WHEEL },
    { geometry: box(0.42, 0.66, 0.3), position: [0, 1.25, -0.1], color: '#4a6d86' },
    { geometry: box(0.1, 0.5, 0.1), position: [0.22, 1.05, 0.2], rotation: [0.5, 0, 0], color: '#4a6d86' },
    { geometry: box(0.1, 0.5, 0.1), position: [-0.22, 1.05, 0.2], rotation: [0.5, 0, 0], color: '#4a6d86' },
    { geometry: sphere(0.17, 8, 6), position: [0, 1.76, -0.05], color: '#e8e0d0' },
  ])
  const bikeLights = mergeParts([lamp(0, 0.95, 0.62, HEAD, 0.18), lamp(0, 0.7, -0.62, TAIL, 0.16)])

  return {
    car: { body: car, lights: carLights },
    danfo: { body: danfo, lights: danfoLights },
    keke: { body: keke, lights: kekeLights },
    truck: { body: truck, lights: truckLights },
    bike: { body: bike, lights: bikeLights },
  }
}

export const PAINT: Record<VehicleKind, string[]> = {
  car: ['#d9d5cc', '#35424e', '#8a2f2c', '#c9a13c', '#3e6b57', '#5b7f9a', '#1f1f22', '#b87b4a'],
  danfo: ['#e8b923', '#e5b21c', '#ecc02f', '#e8b923', '#dfae1d', '#e8b923', '#f0c53a', '#e8b923'],
  keke: ['#e8b923', '#3c7a4a', '#e8b923', '#e5b21c', '#3c7a4a', '#d9a21d', '#e8b923', '#2d6a5a'],
  truck: ['#b8452f', '#3b5f86', '#d9d5cc', '#4a6b3d', '#8a6a3a', '#a33b2f', '#5b6770', '#2f4a66'],
  bike: ['#c94a3a', '#2f6aa5', '#d9d5cc', '#2c2c2e', '#c9a13c', '#3c7a4a', '#7b4a9a', '#e8e0d0'],
}

const KINDS: VehicleKind[] = ['car', 'danfo', 'keke', 'truck', 'bike']
const FADE_DISTANCE = 6
const scratch: VehiclePose = { x: 0, y: 0, z: 0, heading: 0 }
const dummy = new Object3D()

/** Vehicles that follow the lane simulation: right-hand traffic, queues at red lights, flyover and bridge decks. */
export function TrafficLayer({ night, density }: { night: boolean; density: number }) {
  const world: TrafficWorld = useMemo(() => configureTraffic(density), [density])
  const models = useMemo(vehicleModels, [])
  useEffect(() => () => { for (const kind of KINDS) { models[kind].body.dispose(); models[kind].lights.dispose() } }, [models])
  const bodyMaterial = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.2 }), [])
  const lightMaterial = useMemo(() => new MeshBasicMaterial({ vertexColors: true, color: '#8a8470', toneMapped: false }), [])
  useEffect(() => () => { bodyMaterial.dispose(); lightMaterial.dispose() }, [bodyMaterial, lightMaterial])
  useEffect(() => { lightMaterial.color.set(night ? '#ffffff' : '#8a8470') }, [lightMaterial, night])

  const lists = useMemo(() => {
    const result: Record<VehicleKind, number[]> = { car: [], danfo: [], keke: [], truck: [], bike: [] }
    world.vehicles.forEach((vehicle: Vehicle, index: number) => result[vehicle.kind].push(index))
    return result
  }, [world])

  const bodyRefs = useRef<Record<VehicleKind, InstancedMesh | null>>({ car: null, danfo: null, keke: null, truck: null, bike: null })
  const lightRefs = useRef<Record<VehicleKind, InstancedMesh | null>>({ car: null, danfo: null, keke: null, truck: null, bike: null })
  const hazards = useRef<(Mesh | null)[]>([])
  const hazardGeometry = useMemo(() => new ConeGeometry(0.45, 0.9, 3), [])
  const hazardMaterial = useMemo(() => new MeshBasicMaterial({ color: '#ff3a2a' }), [])
  useEffect(() => () => { hazardGeometry.dispose(); hazardMaterial.dispose() }, [hazardGeometry, hazardMaterial])

  useLayoutEffect(() => {
    const tint = new Color()
    for (const kind of KINDS) {
      const mesh = bodyRefs.current[kind]
      if (!mesh) continue
      lists[kind].forEach((vehicleIndex, slot) => {
        mesh.setColorAt(slot, tint.set(PAINT[kind][world.vehicles[vehicleIndex].shade % 8]))
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [lists, world])

  useFrame((_, delta) => {
    stepTraffic(world, delta)
    for (const kind of KINDS) {
      const body = bodyRefs.current[kind]
      const lights = lightRefs.current[kind]
      if (!body || !lights) continue
      const list = lists[kind]
      for (let slot = 0; slot < list.length; slot += 1) {
        const vehicle = world.vehicles[list[slot]]
        const lane = world.lanes[vehicle.lane]
        vehiclePose(world, vehicle, scratch)
        // Vehicles scale in and out where a lane wraps so nothing visibly pops.
        const edge = Math.min(vehicle.p, lane.length - vehicle.p)
        const fade = Math.max(0.001, Math.min(1, edge / FADE_DISTANCE))
        dummy.position.set(scratch.x, scratch.y, scratch.z)
        dummy.rotation.set(0, scratch.heading, 0)
        dummy.scale.set(fade, fade, fade)
        dummy.updateMatrix()
        body.setMatrixAt(slot, dummy.matrix)
        lights.setMatrixAt(slot, dummy.matrix)
      }
      body.instanceMatrix.needsUpdate = true
      lights.instanceMatrix.needsUpdate = true
    }
    const broken = activeBreakdowns(world)
    for (let i = 0; i < 3; i += 1) {
      const mesh = hazards.current[i]
      if (!mesh) continue
      const pose = broken[i]
      mesh.visible = Boolean(pose)
      if (pose) {
        // Warning triangle a few metres behind the stalled vehicle, flashing.
        const back = 7
        mesh.position.set(pose.x - Math.sin(pose.heading) * back, pose.y + 0.45, pose.z - Math.cos(pose.heading) * back)
        mesh.scale.setScalar(Math.floor(world.time * 2) % 2 === 0 ? 1 : 0.7)
      }
    }
  })

  return (
    <>
      {KINDS.map((kind) => lists[kind].length > 0 && (
        <group key={kind}>
          <instancedMesh ref={(mesh) => { bodyRefs.current[kind] = mesh }} args={[models[kind].body, bodyMaterial, lists[kind].length]} frustumCulled={false} />
          <instancedMesh ref={(mesh) => { lightRefs.current[kind] = mesh }} args={[models[kind].lights, lightMaterial, lists[kind].length]} frustumCulled={false} />
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(mesh) => { hazards.current[i] = mesh }} geometry={hazardGeometry} material={hazardMaterial} visible={false} />
      ))}
    </>
  )
}
