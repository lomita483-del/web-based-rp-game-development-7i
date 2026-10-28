'use client'

import { Stars, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { CanvasTexture, MathUtils, RepeatWrapping, SRGBColorSpace, type Group, type PerspectiveCamera, type Texture, Vector3 } from 'three'
import { CITY_CHARACTERS, WORLD_LOCATIONS, type LocationId, type RemotePlayer } from './game-data'

type PlayerPosition = { x: number; z: number }

type CityWorldProps = {
  keysRef: MutableRefObject<Set<string>>
  onPlayerPosition: (position: PlayerPosition) => void
  inVehicle: boolean
  paused: boolean
  waypoint: LocationId | null
  spawnPosition: PlayerPosition
  remotePlayers: RemotePlayer[]
}

type BuildingSpec = {
  x: number
  z: number
  width: number
  depth: number
  height: number
  color: string
  accent: string
}

function cloneTiledTexture(source: Texture, repeatX: number, repeatY: number) {
  const texture = source.clone()
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return texture
}

const ROAD_LINES = [-66, -42, -18, 18, 42, 66]

const BUILDINGS: BuildingSpec[] = [
  { x: -8, z: -9, width: 7, depth: 6, height: 9, color: '#8e8072', accent: '#ca9d68' },
  { x: 8, z: -9, width: 7, depth: 6, height: 12, color: '#6d7980', accent: '#dfb96e' },
  { x: -18, z: -17, width: 11, depth: 10, height: 15, color: '#89745f', accent: '#b85f49' },
  { x: 16, z: -17, width: 12, depth: 11, height: 20, color: '#67737c', accent: '#d9a35d' },
  { x: -18, z: 17, width: 13, depth: 10, height: 21, color: '#8e7968', accent: '#d48a62' },
  { x: 17, z: 17, width: 12, depth: 10, height: 12, color: '#9d927f', accent: '#c88f58' },
  { x: -44, z: -4, width: 12, depth: 11, height: 17, color: '#7f7973', accent: '#d0a66f' },
  { x: -44, z: 12, width: 11, depth: 10, height: 11, color: '#a0927f', accent: '#b35f4c' },
  { x: 44, z: -4, width: 12, depth: 11, height: 18, color: '#73818a', accent: '#d8b66f' },
  { x: 44, z: 12, width: 12, depth: 10, height: 13, color: '#88796c', accent: '#bb6d53' },
  { x: -44, z: 28, width: 12, depth: 10, height: 12, color: '#b0a18c', accent: '#c58658' },
  { x: 44, z: 28, width: 13, depth: 11, height: 16, color: '#7a7771', accent: '#d7ae69' },
  { x: -44, z: -30, width: 12, depth: 10, height: 16, color: '#7e8790', accent: '#c6845f' },
  { x: 44, z: -30, width: 13, depth: 11, height: 21, color: '#677681', accent: '#d7b96e' },
  { x: -16, z: -48, width: 12, depth: 10, height: 13, color: '#988b79', accent: '#b75f4d' },
  { x: 18, z: -48, width: 12, depth: 10, height: 16, color: '#75818a', accent: '#d1a365' },
  { x: -44, z: 54, width: 12, depth: 10, height: 11, color: '#9c8c77', accent: '#c48155' },
  { x: 44, z: 54, width: 13, depth: 10, height: 17, color: '#777a78', accent: '#d9ae66' },
  { x: 70, z: -12, width: 9, depth: 9, height: 12, color: '#82796e', accent: '#c37a59' },
  { x: -70, z: 22, width: 9, depth: 9, height: 13, color: '#8e8072', accent: '#d3aa67' },
]

function Building({ x, z, width, depth, height, color, accent, facadeTexture }: BuildingSpec & { facadeTexture: Texture }) {
  const floors = Math.max(2, Math.floor(height / 3))
  const columns = Math.max(3, Math.floor(width / 2.4))
  const windowWidth = Math.min(0.86, width / (columns * 1.65))

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.5, 0.44, depth + 0.5]} />
        <meshStandardMaterial color="#5f5d58" roughness={0.96} />
      </mesh>
      <mesh position={[0, height / 2 + 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial map={facadeTexture} color={color} roughness={0.91} metalness={0.02} />
      </mesh>
      <mesh position={[0, height + 0.48, 0]} castShadow>
        <boxGeometry args={[width + 0.65, 0.28, depth + 0.65]} />
        <meshStandardMaterial color="#5d5d59" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.92, depth / 2 + 0.06]}>
        <boxGeometry args={[width * 0.26, 1.35, 0.14]} />
        <meshStandardMaterial color="#31363a" roughness={0.58} />
      </mesh>
      {Array.from({ length: floors }, (_, floor) => {
        const windowY = 1.55 + floor * 2.72
        return (
          <group key={`floor-${floor}`}>
            <mesh position={[0, windowY - 0.64, depth / 2 + 0.035]}>
              <boxGeometry args={[width * 0.96, 0.12, 0.18]} />
              <meshStandardMaterial color={accent} roughness={0.84} />
            </mesh>
            {Array.from({ length: columns }, (_, column) => {
              const windowX = (column - (columns - 1) / 2) * (width / (columns + 0.1))
              const lit = (column * 5 + floor * 3 + Math.round(x + z)) % 5 !== 0
              return (
                <group key={`window-${floor}-${column}`} position={[windowX, windowY, depth / 2 + 0.08]}>
                  <mesh>
                    <boxGeometry args={[windowWidth + 0.12, 1.18, 0.12]} />
                    <meshStandardMaterial color="#4a4c4a" roughness={0.7} />
                  </mesh>
                  <mesh position={[0, 0, 0.08]}>
                    <boxGeometry args={[windowWidth, 0.94, 0.08]} />
                    <meshStandardMaterial
                      color={lit ? '#d4b985' : '#33404a'}
                      emissive={lit ? '#9c7042' : '#101820'}
                      emissiveIntensity={lit ? 0.28 : 0.04}
                      roughness={0.3}
                      metalness={0.12}
                    />
                  </mesh>
                  <mesh position={[0, -0.02, 0.14]}>
                    <boxGeometry args={[0.045, 0.9, 0.04]} />
                    <meshStandardMaterial color="#677078" metalness={0.36} roughness={0.46} />
                  </mesh>
                </group>
              )
            })}
          </group>
        )
      })}
      <mesh position={[-width * 0.34, height + 0.82, -depth * 0.08]} castShadow>
        <cylinderGeometry args={[0.62, 0.68, 1.1, 10]} />
        <meshStandardMaterial color="#8a8579" roughness={0.94} />
      </mesh>
      <mesh position={[width * 0.28, height + 0.9, depth * 0.12]}>
        <boxGeometry args={[1.4, 0.55, 1]} />
        <meshStandardMaterial color="#696a67" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Crosswalk({ x, z }: { x: number; z: number }) {
  return (
    <group>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={`east-${index}`} position={[x - 3 + index * 1.2, 0.025, z + 5.5]}>
          <boxGeometry args={[0.72, 0.035, 0.22]} />
          <meshBasicMaterial color="#d5d0c3" />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={`north-${index}`} position={[x + 5.5, 0.027, z - 3 + index * 1.2]}>
          <boxGeometry args={[0.22, 0.035, 0.72]} />
          <meshBasicMaterial color="#d5d0c3" />
        </mesh>
      ))}
    </group>
  )
}

function RoadGrid({
  pavementTexture,
  horizontalRoadTexture,
  verticalRoadTexture,
}: {
  pavementTexture: Texture
  horizontalRoadTexture: Texture
  verticalRoadTexture: Texture
}) {
  const dashPositions = Array.from({ length: 19 }, (_, index) => -86 + index * 9.5)
  const coreIntersections = [-42, -18, 18, 42]

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial map={pavementTexture} color="#c1b8a9" roughness={1} />
      </mesh>
      {ROAD_LINES.map((offset) => {
        const width = Math.abs(offset) <= 42 ? 10 : 7
        const isMainRoad = width === 10
        return (
          <group key={`road-${offset}`}>
            <mesh position={[0, -0.08, offset]} receiveShadow>
              <boxGeometry args={[180, 0.16, width]} />
              <meshStandardMaterial map={horizontalRoadTexture} color="#ded8cd" roughness={0.96} />
            </mesh>
            {[-1, 1].map((side) => (
              <group key={`sidewalk-h-${side}`}>
                <mesh position={[0, 0.015, offset + side * (width / 2 + 1.15)]} receiveShadow>
                  <boxGeometry args={[180, 0.2, 1.9]} />
                  <meshStandardMaterial map={pavementTexture} color="#ded5c7" roughness={0.92} />
                </mesh>
                <mesh position={[0, 0.11, offset + side * (width / 2 + 0.16)]}>
                  <boxGeometry args={[180, 0.28, 0.22]} />
                  <meshStandardMaterial color="#c0b7a5" roughness={0.87} />
                </mesh>
              </group>
            ))}
            {isMainRoad && dashPositions.map((position) => (
              <mesh key={`dash-h-${position}`} position={[position, 0.012, offset]}>
                <boxGeometry args={[3.2, 0.026, 0.12]} />
                <meshBasicMaterial color="#d4b877" />
              </mesh>
            ))}
          </group>
        )
      })}
      {ROAD_LINES.map((offset) => {
        const width = Math.abs(offset) <= 42 ? 10 : 7
        const isMainRoad = width === 10
        return (
          <group key={`road-v-${offset}`}>
            <mesh position={[offset, -0.075, 0]} receiveShadow>
              <boxGeometry args={[width, 0.16, 180]} />
              <meshStandardMaterial map={verticalRoadTexture} color="#ded8cd" roughness={0.96} />
            </mesh>
            {[-1, 1].map((side) => (
              <group key={`sidewalk-v-${side}`}>
                <mesh position={[offset + side * (width / 2 + 1.15), 0.016, 0]} receiveShadow>
                  <boxGeometry args={[1.9, 0.2, 180]} />
                  <meshStandardMaterial map={pavementTexture} color="#ded5c7" roughness={0.92} />
                </mesh>
                <mesh position={[offset + side * (width / 2 + 0.16), 0.11, 0]}>
                  <boxGeometry args={[0.22, 0.28, 180]} />
                  <meshStandardMaterial color="#c0b7a5" roughness={0.87} />
                </mesh>
              </group>
            ))}
            {isMainRoad && dashPositions.map((position) => (
              <mesh key={`dash-v-${position}`} position={[offset, 0.014, position]}>
                <boxGeometry args={[0.12, 0.026, 3.2]} />
                <meshBasicMaterial color="#d4b877" />
              </mesh>
            ))}
          </group>
        )
      })}
      {coreIntersections.flatMap((x) => coreIntersections.map((z) => <Crosswalk key={`crossing-${x}-${z}`} x={x} z={z} />))}
      <mesh position={[0, 0.02, 66.8]}>
        <boxGeometry args={[180, 0.18, 1.1]} />
        <meshStandardMaterial color="#b6aa92" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 78]} receiveShadow>
        <planeGeometry args={[180, 20]} />
        <meshStandardMaterial color="#34535b" roughness={0.34} metalness={0.18} />
      </mesh>
    </group>
  )
}

function StreetTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.32, 2.7, 9]} />
        <meshStandardMaterial color="#695343" roughness={0.97} />
      </mesh>
      <mesh position={[0, 3.05, 0]} castShadow>
        <sphereGeometry args={[1.18, 10, 9]} />
        <meshStandardMaterial color="#5e6656" roughness={0.98} />
      </mesh>
      <mesh position={[0.42, 3.4, 0.1]} castShadow>
        <sphereGeometry args={[0.72, 9, 8]} />
        <meshStandardMaterial color="#73705c" roughness={1} />
      </mesh>
      <mesh position={[-0.48, 2.78, -0.1]} castShadow>
        <sphereGeometry args={[0.76, 9, 8]} />
        <meshStandardMaterial color="#555e52" roughness={1} />
      </mesh>
    </group>
  )
}

function StreetLamp({ position, lit = false }: { position: [number, number, number]; lit?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 2.45, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 4.9, 8]} />
        <meshStandardMaterial color="#4b5052" metalness={0.58} roughness={0.46} />
      </mesh>
      <mesh position={[0.34, 4.74, 0]} rotation={[0, 0, -0.16]}>
        <boxGeometry args={[0.84, 0.1, 0.16]} />
        <meshStandardMaterial color="#53565a" metalness={0.52} roughness={0.4} />
      </mesh>
      <mesh position={[0.7, 4.63, 0]}>
        <boxGeometry args={[0.36, 0.12, 0.3]} />
        <meshStandardMaterial color="#edc17a" emissive="#d39b54" emissiveIntensity={lit ? 1.4 : 0.7} roughness={0.25} />
      </mesh>
      {lit && <pointLight position={[0.7, 4.5, 0]} color="#ffd49a" intensity={0.48} distance={11} decay={2} />}
    </group>
  )
}

function Flyover() {
  const piers = [-72, -48, -24, 0, 24, 48, 72]
  const laneMarks = Array.from({ length: 18 }, (_, index) => -84 + index * 9.5)
  return (
    <group position={[0, 0, -42]}>
      {piers.map((x) => (
        <mesh key={`pier-${x}`} position={[x, 3.1, 0]} castShadow>
          <boxGeometry args={[1.7, 6.2, 1.4]} />
          <meshStandardMaterial color="#858178" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 6.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[180, 0.9, 10]} />
        <meshStandardMaterial color="#454a50" roughness={0.94} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`rail-${side}`} position={[0, 7.12, side * 4.75]}>
          <boxGeometry args={[180, 0.42, 0.28]} />
          <meshStandardMaterial color="#b9b2a4" roughness={0.66} metalness={0.24} />
        </mesh>
      ))}
      {laneMarks.map((x) => (
        <mesh key={`flyover-mark-${x}`} position={[x, 6.92, 0]}>
          <boxGeometry args={[3.5, 0.026, 0.13]} />
          <meshBasicMaterial color="#d6bb83" />
        </mesh>
      ))}
    </group>
  )
}

function LagoonBridge() {
  const piers = [-72, -48, -24, 0, 24, 48, 72]
  const laneMarks = Array.from({ length: 19 }, (_, index) => -84 + index * 9.3)
  return (
    <group position={[0, 0, 76]}>
      {piers.map((x) => (
        <mesh key={`bridge-pier-${x}`} position={[x, 1.9, 0]} castShadow>
          <cylinderGeometry args={[0.65, 0.82, 4.2, 8]} />
          <meshStandardMaterial color="#696e70" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[180, 0.78, 7]} />
        <meshStandardMaterial color="#42484d" roughness={0.88} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`bridge-rail-${side}`} position={[0, 4.78, side * 3.2]}>
          <boxGeometry args={[180, 0.42, 0.22]} />
          <meshStandardMaterial color="#a39d91" metalness={0.26} roughness={0.62} />
        </mesh>
      ))}
      {laneMarks.map((x) => (
        <mesh key={`bridge-mark-${x}`} position={[x, 4.62, 0]}>
          <boxGeometry args={[3.1, 0.026, 0.11]} />
          <meshBasicMaterial color="#d6bb83" />
        </mesh>
      ))}
    </group>
  )
}

function CivicBuilding({ location, facadeTexture }: { location: (typeof WORLD_LOCATIONS)[number]; facadeTexture: Texture }) {
  const { x, z, kind } = location
  if (kind === 'bridge') return null

  if (kind === 'stadium') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 2.2, 0]} castShadow>
          <cylinderGeometry args={[10, 11, 4.4, 32, 1, true]} />
          <meshStandardMaterial color="#77766f" roughness={0.8} side={2} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[11.5, 0.18, 7]} />
          <meshStandardMaterial color="#536950" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.08, 0.035, 6.8]} />
          <meshBasicMaterial color="#ded8c6" />
        </mesh>
        <mesh position={[0, 2.25, 0]}>
          <torusGeometry args={[10.2, 0.16, 8, 32]} />
          <meshStandardMaterial color="#c6bba4" roughness={0.65} />
        </mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * 4.6, 0.42, 0]}><boxGeometry args={[0.11, 0.04, 6.6]} /><meshBasicMaterial color="#ded8c6" /></mesh>)}
        <mesh position={[0, 4.6, 0]} castShadow><boxGeometry args={[5.2, 0.46, 4.5]} /><meshStandardMaterial color="#a99c89" roughness={0.8} /></mesh>
        {[-1, 1].map((side) => <StreetLamp key={`stadium-lamp-${side}`} position={[side * 10, 0, -6]} lit={side < 0} />)}
      </group>
    )
  }

  if (kind === 'airport') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 2.7, 0]} castShadow receiveShadow><boxGeometry args={[19, 5.4, 8]} /><meshStandardMaterial color="#9c988e" roughness={0.7} /></mesh>
        <mesh position={[0, 4.4, 4.1]}><boxGeometry args={[15, 1.7, 0.18]} /><meshStandardMaterial color="#5c7580" metalness={0.22} roughness={0.3} /></mesh>
        <mesh position={[12, 5.4, -2]} castShadow><boxGeometry args={[3.2, 11, 3.2]} /><meshStandardMaterial color="#777a78" roughness={0.78} /></mesh>
        <mesh position={[12, 11.2, -2]}><boxGeometry args={[3.7, 1.2, 3.7]} /><meshStandardMaterial color="#526775" metalness={0.26} roughness={0.32} /></mesh>
        <mesh position={[0, 0.02, -12]}><boxGeometry args={[32, 0.08, 5]} /><meshStandardMaterial color="#464b50" roughness={0.88} /></mesh>
        {Array.from({ length: 8 }, (_, index) => <mesh key={`runway-light-${index}`} position={[-14 + index * 4, 0.14, -14]}><sphereGeometry args={[0.11, 8, 6]} /><meshStandardMaterial color="#f4d29a" emissive="#d5a35f" emissiveIntensity={1.2} /></mesh>)}
      </group>
    )
  }

  if (kind === 'port') {
    return (
      <group position={[x, 0, z]}>
        {Array.from({ length: 8 }, (_, index) => {
          const colors = ['#a85443', '#b67a45', '#4d6871', '#777a70']
          const row = Math.floor(index / 4)
          const column = index % 4
          return <mesh key={`container-${index}`} position={[-5.5 + column * 3.7, 1 + row * 2.1, -2 + row * 4]} castShadow><boxGeometry args={[3.5, 1.9, 3.5]} /><meshStandardMaterial color={colors[index % colors.length]} roughness={0.82} /></mesh>
        })}
        <mesh position={[0, 8, -8]} castShadow><boxGeometry args={[0.6, 15, 0.6]} /><meshStandardMaterial color="#77776f" metalness={0.34} roughness={0.58} /></mesh>
        <mesh position={[5, 14.8, -8]} castShadow><boxGeometry args={[10, 0.62, 0.58]} /><meshStandardMaterial color="#77776f" metalness={0.34} roughness={0.58} /></mesh>
        <mesh position={[8, 10.8, -8]}><boxGeometry args={[0.3, 7.4, 0.32]} /><meshStandardMaterial color="#a2957c" metalness={0.3} roughness={0.6} /></mesh>
        <mesh position={[5, 4.9, -8]}><boxGeometry args={[0.22, 0.22, 0.25]} /><meshStandardMaterial color="#d7a75f" emissive="#d7a75f" emissiveIntensity={0.6} /></mesh>
      </group>
    )
  }

  if (kind === 'farm') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[22, 0.11, 18]} /><meshStandardMaterial color="#756c5b" roughness={1} /></mesh>
        {Array.from({ length: 8 }, (_, index) => <mesh key={`crop-row-${index}`} position={[-8 + index * 2.3, 0.16, 0]}><boxGeometry args={[0.36, 0.18, 15]} /><meshStandardMaterial color={index % 2 ? '#5d684f' : '#777457'} roughness={1} /></mesh>)}
        <mesh position={[0, 1.6, -9]} castShadow><boxGeometry args={[6, 3.2, 4]} /><meshStandardMaterial color="#947656" roughness={0.94} /></mesh>
        <mesh position={[0, 3.35, -9]} rotation={[0, 0, Math.PI / 4]}><coneGeometry args={[4.2, 2, 4]} /><meshStandardMaterial color="#6f5741" roughness={0.92} /></mesh>
        <mesh position={[0, 0.9, -6.93]}><boxGeometry args={[1.5, 1.8, 0.1]} /><meshStandardMaterial color="#3e3d37" roughness={0.8} /></mesh>
      </group>
    )
  }

  if (kind === 'village') {
    const huts = [[-5, -3], [1, -5], [6, 1], [-2, 5], [5, 7]] as const
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[24, 0.12, 21]} /><meshStandardMaterial color="#887d69" roughness={1} /></mesh>
        {huts.map(([hutX, hutZ], index) => (
          <group key={`hut-${index}`} position={[hutX, 0, hutZ]}>
            <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[1.75, 2, 2.4, 8]} /><meshStandardMaterial color={index % 2 ? '#ad9270' : '#8f7558'} roughness={0.96} /></mesh>
            <mesh position={[0, 2.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[2.25, 1.7, 8]} /><meshStandardMaterial color="#59483a" roughness={1} /></mesh>
            <mesh position={[0, 0.8, 1.96]}><boxGeometry args={[0.62, 1.2, 0.12]} /><meshStandardMaterial color="#44372d" roughness={0.8} /></mesh>
          </group>
        ))}
      </group>
    )
  }

  if (kind === 'square') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[21, 0.16, 16]} /><meshStandardMaterial color="#b5aa98" roughness={0.9} /></mesh>
        <mesh position={[0, 0.42, 0]}><cylinderGeometry args={[2.3, 2.8, 0.65, 16]} /><meshStandardMaterial color="#7b7a74" roughness={0.66} /></mesh>
        <mesh position={[0, 0.94, 0]}><cylinderGeometry args={[1.25, 1.3, 0.38, 16]} /><meshStandardMaterial color="#4c6a70" roughness={0.32} metalness={0.18} /></mesh>
        {[-1, 1].map((side) => <mesh key={`plaza-seat-${side}`} position={[side * 6, 0.5, 4]}><boxGeometry args={[3.2, 0.4, 0.7]} /><meshStandardMaterial color="#6c5747" roughness={0.86} /></mesh>)}
      </group>
    )
  }

  if (kind === 'event-center') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[22, 0.6, 16]} /><meshStandardMaterial color="#626564" roughness={0.92} /></mesh>
        <mesh position={[0, 4.25, 0]} castShadow receiveShadow><boxGeometry args={[20, 8, 14]} /><meshStandardMaterial map={facadeTexture} color="#c6c1b6" roughness={0.82} /></mesh>
        <mesh position={[0, 4.2, 7.08]}><boxGeometry args={[15, 3.5, 0.12]} /><meshStandardMaterial color="#49636d" metalness={0.3} roughness={0.28} /></mesh>
        {Array.from({ length: 7 }, (_, index) => <mesh key={`event-mullion-${index}`} position={[-6.3 + index * 2.1, 4.2, 7.18]}><boxGeometry args={[0.07, 3.45, 0.1]} /><meshStandardMaterial color="#596469" metalness={0.42} roughness={0.38} /></mesh>)}
        <mesh position={[0, 2.45, 8.3]} castShadow><boxGeometry args={[16, 0.28, 2.5]} /><meshStandardMaterial color="#b89157" metalness={0.12} roughness={0.58} /></mesh>
        {[-6.5, 6.5].map((side) => <mesh key={`event-pillar-${side}`} position={[side, 1.48, 7.55]} castShadow><cylinderGeometry args={[0.16, 0.2, 2.95, 10]} /><meshStandardMaterial color="#b6b2a8" roughness={0.75} /></mesh>)}
        <mesh position={[0, 0.2, 9.5]}><boxGeometry args={[7.2, 0.2, 1.4]} /><meshStandardMaterial color="#a7a397" roughness={0.88} /></mesh>
        <mesh position={[0, 8.65, 7.2]}><boxGeometry args={[7.4, 0.82, 0.22]} /><meshStandardMaterial color="#343b40" metalness={0.15} roughness={0.56} /></mesh>
        <group position={[0, 8.65, 7.34]}><WorldLabel text="EKO EVENTS" width={6.8} accentColor="#d9ad62" /></group>
        <mesh position={[-5.5, 8.48, -2.6]} castShadow><boxGeometry args={[3.2, 1.2, 2.6]} /><meshStandardMaterial color="#737875" roughness={0.85} /></mesh>
        <mesh position={[4.8, 8.5, -2]} castShadow><boxGeometry args={[2.5, 1.3, 2.2]} /><meshStandardMaterial color="#737875" roughness={0.85} /></mesh>
      </group>
    )
  }

  const buildingColors: Record<string, { wall: string; trim: string; width: number; depth: number; height: number }> = {
    market: { wall: '#9e7453', trim: '#d49b55', width: 9, depth: 7, height: 4.4 },
    club: { wall: '#4b4650', trim: '#c96b53', width: 10, depth: 7, height: 6 },
    garage: { wall: '#716d64', trim: '#d19a4e', width: 10, depth: 8, height: 4.5 },
    hotel: { wall: '#817a70', trim: '#caa96b', width: 10, depth: 8, height: 11 },
    cafe: { wall: '#a48a6e', trim: '#b75e49', width: 8, depth: 7, height: 4.2 },
    police: { wall: '#76838b', trim: '#ba6050', width: 12, depth: 9, height: 7 },
    court: { wall: '#b0a795', trim: '#85755e', width: 14, depth: 10, height: 8 },
    hospital: { wall: '#b6b3aa', trim: '#4d7d85', width: 14, depth: 10, height: 10 },
    university: { wall: '#a58d72', trim: '#47626c', width: 16, depth: 10, height: 8 },
    school: { wall: '#b09c80', trim: '#a85d48', width: 13, depth: 9, height: 5.5 },
    government: { wall: '#b3aa98', trim: '#9d754c', width: 15, depth: 10, height: 9 },
    polling: { wall: '#a99b83', trim: '#ba6851', width: 8, depth: 6, height: 4 },
    bungalow: { wall: '#ad967a', trim: '#c47754', width: 11, depth: 8, height: 4.2 },
    estate: { wall: '#958e83', trim: '#a96650', width: 12, depth: 9, height: 6 },
    clubhouse: { wall: '#655d53', trim: '#cf9f59', width: 10, depth: 8, height: 5.2 },
  }
  const style = buildingColors[kind] ?? { wall: '#8d8377', trim: '#c59157', width: 10, depth: 8, height: 6 }

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.28, 0]} castShadow><boxGeometry args={[style.width + 0.8, 0.56, style.depth + 0.8]} /><meshStandardMaterial color="#68655f" roughness={0.94} /></mesh>
      <mesh position={[0, style.height / 2 + 0.56, 0]} castShadow receiveShadow><boxGeometry args={[style.width, style.height, style.depth]} /><meshStandardMaterial map={facadeTexture} color={style.wall} roughness={0.9} /></mesh>
      <mesh position={[0, style.height + 0.7, 0]} castShadow><boxGeometry args={[style.width + 0.6, 0.32, style.depth + 0.6]} /><meshStandardMaterial color={style.trim} roughness={0.78} /></mesh>
      <mesh position={[0, 0.86, style.depth / 2 + 0.07]}><boxGeometry args={[1.45, 1.52, 0.16]} /><meshStandardMaterial color="#35383a" roughness={0.5} /></mesh>
      {[-1, 1].map((side) => <mesh key={`column-${side}`} position={[side * style.width * 0.34, 1.8, style.depth / 2 + 0.12]} castShadow><cylinderGeometry args={[0.22, 0.28, 2.65, 8]} /><meshStandardMaterial color="#d0c6b4" roughness={0.72} /></mesh>)}
      <mesh position={[0, style.height + 1.1, style.depth / 2 + 0.22]}><boxGeometry args={[style.width * 0.5, 0.6, 0.14]} /><meshStandardMaterial color={kind === 'hospital' ? '#e7e1d2' : style.trim} emissive={style.trim} emissiveIntensity={0.18} roughness={0.45} /></mesh>
      {kind === 'hospital' && (
        <group position={[0, style.height + 2.35, style.depth / 2 + 0.22]}>
          <mesh><boxGeometry args={[0.44, 1.35, 0.18]} /><meshStandardMaterial color="#ba554b" emissive="#8e342f" emissiveIntensity={0.25} /></mesh>
          <mesh><boxGeometry args={[1.35, 0.44, 0.2]} /><meshStandardMaterial color="#ba554b" emissive="#8e342f" emissiveIntensity={0.25} /></mesh>
        </group>
      )}
      {kind === 'police' && <mesh position={[0, 3.1, style.depth / 2 + 0.18]}><boxGeometry args={[style.width * 0.8, 0.3, 0.16]} /><meshStandardMaterial color="#32546a" roughness={0.45} /></mesh>}
      {(kind === 'court' || kind === 'government') && [-4, -2, 0, 2, 4].map((column) => <mesh key={`civic-column-${column}`} position={[column, 2.4, style.depth / 2 + 0.3]} castShadow><cylinderGeometry args={[0.19, 0.24, 3.6, 8]} /><meshStandardMaterial color="#d4caba" roughness={0.7} /></mesh>)}
      {kind === 'market' && [-1, 1].map((side) => <mesh key={`awning-${side}`} position={[side * 2.8, 2.6, style.depth / 2 + 0.85]} rotation={[0.18, 0, side * 0.06]}><boxGeometry args={[3.4, 0.16, 1.9]} /><meshStandardMaterial color={side < 0 ? '#b65a48' : '#d1a24c'} roughness={0.8} /></mesh>)}
      {(kind === 'bungalow' || kind === 'estate') && <mesh position={[0, style.height + 1.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[style.width * 0.61, 2.2, 4]} /><meshStandardMaterial color="#67574a" roughness={0.95} /></mesh>}
    </group>
  )
}

function WorldLabel({ text, width, accentColor }: { text: string; width: number; accentColor: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) return null

    context.fillStyle = 'rgba(16, 23, 30, 0.94)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = accentColor
    context.lineWidth = 4
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6)
    context.fillStyle = '#f2e8d7'
    context.font = '600 40px Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 36)

    const labelTexture = new CanvasTexture(canvas)
    labelTexture.colorSpace = SRGBColorSpace
    return labelTexture
  }, [accentColor, text])

  if (!texture) return null

  return (
    <mesh>
      <planeGeometry args={[width, width / 4]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}

function LandmarkMarkers({ waypoint }: { waypoint: LocationId | null }) {
  const target = WORLD_LOCATIONS.find((location) => location.id === waypoint)

  return (
    <group>
      {WORLD_LOCATIONS.map((location) => (
        <group key={location.id} position={[location.x, 0, location.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
            <ringGeometry args={[0.5, 0.62, 32]} />
            <meshBasicMaterial color={location.id === waypoint ? '#f2c77b' : '#b58b59'} transparent opacity={location.id === waypoint ? 0.92 : 0.55} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <octahedronGeometry args={[0.17, 0]} />
            <meshStandardMaterial color={location.id === waypoint ? '#f4d18e' : '#c1965d'} emissive={location.id === waypoint ? '#b17a3d' : '#66482d'} emissiveIntensity={0.78} roughness={0.34} />
          </mesh>
        </group>
      ))}
      {target && (
        <group position={[target.x, 0, target.z]}>
          <mesh position={[0, 2.8, 0]}>
            <cylinderGeometry args={[0.08, 0.52, 5.4, 12, 1, true]} />
            <meshBasicMaterial color="#f1c574" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <mesh position={[0, 5.6, 0]}>
            <octahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color="#ffe1a1" emissive="#bd8244" emissiveIntensity={1.5} />
          </mesh>
          <group position={[0, 6.3, 0]}>
            <WorldLabel text={target.name} width={5.2} accentColor="#d9ad62" />
          </group>
        </group>
      )}
    </group>
  )
}

function HumanoidModel({
  skinTone,
  hairColor,
  clothing,
  accentColor,
  keysRef,
  paused = false,
  walking = false,
}: {
  skinTone: string
  hairColor: string
  clothing: string
  accentColor: string
  keysRef?: MutableRefObject<Set<string>>
  paused?: boolean
  walking?: boolean
}) {
  const leftArm = useRef<Group>(null!)
  const rightArm = useRef<Group>(null!)
  const leftLeg = useRef<Group>(null!)
  const rightLeg = useRef<Group>(null!)

  useFrame((state) => {
    const isMoving = Boolean(keysRef?.current.size) && !paused
    const stride = isMoving ? Math.sin(state.clock.elapsedTime * 10) * 0.44 : 0
    const idle = Math.sin(state.clock.elapsedTime * 1.5) * 0.035
    leftArm.current.rotation.x = isMoving ? stride : idle
    rightArm.current.rotation.x = isMoving ? -stride : -idle
    leftLeg.current.rotation.x = isMoving ? -stride : 0
    rightLeg.current.rotation.x = isMoving ? stride : 0
  })

  return (
    <group>
      <mesh position={[0, 1.03, 0]} castShadow>
        <capsuleGeometry args={[0.27, 0.48, 5, 10]} />
        <meshStandardMaterial color={clothing} roughness={0.77} />
      </mesh>
      <mesh position={[0, 1.42, 0.015]}>
        <boxGeometry args={[0.45, 0.13, 0.32]} />
        <meshStandardMaterial color={accentColor} roughness={0.76} />
      </mesh>
      <mesh position={[0, 1.54, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.25, 10]} />
        <meshStandardMaterial color={skinTone} roughness={0.92} />
      </mesh>
      <mesh position={[0, 1.86, 0]} castShadow>
        <sphereGeometry args={[0.2, 18, 14]} />
        <meshStandardMaterial color={skinTone} roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.99, -0.035]}>
        <sphereGeometry args={[0.205, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hairColor} roughness={0.96} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`face-side-${side}`}>
          <mesh position={[side * 0.205, 1.86, 0.01]}><sphereGeometry args={[0.038, 10, 8]} /><meshStandardMaterial color={skinTone} roughness={0.9} /></mesh>
          <mesh position={[side * 0.072, 1.88, 0.17]}><sphereGeometry args={[0.019, 10, 8]} /><meshStandardMaterial color="#f0e8dc" roughness={0.5} /></mesh>
          <mesh position={[side * 0.072, 1.88, 0.188]}><sphereGeometry args={[0.009, 8, 6]} /><meshStandardMaterial color="#211c19" roughness={0.5} /></mesh>
          <mesh position={[side * 0.072, 1.93, 0.16]} rotation={[0, 0, side * -0.1]}><boxGeometry args={[0.08, 0.016, 0.02]} /><meshStandardMaterial color={hairColor} roughness={0.9} /></mesh>
        </group>
      ))}
      <mesh position={[0, 1.82, 0.194]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.035, 0.085, 6]} /><meshStandardMaterial color={skinTone} roughness={0.88} /></mesh>
      <mesh position={[0, 1.73, 0.18]}><boxGeometry args={[0.075, 0.014, 0.018]} /><meshStandardMaterial color="#57392f" roughness={0.82} /></mesh>
      <group ref={leftArm} position={[-0.33, 1.28, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.09, 0.36, 5, 8]} /><meshStandardMaterial color={clothing} roughness={0.8} /></mesh>
        <mesh position={[0, -0.53, 0.02]}><sphereGeometry args={[0.085, 8, 7]} /><meshStandardMaterial color={skinTone} roughness={0.9} /></mesh>
      </group>
      <group ref={rightArm} position={[0.33, 1.28, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.09, 0.36, 5, 8]} /><meshStandardMaterial color={clothing} roughness={0.8} /></mesh>
        <mesh position={[0, -0.53, 0.02]}><sphereGeometry args={[0.085, 8, 7]} /><meshStandardMaterial color={skinTone} roughness={0.9} /></mesh>
      </group>
      <group ref={leftLeg} position={[-0.13, 0.72, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.105, 0.37, 5, 8]} /><meshStandardMaterial color="#35383a" roughness={0.94} /></mesh>
        <mesh position={[0, -0.55, 0.11]} castShadow><boxGeometry args={[0.23, 0.16, 0.38]} /><meshStandardMaterial color="#24272a" roughness={0.86} /></mesh>
      </group>
      <group ref={rightLeg} position={[0.13, 0.72, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow><capsuleGeometry args={[0.105, 0.37, 5, 8]} /><meshStandardMaterial color="#35383a" roughness={0.94} /></mesh>
        <mesh position={[0, -0.55, 0.11]} castShadow><boxGeometry args={[0.23, 0.16, 0.38]} /><meshStandardMaterial color="#24272a" roughness={0.86} /></mesh>
      </group>
      {walking && <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.34, 0.42, 24]} /><meshBasicMaterial color="#d8aa68" transparent opacity={0.48} /></mesh>}
    </group>
  )
}

function CharacterActor({ character }: { character: (typeof CITY_CHARACTERS)[number] }) {
  const characterRef = useRef<Group>(null!)

  useFrame((state) => {
    if (characterRef.current) characterRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.7 + character.x) * 0.025
  })

  return (
    <group ref={characterRef} position={[character.x, 0, character.z]}>
      <HumanoidModel skinTone={character.skinTone} hairColor={character.hairColor} clothing={character.color} accentColor={character.accentColor} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}><ringGeometry args={[0.38, 0.43, 24]} /><meshBasicMaterial color="#c18c56" transparent opacity={0.52} /></mesh>
    </group>
  )
}

function AvatarModel({ keysRef, paused }: { keysRef: MutableRefObject<Set<string>>; paused: boolean }) {
  return <HumanoidModel skinTone="#80543e" hairColor="#201a17" clothing="#52606a" accentColor="#cf9e62" keysRef={keysRef} paused={paused} walking />
}

function ScooterModel() {
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.64, 0]} castShadow><boxGeometry args={[0.74, 0.48, 1.55]} /><meshStandardMaterial color="#bd8447" metalness={0.22} roughness={0.5} /></mesh>
      <mesh position={[0, 0.98, -0.18]} rotation={[-0.16, 0, 0]}><boxGeometry args={[0.51, 0.42, 0.65]} /><meshStandardMaterial color="#6e7778" roughness={0.42} /></mesh>
      <mesh position={[0, 1.22, -0.67]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#f8d995" emissive="#efbd69" emissiveIntensity={1.35} /></mesh>
      {[-0.4, 0.4].map((x) => [-0.52, 0.52].map((z) => <mesh key={`${x}-${z}`} position={[x, 0.31, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.27, 0.27, 0.17, 16]} /><meshStandardMaterial color="#1c2021" roughness={0.96} /></mesh>))}
      <mesh position={[0, 0.97, 0.57]}><boxGeometry args={[0.68, 0.08, 0.12]} /><meshStandardMaterial color="#474d4f" metalness={0.58} roughness={0.42} /></mesh>
    </group>
  )
}

function TrafficVehicle({ position, color, speed, minibus = false }: { position: [number, number, number]; color: string; speed: number; minibus?: boolean }) {
  const vehicleRef = useRef<Group>(null!)

  useFrame((_, delta) => {
    if (!vehicleRef.current) return
    vehicleRef.current.position.x += speed * Math.min(delta, 0.05)
    if (vehicleRef.current.position.x > 90) vehicleRef.current.position.x = -90
  })

  return (
    <group ref={vehicleRef} position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={minibus ? [1.85, 1.15, 3.6] : [1.72, 0.72, 3.4]} /><meshStandardMaterial color={color} metalness={0.15} roughness={0.58} /></mesh>
      <mesh position={[0, minibus ? 1.38 : 1.12, -0.08]} castShadow><boxGeometry args={minibus ? [1.55, 0.55, 2.4] : [1.38, 0.48, 1.75]} /><meshStandardMaterial color="#526a73" metalness={0.28} roughness={0.29} /></mesh>
      <mesh position={[0, 0.42, 1.73]}><boxGeometry args={[1.45, 0.16, 0.14]} /><meshStandardMaterial color="#4a4e50" metalness={0.34} roughness={0.48} /></mesh>
      {[-1, 1].map((side) => (
        <group key={`wheels-${side}`}>
          {[-1.1, 1.1].map((wheelZ) => <mesh key={wheelZ} position={[side * 0.86, 0.36, wheelZ]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.28, 0.28, 0.16, 12]} /><meshStandardMaterial color="#1b1d1f" roughness={0.98} /></mesh>)}
          <mesh position={[side * 0.58, 0.76, 1.68]}><boxGeometry args={[0.16, 0.2, 0.12]} /><meshStandardMaterial color="#f4d59a" emissive="#c58f51" emissiveIntensity={0.72} /></mesh>
        </group>
      ))}
      {minibus && <mesh position={[0, 1.05, 0.54]}><boxGeometry args={[1.88, 0.13, 0.12]} /><meshStandardMaterial color="#e9d08c" roughness={0.75} /></mesh>}
    </group>
  )
}

function PlayerController({ keysRef, onPlayerPosition, inVehicle, paused, spawnPosition }: Pick<CityWorldProps, 'keysRef' | 'onPlayerPosition' | 'inVehicle' | 'paused' | 'spawnPosition'>) {
  const playerRef = useRef<Group>(null!)
  const { camera, size } = useThree()
  const cameraTarget = useRef(new Vector3())
  const cameraLookAt = useRef(new Vector3())
  const movement = useRef(new Vector3())
  const publishTimer = useRef(0)
  const onPositionRef = useRef(onPlayerPosition)
  onPositionRef.current = onPlayerPosition

  useEffect(() => {
    playerRef.current?.position.set(spawnPosition.x, 0, spawnPosition.z)
    publishTimer.current = 0
    onPositionRef.current(spawnPosition)
  }, [spawnPosition.x, spawnPosition.z])

  useFrame((_, delta) => {
    if (!playerRef.current) return
    const step = Math.min(delta, 0.05)
    const keys = keysRef.current
    const direction = movement.current.set(0, 0, 0)

    if (!paused) {
      if (keys.has('w') || keys.has('arrowup')) direction.z -= 1
      if (keys.has('s') || keys.has('arrowdown')) direction.z += 1
      if (keys.has('a') || keys.has('arrowleft')) direction.x -= 1
      if (keys.has('d') || keys.has('arrowright')) direction.x += 1

      if (direction.lengthSq() > 0) {
        direction.normalize()
        const speed = inVehicle ? 10 : 5.2
        playerRef.current.position.x += direction.x * speed * step
        playerRef.current.position.z += direction.z * speed * step
        playerRef.current.rotation.y = MathUtils.damp(playerRef.current.rotation.y, Math.atan2(direction.x, direction.z), 10, step)
      }
    }

    playerRef.current.position.x = MathUtils.clamp(playerRef.current.position.x, -82, 82)
    playerRef.current.position.z = MathUtils.clamp(playerRef.current.position.z, -82, 78)
    const { x, z } = playerRef.current.position
    const onBridge = z >= 72 && z <= 78
    playerRef.current.position.y = onBridge ? 4.62 : 0

    const tallViewport = size.height > size.width * 1.15
    const perspectiveCamera = camera as PerspectiveCamera
    const nextFov = tallViewport ? 55 : 43
    if (perspectiveCamera.fov !== nextFov) {
      perspectiveCamera.fov = nextFov
      perspectiveCamera.updateProjectionMatrix()
    }
    cameraTarget.current.set(x, playerRef.current.position.y + (tallViewport ? (inVehicle ? 16 : 17) : (inVehicle ? 8.5 : 9.5)), z + (tallViewport ? 22 : 16))
    cameraLookAt.current.set(x, playerRef.current.position.y + (inVehicle ? 1.8 : 2), z - 7)
    camera.position.lerp(cameraTarget.current, 1 - Math.exp(-step * 3.8))
    camera.lookAt(cameraLookAt.current)

    publishTimer.current += step
    if (publishTimer.current > 0.16) {
      publishTimer.current = 0
      onPositionRef.current({ x, z })
    }
  })

  return (
    <group ref={playerRef} position={[spawnPosition.x, 0, spawnPosition.z]}>
      {inVehicle ? <ScooterModel /> : <AvatarModel keysRef={keysRef} paused={paused} />}
    </group>
  )
}

function RemotePlayerAvatar({ player }: { player: RemotePlayer }) {
  const palette = ['#76624f', '#405a6a', '#7e514a', '#647050', '#74627b'] as const
  const paletteIndex = [...player.userId].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7) % palette.length
  const color = palette[paletteIndex]

  return (
    <group position={[player.x, 0, player.z]}>
      {player.inVehicle && <group position={[0, 0, 0.2]} scale={0.72}><ScooterModel /></group>}
      <HumanoidModel skinTone="#87583f" hairColor="#211a17" clothing={color} accentColor="#d0a76b" />
      <group position={[0, 2.4, 0]}>
        <WorldLabel text={player.displayName} width={3.6} accentColor="#c9a66b" />
      </group>
    </group>
  )
}

function CityScene({ keysRef, onPlayerPosition, inVehicle, paused, waypoint, spawnPosition, remotePlayers }: CityWorldProps) {
  const concreteSource = useTexture('/textures/lagos-concrete.png')
  const asphaltSource = useTexture('/textures/eko-asphalt.png')
  const facadeTexture = useMemo(() => cloneTiledTexture(concreteSource, 3, 3), [concreteSource])
  const pavementTexture = useMemo(() => cloneTiledTexture(concreteSource, 18, 18), [concreteSource])
  const horizontalRoadTexture = useMemo(() => cloneTiledTexture(asphaltSource, 18, 1), [asphaltSource])
  const verticalRoadTexture = useMemo(() => cloneTiledTexture(asphaltSource, 1, 18), [asphaltSource])
  const treePositions: [number, number, number][] = [
    [-10, 0, -6], [10, 0, -6], [-10, 0, 8], [10, 0, 8],
    [-34, 0, -10], [34, 0, 10], [-34, 0, 35], [34, 0, 35],
    [-8, 0, 35], [8, 0, 35], [-34, 0, -34], [34, 0, -34],
    [-66, 0, 18], [66, 0, -30], [-64, 0, 46], [64, 0, 52],
  ]
  const lampPositions: [number, number, number][] = [
    [-9, 0, -8], [9, 0, -8], [-9, 0, 9], [9, 0, 9],
    [-35, 0, -17], [35, 0, 17], [-35, 0, 35], [35, 0, 35],
    [-65, 0, -17], [65, 0, 17], [-65, 0, 42], [65, 0, 42],
    [-18, 0, -64], [18, 0, -64], [-42, 0, 58], [42, 0, 58],
  ]

  return (
    <>
      <color attach="background" args={['#121a22']} />
      <fog attach="fog" args={['#121a22', 64, 210]} />
      <ambientLight intensity={0.72} color="#c1c8ca" />
      <hemisphereLight args={['#a9b9ca', '#38352f', 0.92]} />
      <directionalLight position={[28, 40, 12]} intensity={1.45} color="#e6d5bd" castShadow />
      <pointLight position={[-18, 14, 14]} intensity={0.48} color="#d3a66c" distance={42} />
      <Stars radius={160} depth={80} count={360} factor={2} saturation={0} fade speed={0.12} />
      <RoadGrid pavementTexture={pavementTexture} horizontalRoadTexture={horizontalRoadTexture} verticalRoadTexture={verticalRoadTexture} />
      <Flyover />
      <LagoonBridge />
      {BUILDINGS.map((building) => <Building key={`${building.x}-${building.z}`} {...building} facadeTexture={facadeTexture} />)}
      {WORLD_LOCATIONS.map((location) => <CivicBuilding key={location.id} location={location} facadeTexture={facadeTexture} />)}
      {treePositions.map((position, index) => <StreetTree key={`tree-${index}`} position={position} scale={index % 3 === 0 ? 1.06 : 0.88} />)}
      {lampPositions.map((position, index) => <StreetLamp key={`lamp-${index}`} position={position} lit={index < 5} />)}
      <TrafficVehicle position={[-78, 0, 18]} color="#d2a342" speed={3.4} minibus />
      <TrafficVehicle position={[-34, 0, -18]} color="#5a6870" speed={2.2} />
      <TrafficVehicle position={[8, 0, 42]} color="#823f3c" speed={2.8} minibus />
      <TrafficVehicle position={[-18, 0, -66]} color="#c0b18f" speed={2.5} />
      {CITY_CHARACTERS.map((character) => <CharacterActor key={character.id} character={character} />)}
      {remotePlayers.map((player) => <RemotePlayerAvatar key={player.userId} player={player} />)}
      <LandmarkMarkers waypoint={waypoint} />
      <PlayerController keysRef={keysRef} onPlayerPosition={onPlayerPosition} inVehicle={inVehicle} paused={paused} spawnPosition={spawnPosition} />
    </>
  )
}

export function CityWorld(props: CityWorldProps) {
  return (
    <div className="world-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.35]}
        shadows="basic"
        camera={{ position: [-2, 16, 24], fov: 55, near: 0.1, far: 280 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <CityScene {...props} />
      </Canvas>
    </div>
  )
}
