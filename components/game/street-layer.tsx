'use client'

import { useFrame, useLoader } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type Material,
} from 'three'
import { createBillboards, createLamps, createSignalHeads, createTrees, type Prop } from '@/lib/game/street-props'
import { STOP_LINE_DISTANCE } from '@/lib/game/traffic-sim'
import { getTrafficWorld } from '@/lib/game/traffic-runtime'
import { GRID_LINES, ROADS, SIGNAL_LINES, getSignalState, roadWidth } from '@/lib/game/world'
import { box, cyl, mergeParts, sphere } from './geo'

const dummy = new Object3D()

function composeMatrix(x: number, y: number, z: number, rotY = 0, sx = 1, sy = sx, sz = sx) {
  dummy.position.set(x, y, z)
  dummy.rotation.set(0, rotY, 0)
  dummy.scale.set(sx, sy, sz)
  dummy.updateMatrix()
  return dummy.matrix.clone()
}

/** A static set of instances drawn with one call. Geometry and material are owned by the caller. */
function StaticInstances({
  geometry,
  material,
  matrices,
  colors,
}: {
  geometry: BufferGeometry
  material: Material
  matrices: Matrix4[]
  colors?: string[]
}) {
  const ref = useRef<InstancedMesh>(null!)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const tint = new Color()
    matrices.forEach((matrix, index) => {
      mesh.setMatrixAt(index, matrix)
      if (colors) mesh.setColorAt(index, tint.set(colors[index % colors.length]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [matrices, colors])
  if (matrices.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} frustumCulled={false} />
}

function useDisposable<T extends { dispose: () => void }>(factory: () => T): T {
  const value = useMemo(factory, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => value.dispose(), [value])
  return value
}

// ---------------------------------------------------------------------------------------
// Trees: three species, instanced.
// ---------------------------------------------------------------------------------------
function treeGeometries() {
  const mango = mergeParts([
    { geometry: cyl(0.16, 0.28, 2.6, 7), position: [0, 1.3, 0], color: '#6b5444' },
    { geometry: sphere(1.25, 9, 7), position: [0, 3.2, 0], scale: [1, 0.82, 1], color: '#4f6a3e' },
    { geometry: sphere(0.85, 8, 6), position: [0.7, 3.55, 0.2], color: '#5d7a45' },
    { geometry: sphere(0.8, 8, 6), position: [-0.65, 3.0, -0.3], color: '#46603a' },
  ])
  const neem = mergeParts([
    { geometry: cyl(0.14, 0.24, 2.2, 7), position: [0, 1.1, 0], color: '#74604d' },
    { geometry: sphere(1.5, 9, 7), position: [0, 3.0, 0], scale: [1.15, 0.7, 1.15], color: '#6f8f4a' },
    { geometry: sphere(1.0, 8, 6), position: [0.9, 2.65, 0.4], color: '#7ea055' },
  ])
  const palmParts: Parameters<typeof mergeParts>[0] = [
    { geometry: cyl(0.12, 0.22, 3.6, 7), position: [0.1, 1.8, 0], rotation: [0, 0, -0.06], color: '#8a7358' },
    { geometry: cyl(0.1, 0.12, 3.6, 7), position: [0.35, 5.0, 0], rotation: [0, 0, -0.1], color: '#85704f' },
    { geometry: sphere(0.28, 6, 5), position: [0.5, 6.8, 0], color: '#5b4a30' },
  ]
  for (let leaf = 0; leaf < 8; leaf += 1) {
    const angle = (leaf / 8) * Math.PI * 2
    palmParts.push({
      geometry: box(0.34, 0.05, 2.7),
      position: [0.5 + Math.sin(angle) * 1.15, 6.7, Math.cos(angle) * 1.15],
      rotation: [0.55, angle, 0],
      color: leaf % 2 ? '#3f7a3c' : '#4c8a43',
    })
  }
  return { mango, neem, palm: mergeParts(palmParts) }
}

export function StreetTrees() {
  const trees = useMemo(() => createTrees(), [])
  const geometries = useMemo(treeGeometries, [])
  useEffect(() => () => { geometries.mango.dispose(); geometries.neem.dispose(); geometries.palm.dispose() }, [geometries])
  const material = useDisposable(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }))
  const groups = useMemo(() => {
    const result = { mango: [] as Matrix4[], neem: [] as Matrix4[], palm: [] as Matrix4[] }
    trees.forEach((tree, index) => {
      const species = index % 5 === 0 ? 'palm' : index % 3 === 0 ? 'neem' : 'mango'
      result[species].push(composeMatrix(tree.x, 0, tree.z, tree.rotY, tree.scale, tree.scale * (0.9 + (index % 4) * 0.08), tree.scale))
    })
    return result
  }, [trees])
  const tints = useMemo(() => ['#ffffff', '#f0f4e2', '#e4efd2', '#fbf6e6'], [])
  return (
    <>
      <StaticInstances geometry={geometries.mango} material={material} matrices={groups.mango} colors={tints} />
      <StaticInstances geometry={geometries.neem} material={material} matrices={groups.neem} colors={tints} />
      <StaticInstances geometry={geometries.palm} material={material} matrices={groups.palm} />
    </>
  )
}

// ---------------------------------------------------------------------------------------
// Street lamps: pole and arm instanced, glowing heads and light pools only after dark.
// ---------------------------------------------------------------------------------------
export function StreetLamps({ night }: { night: boolean }) {
  const lamps = useMemo(() => createLamps(), [])
  const poleGeometry = useMemo(() => mergeParts([
    { geometry: cyl(0.07, 0.12, 5, 8), position: [0, 2.5, 0], color: '#4b5052' },
    { geometry: box(0.12, 0.12, 1.1), position: [0, 5.0, 0.5], color: '#53565a' },
    { geometry: box(0.5, 0.1, 0.34), position: [0, 4.92, 1.05], color: '#3d4144' },
  ]), [])
  const headGeometry = useDisposable(() => box(0.42, 0.06, 0.28))
  const poolGeometry = useDisposable(() => new CircleGeometry(4.2, 20))
  useEffect(() => () => poleGeometry.dispose(), [poleGeometry])
  const poleMaterial = useDisposable(() => new MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.5 }))
  const headMaterial = useMemo(() => new MeshBasicMaterial({ color: '#7b6a50' }), [])
  const poolMaterial = useMemo(() => new MeshBasicMaterial({ color: '#ffc87a', transparent: true, opacity: 0.2, depthWrite: false }), [])
  useEffect(() => () => { headMaterial.dispose(); poolMaterial.dispose() }, [headMaterial, poolMaterial])
  useEffect(() => { headMaterial.color.set(night ? '#fff1c2' : '#7b6a50') }, [headMaterial, night])
  const poles = useMemo(() => lamps.map((lamp) => composeMatrix(lamp.x, 0, lamp.z, lamp.rotY)), [lamps])
  const heads = useMemo(() => lamps.map((lamp) => {
    const m = composeMatrix(lamp.x, 0, lamp.z, lamp.rotY)
    dummy.position.set(0, 4.86, 1.05); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
    return m.multiply(dummy.matrix.clone())
  }), [lamps])
  const pools = useMemo(() => lamps.map((lamp) => {
    // The light pool sits on the ground below the lamp head, towards the road.
    const m = composeMatrix(lamp.x, 0.03, lamp.z, lamp.rotY)
    dummy.position.set(0, 0, 1.4); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
    return m.multiply(dummy.matrix.clone())
  }), [lamps])
  return (
    <>
      <StaticInstances geometry={poleGeometry} material={poleMaterial} matrices={poles} />
      <StaticInstances geometry={headGeometry} material={headMaterial} matrices={heads} />
      {night && <StaticInstances geometry={poolGeometry} material={poolMaterial} matrices={pools} />}
    </>
  )
}

// ---------------------------------------------------------------------------------------
// Billboards: standing on the sidewalk beside the road, canvas artwork, glowing at night.
// ---------------------------------------------------------------------------------------
function adTexture(text: string, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createLinearGradient(0, 0, 1024, 320)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, '#101820')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 320)
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  for (let i = 0; i < 6; i += 1) ctx.fillRect(i * 190 - 40, 0, 70, 320)
  ctx.strokeStyle = '#f2d9a0'
  ctx.lineWidth = 8
  ctx.strokeRect(10, 10, 1004, 300)
  ctx.fillStyle = '#fff3d6'
  ctx.font = '800 82px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 512, 150, 940)
  ctx.fillStyle = '#f2d9a0'
  ctx.font = '600 38px Arial, sans-serif'
  ctx.fillText('EKO · AFTER HOURS', 512, 255)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function Billboards({ night }: { night: boolean }) {
  const boards = useMemo(() => createBillboards(), [])
  const textures = useMemo(() => boards.map((board) => adTexture(board.text, board.color)), [boards])
  useEffect(() => () => textures.forEach((texture) => texture?.dispose()), [textures])
  return (
    <>
      {boards.map((board, index) => (
        <group key={`${board.text}-${index}`} position={[board.x, 0, board.z]} rotation={[0, board.rotY, 0]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * board.width * 0.32, board.poleHeight / 2, -0.12]}>
              <boxGeometry args={[0.24, board.poleHeight, 0.24]} />
              <meshStandardMaterial color="#4b5256" metalness={0.5} roughness={0.55} />
            </mesh>
          ))}
          <mesh position={[0, board.poleHeight + 0.2, 0]}>
            <boxGeometry args={[board.width + 0.5, board.height + 0.5, 0.3]} />
            <meshStandardMaterial color="#20262a" roughness={0.7} />
          </mesh>
          <mesh position={[0, board.poleHeight + 0.2, 0.17]}>
            <planeGeometry args={[board.width, board.height]} />
            <meshBasicMaterial map={textures[index] ?? undefined} color={night ? '#ffffff' : '#d8d4c8'} toneMapped={false} />
          </mesh>
          <mesh position={[0, board.poleHeight - board.height / 2 - 0.08, 0.3]}>
            <boxGeometry args={[board.width * 0.9, 0.12, 0.5]} />
            <meshBasicMaterial color={night ? '#ffe8b0' : '#6c675c'} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------------------
// Traffic signals: right-hand kerb poles, lamps driven by the same clock the cars obey.
// ---------------------------------------------------------------------------------------
const LAMP_COLORS = {
  red: ['#ff3b30', '#3a1411'],
  yellow: ['#ffc21a', '#3a2f0d'],
  green: ['#33ee70', '#10301b'],
} as const

export function TrafficSignals() {
  const heads = useMemo(() => createSignalHeads(), [])
  const poleGeometry = useMemo(() => mergeParts([
    { geometry: cyl(0.07, 0.09, 4.6, 8), position: [0, 2.3, 0], color: '#42484a' },
    { geometry: box(0.46, 1.2, 0.3), position: [0, 4.75, 0.05], color: '#1d2022' },
    { geometry: box(0.5, 0.06, 0.46), position: [0, 5.38, 0.1], color: '#1d2022' },
    { geometry: box(0.26, 0.26, 0.05), position: [0, 3.7, 0.14], color: '#2a2f31' },
  ]), [])
  useEffect(() => () => poleGeometry.dispose(), [poleGeometry])
  const poleMaterial = useDisposable(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }))
  const lampGeometry = useDisposable(() => new CircleGeometry(0.13, 12))
  const lampMaterial = useDisposable(() => new MeshBasicMaterial({ toneMapped: false, side: DoubleSide }))
  const poles = useMemo(() => heads.map((head) => composeMatrix(head.x, 0, head.z, head.rotY)), [heads])
  const lampMeshRef = useRef<InstancedMesh>(null!)
  const lampStates = useRef<number[]>([])
  const lampColor = useMemo(() => new Color(), [])

  useLayoutEffect(() => {
    const mesh = lampMeshRef.current
    if (!mesh) return
    heads.forEach((head, headIndex) => {
      ;[5.15, 4.75, 4.35].forEach((y, lampIndex) => {
        const m = composeMatrix(head.x, 0, head.z, head.rotY)
        dummy.position.set(0, y, 0.21); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
        mesh.setMatrixAt(headIndex * 3 + lampIndex, m.multiply(dummy.matrix.clone()))
        mesh.setColorAt(headIndex * 3 + lampIndex, lampColor.set('#222'))
      })
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    lampStates.current = heads.map(() => -1)
  }, [heads, lampColor])

  useFrame(() => {
    const mesh = lampMeshRef.current
    if (!mesh) return
    const time = getTrafficWorld().time
    let changed = false
    heads.forEach((head, headIndex) => {
      const state = getSignalState(head.axis, head.ix, head.iz, time)
      const code = state === 'red' ? 0 : state === 'yellow' ? 1 : 2
      if (lampStates.current[headIndex] === code) return
      lampStates.current[headIndex] = code
      const names = ['red', 'yellow', 'green'] as const
      names.forEach((name, lampIndex) => {
        const [on, off] = LAMP_COLORS[name]
        mesh.setColorAt(headIndex * 3 + lampIndex, lampColor.set(lampIndex === code ? on : off))
      })
      changed = true
    })
    if (changed && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <>
      <StaticInstances geometry={poleGeometry} material={poleMaterial} matrices={poles} />
      <instancedMesh ref={lampMeshRef} args={[lampGeometry, lampMaterial, heads.length * 3]} frustumCulled={false} />
    </>
  )
}

// ---------------------------------------------------------------------------------------
// Road markings: centre dashes, edge lines, stop lines and zebra crossings, all instanced.
// ---------------------------------------------------------------------------------------
type Segment = { x: number; z: number; length: number; width: number; axis: 'x' | 'z' }

function clearIntervals(fixed: number, from: number, to: number, gap: number) {
  // Spans along a road between junction zones.
  const lines = GRID_LINES.filter((line) => line > from && line < to)
  const spans: [number, number][] = []
  let cursor = from
  for (const line of lines) {
    const half = roadWidth(line) / 2 + gap
    if (line - half > cursor) spans.push([cursor, line - half])
    cursor = line + half
  }
  if (cursor < to) spans.push([cursor, to])
  return spans
}

function buildMarkings() {
  const dashes: Segment[] = []
  const edges: Segment[] = []
  const stops: Segment[] = []
  const zebras: Segment[] = []
  for (const road of ROADS.filter((entry) => /^[hv]-?\d+$/.test(entry.id))) {
    const w = road.width
    const spans = clearIntervals(road.fixed, road.from + 2, road.to - 2, 0.2)
    for (const [a, b] of spans) {
      const centre = (a + b) / 2
      const length = b - a
      for (const side of [-1, 1]) {
        const lateral = road.fixed + side * (w / 2 - 0.28)
        edges.push(road.axis === 'x' ? { x: centre, z: lateral, length, width: 0.12, axis: 'x' } : { x: lateral, z: centre, length, width: 0.12, axis: 'z' })
      }
      if (w >= 7) {
        // Solid double centre line on the main avenues.
        for (const off of [-0.11, 0.11]) {
          const lateral = road.fixed + off
          dashes.push(road.axis === 'x' ? { x: centre, z: lateral, length, width: 0.09, axis: 'x' } : { x: lateral, z: centre, length, width: 0.09, axis: 'z' })
        }
      } else {
        for (let t = a + 1; t < b - 3; t += 7) {
          dashes.push(road.axis === 'x' ? { x: t + 1.5, z: road.fixed, length: 3, width: 0.12, axis: 'x' } : { x: road.fixed, z: t + 1.5, length: 3, width: 0.12, axis: 'z' })
        }
      }
    }
  }
  for (const ix of SIGNAL_LINES) {
    for (const iz of SIGNAL_LINES) {
      const halfX = roadWidth(ix) / 2
      const halfZ = roadWidth(iz) / 2
      // Stop lines (across the driver's lane) and zebra crossings on every approach.
      for (const dir of [1, -1]) {
        const xStop = ix - dir * (STOP_LINE_DISTANCE - 0.2)
        stops.push({ x: xStop, z: iz + dir * (halfZ / 2 + 0.1), length: halfZ - 0.35, width: 0.4, axis: 'z' })
        const zStop = iz - dir * (STOP_LINE_DISTANCE - 0.2)
        stops.push({ x: ix - dir * (halfX / 2 + 0.1), z: zStop, length: halfX - 0.35, width: 0.4, axis: 'x' })
        const zebraX = ix - dir * 4.3
        for (let s = -halfZ + 0.55; s <= halfZ - 0.5; s += 0.9) zebras.push({ x: zebraX, z: iz + s, length: 1.5, width: 0.48, axis: 'x' })
        const zebraZ = iz - dir * 4.3
        for (let s = -halfX + 0.55; s <= halfX - 0.5; s += 0.9) zebras.push({ x: ix + s, z: zebraZ, length: 1.5, width: 0.48, axis: 'z' })
      }
    }
  }
  return { dashes, edges, stops, zebras }
}

function SegmentInstances({ segments, material, y }: { segments: Segment[]; material: Material; y: number }) {
  const geometry = useDisposable(() => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2))
  const matrices = useMemo(
    () => segments.map((segment) => {
      // Unit plane lies along X (length) and Z (width); swap for z-axis segments.
      return segment.axis === 'x'
        ? composeMatrix(segment.x, y, segment.z, 0, segment.length, 1, segment.width)
        : composeMatrix(segment.x, y, segment.z, 0, segment.width, 1, segment.length)
    }),
    [segments, y],
  )
  return <StaticInstances geometry={geometry} material={material} matrices={matrices} />
}

export function RoadMarkings({ night }: { night: boolean }) {
  const markings = useMemo(buildMarkings, [])
  const white = useMemo(() => new MeshBasicMaterial({ color: '#e8e4d6' }), [])
  const yellow = useMemo(() => new MeshBasicMaterial({ color: '#e0b84e' }), [])
  useEffect(() => () => { white.dispose(); yellow.dispose() }, [white, yellow])
  useEffect(() => {
    white.color.set(night ? '#a9a699' : '#e8e4d6')
    yellow.color.set(night ? '#a8863a' : '#e0b84e')
  }, [night, white, yellow])
  return (
    <>
      <SegmentInstances segments={markings.edges} material={white} y={0.018} />
      <SegmentInstances segments={markings.dashes} material={yellow} y={0.02} />
      <SegmentInstances segments={markings.stops} material={white} y={0.022} />
      <SegmentInstances segments={markings.zebras} material={white} y={0.024} />
    </>
  )
}

const STREET_SIGN_POSITIONS = [
  [-42, -47, 0],
  [-42, 47, Math.PI],
  [42, -47, 0],
  [42, 47, Math.PI],
] as const

/** Uses the supplied Quaternius street-pack stop signs as intersection dressing. */
export function StreetKitProps() {
  const stopSign = useLoader(OBJLoader, '/assets/street-pack/OBJ/Sign_Stop.obj')
  const model = useMemo(() => {
    const clone = stopSign.clone(true)
    clone.traverse((child) => {
      if ('isMesh' in child && child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return clone
  }, [stopSign])

  return (
    <group name="quaternius-street-kit">
      {STREET_SIGN_POSITIONS.map(([x, z, rotation]) => (
        <primitive key={`${x}-${z}`} object={model.clone(true)} position={[x, 0, z]} rotation={[0, rotation, 0]} scale={1.15} />
      ))}
    </group>
  )
}

export type { Prop }
