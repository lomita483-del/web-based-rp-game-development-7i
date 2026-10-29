'use client'

import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { CAMPUS_BOUNDS, CAMPUS_GATE_WIDTH, CAMPUS_GATE_Z, CAMPUS_WALLS } from '@/lib/game/world'
import { WorldLabel } from './world-label'

// The University of Lagos campus: a walled district west of the street grid with a central quad, a fountain,
// tree-lined paths, two gates on the h-18 / h18 avenues and a ring of named buildings (drawn by the city scene,
// because they are ordinary enterable buildings in game-data).

const QUAD = { x: -120, z: -2 }
const WALL_HEIGHT = 3.2

function Lawn({ x, z, width, depth, color = '#5f7d4c' }: { x: number; z: number; width: number; depth: number; color?: string }) {
  return (
    <mesh position={[x, -0.06, z]} receiveShadow>
      <boxGeometry args={[width, 0.08, depth]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

function Path({ x, z, width, depth }: { x: number; z: number; width: number; depth: number }) {
  return (
    <mesh position={[x, -0.025, z]} receiveShadow>
      <boxGeometry args={[width, 0.07, depth]} />
      <meshStandardMaterial color="#cdc3b0" roughness={0.92} />
    </mesh>
  )
}

function CampusTree({ position, scale = 1, tone = 0 }: { position: [number, number, number]; scale?: number; tone?: number }) {
  const leaves = ['#4f7a45', '#5f8a4c', '#456f3f'][tone % 3]
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.34, 3, 9]} />
        <meshStandardMaterial color="#6a5240" roughness={0.97} />
      </mesh>
      <mesh position={[0, 3.55, 0]} castShadow>
        <sphereGeometry args={[1.55, 11, 9]} />
        <meshStandardMaterial color={leaves} roughness={0.98} />
      </mesh>
      <mesh position={[0.7, 4.0, 0.2]} castShadow>
        <sphereGeometry args={[1.0, 10, 8]} />
        <meshStandardMaterial color="#5f8a4c" roughness={1} />
      </mesh>
      <mesh position={[-0.75, 3.2, -0.2]} castShadow>
        <sphereGeometry args={[1.05, 10, 8]} />
        <meshStandardMaterial color="#3f6a3b" roughness={1} />
      </mesh>
    </group>
  )
}

function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[2.2, 0.12, 0.62]} /><meshStandardMaterial color="#7a5a3d" roughness={0.85} /></mesh>
      <mesh position={[0, 0.9, -0.28]}><boxGeometry args={[2.2, 0.55, 0.1]} /><meshStandardMaterial color="#7a5a3d" roughness={0.85} /></mesh>
      {[-0.9, 0.9].map((x) => <mesh key={x} position={[x, 0.24, 0]}><boxGeometry args={[0.1, 0.48, 0.55]} /><meshStandardMaterial color="#3e3b36" roughness={0.8} /></mesh>)}
    </group>
  )
}

function CampusLamp({ position, lit }: { position: [number, number, number]; lit: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.07, 0.1, 4.4, 8]} /><meshStandardMaterial color="#3d4244" metalness={0.5} roughness={0.5} /></mesh>
      <mesh position={[0, 4.5, 0]}><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#f6dca0" emissive="#e7b66b" emissiveIntensity={lit ? 1.6 : 0.5} /></mesh>
    </group>
  )
}

function Fountain() {
  return (
    <group position={[QUAD.x, 0, QUAD.z]}>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[4.8, 5, 0.2, 32]} /><meshStandardMaterial color="#b9b0a0" roughness={0.9} /></mesh>
      <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[2.8, 3, 0.7, 28]} /><meshStandardMaterial color="#8d8a82" roughness={0.75} /></mesh>
      <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[2.55, 2.55, 0.06, 28]} /><meshStandardMaterial color="#4f8f9c" roughness={0.12} metalness={0.2} emissive="#2b6572" emissiveIntensity={0.25} /></mesh>
      <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.28, 0.4, 1.4, 12]} /><meshStandardMaterial color="#9a968b" roughness={0.7} /></mesh>
      <mesh position={[0, 2.35, 0]}><sphereGeometry args={[0.46, 12, 10]} /><meshStandardMaterial color="#bfe7ee" roughness={0.1} transparent opacity={0.75} /></mesh>
      <mesh position={[0, 1.85, 0]}><cylinderGeometry args={[1.35, 0.3, 0.12, 20]} /><meshStandardMaterial color="#8d8a82" roughness={0.75} /></mesh>
    </group>
  )
}

function Flag({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 4.2, 0]}><cylinderGeometry args={[0.07, 0.09, 8.4, 8]} /><meshStandardMaterial color="#c9c6bd" metalness={0.6} roughness={0.4} /></mesh>
      {[0, 1, 2].map((stripe) => (
        <mesh key={stripe} position={[0.45 + stripe * 0.6, 7.4, 0]}>
          <boxGeometry args={[0.6, 1.1, 0.05]} />
          <meshStandardMaterial color={stripe === 1 ? '#f2f0e8' : '#1c8a4a'} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function GateArch({ z }: { z: number }) {
  const x = CAMPUS_BOUNDS.maxX - 0.5
  const half = CAMPUS_GATE_WIDTH / 2 + 0.7
  return (
    <group position={[x, 0, z]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * half]}>
          <mesh position={[0, 2.6, 0]} castShadow><boxGeometry args={[1.8, 5.2, 1.8]} /><meshStandardMaterial color="#a8795a" roughness={0.9} /></mesh>
          <mesh position={[0, 5.35, 0]}><boxGeometry args={[2.2, 0.35, 2.2]} /><meshStandardMaterial color="#d9c9a3" roughness={0.8} /></mesh>
          <mesh position={[0, 5.85, 0]}><sphereGeometry args={[0.45, 10, 8]} /><meshStandardMaterial color="#f4d59a" emissive="#c28d49" emissiveIntensity={0.9} /></mesh>
        </group>
      ))}
      <mesh position={[0, 5.0, 0]} castShadow><boxGeometry args={[1.5, 0.9, half * 2 + 1.6]} /><meshStandardMaterial color="#8c6246" roughness={0.88} /></mesh>
      <group position={[-0.85, 5.0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <WorldLabel text="UNIVERSITY OF LAGOS" width={7.4} accentColor="#d9ad62" />
      </group>
      <group position={[0.85, 5.0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <WorldLabel text="UNIVERSITY OF LAGOS" width={7.4} accentColor="#d9ad62" />
      </group>
      {/* Security booth just inside the gate */}
      <group position={[-6, 0, half + 1.6]}>
        <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[2.2, 2.4, 2.2]} /><meshStandardMaterial color="#cbbfa6" roughness={0.9} /></mesh>
        <mesh position={[0, 2.55, 0]}><boxGeometry args={[2.7, 0.2, 2.7]} /><meshStandardMaterial color="#5a6f73" roughness={0.7} /></mesh>
        <mesh position={[0.56, 1.5, 0.9]}><boxGeometry args={[1.0, 0.8, 0.8]} /><meshStandardMaterial color="#9ec0c7" emissive="#6a9aa5" emissiveIntensity={0.3} /></mesh>
      </group>
    </group>
  )
}

function WallSegments() {
  return (
    <>
      {CAMPUS_WALLS.map((wall) => (
        <group key={wall.id} position={[wall.x, 0, wall.z]}>
          <mesh position={[0, WALL_HEIGHT / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[wall.width, WALL_HEIGHT, wall.depth]} />
            <meshStandardMaterial color="#b49a7c" roughness={0.95} />
          </mesh>
          <mesh position={[0, WALL_HEIGHT + 0.12, 0]}>
            <boxGeometry args={[wall.width + 0.3, 0.24, wall.depth + 0.3]} />
            <meshStandardMaterial color="#8a6e55" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function WelcomeBoard() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 192
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#12301f'
    context.fillRect(0, 0, 512, 192)
    context.strokeStyle = '#d9ad62'
    context.lineWidth = 6
    context.strokeRect(5, 5, 502, 182)
    context.fillStyle = '#f2e8d7'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '800 54px Arial, sans-serif'
    context.fillText('UNILAG', 256, 70)
    context.font = '600 30px Arial, sans-serif'
    context.fillText('AKOKA CAMPUS · WELCOME', 256, 130)
    const map = new CanvasTexture(canvas)
    map.colorSpace = SRGBColorSpace
    return map
  }, [])
  if (!texture) return null
  return (
    <group position={[-108, 0, -13.5]} rotation={[0, 0.2, 0]}>
      {[-1.7, 1.7].map((x) => <mesh key={x} position={[x, 1.2, 0]}><boxGeometry args={[0.18, 2.4, 0.18]} /><meshStandardMaterial color="#4a4d4f" /></mesh>)}
      <mesh position={[0, 2.3, 0]}><planeGeometry args={[4.4, 1.65]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
      <mesh position={[0, 2.3, -0.04]}><boxGeometry args={[4.6, 1.8, 0.06]} /><meshStandardMaterial color="#2b2f30" /></mesh>
    </group>
  )
}

export function Campus({ night }: { night: boolean }) {
  const { minX, maxX, minZ, maxZ } = CAMPUS_BOUNDS
  const groundWidth = maxX - minX + 4
  const groundDepth = maxZ - minZ + 1
  const groundX = (minX + maxX + 4) / 2

  const trees = useMemo(() => {
    const list: { position: [number, number, number]; scale: number; tone: number }[] = []
    // Avenues of trees either side of the central path and along the quad edges.
    for (let z = -12; z <= 18; z += 6) {
      list.push({ position: [-125.5, 0, z], scale: 0.95, tone: z })
      list.push({ position: [-114.5, 0, z], scale: 1, tone: z + 1 })
    }
    for (let x = -139; x <= -101; x += 9) {
      list.push({ position: [x, 0, -15], scale: 0.9, tone: x })
      list.push({ position: [x, 0, 19.5], scale: 0.95, tone: x + 2 })
    }
    // Perimeter tree line
    for (let z = -36; z <= 36; z += 9) list.push({ position: [-143, 0, z], scale: 1.1, tone: z })
    for (let x = -139; x <= -100; x += 10) {
      list.push({ position: [x, 0, -37.5], scale: 1.05, tone: x })
      list.push({ position: [x, 0, 37.5], scale: 1.05, tone: x + 1 })
    }
    return list
  }, [])

  const lamps: [number, number, number][] = [
    [-120, 0, -19.5], [-132, 0, -19.5], [-108, 0, -19.5], [-100, 0, -19.5],
    [-120, 0, 33], [-132, 0, 33], [-108, 0, 33], [-140, 0, 33],
    [-98, 0, 4], [-98, 0, -8], [-98, 0, 16], [-98, 0, 26],
    [-131, 0, -2], [-109, 0, -2],
  ]

  return (
    <group>
      {/* Ground: paved base with the quad lawn and walkways drawn on top. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[groundX, -0.12, 0]} receiveShadow>
        <planeGeometry args={[groundWidth, groundDepth]} />
        <meshStandardMaterial color="#b3aa98" roughness={1} />
      </mesh>
      <Lawn x={-120} z={2.5} width={42} depth={37} />
      <Lawn x={-120} z={-31.5} width={52} depth={9} color="#587546" />
      <Path x={-120} z={2} width={3.2} depth={40} />
      <Path x={-120} z={-2} width={44} depth={3.2} />
      <Path x={-120} z={-18} width={52} depth={3.4} />
      <Path x={-120} z={34} width={52} depth={3.4} />
      <Path x={-96} z={8} width={3.4} depth={60} />
      <Fountain />
      <WelcomeBoard />

      {trees.map((tree, index) => <CampusTree key={`campus-tree-${index}`} {...tree} />)}
      {lamps.map((position, index) => <CampusLamp key={`campus-lamp-${index}`} position={position} lit={night} />)}
      {[-112, -128].map((x, index) => (
        <group key={`benches-${x}`}>
          <Bench position={[x, 0, 1.2]} rotation={Math.PI} />
          <Bench position={[x, 0, -5.2]} rotation={0} />
          <Bench position={[x + (index ? -6 : 6), 0, 9]} rotation={Math.PI} />
        </group>
      ))}
      <Flag position={[-129, 0, -21]} />
      <Flag position={[-111, 0, -21]} />

      <WallSegments />
      {CAMPUS_GATE_Z.map((z) => <GateArch key={`gate-${z}`} z={z} />)}

      {/* A paved forecourt links each gate to the street. */}
      {CAMPUS_GATE_Z.map((z) => (
        <mesh key={`forecourt-${z}`} position={[-89, -0.04, z]} receiveShadow>
          <boxGeometry args={[8, 0.08, CAMPUS_GATE_WIDTH + 1]} />
          <meshStandardMaterial color="#9a9588" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}
