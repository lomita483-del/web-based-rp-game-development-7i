'use client'

import { Stars, useGLTF, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import { CanvasTexture, MathUtils, RepeatWrapping, SRGBColorSpace, type Group, type MeshStandardMaterial, type PerspectiveCamera, type Texture, Vector3 } from 'three'
import {
  CITY_BUILDINGS,
  CITY_CHARACTERS,
  CITY_COLLISION_BLOCKS,
  LOCATION_FOOTPRINTS,
  WORLD_LOCATIONS,
  getBuildingEntrancePosition,
  getLocationEntrancePosition,
  type CityBuilding,
  type Gender,
  type InteriorDefinition,
  type LocationId,
  type RemotePlayer,
  type RideVehicleType,
} from './game-data'
import { InteriorScene } from './interior-scene'

type PlayerPosition = { x: number; z: number }
type CameraLook = { yaw: number; pitch: number; zoom: number }

type CityWorldProps = {
  keysRef: MutableRefObject<Set<string>>
  onPlayerPosition: (position: PlayerPosition) => void
  inVehicle: boolean
  rideVehicle?: RideVehicleType | null
  gender: Gender
  activeInterior: InteriorDefinition | null
  paused: boolean
  waypoint: LocationId | null
  autoWalkTarget: LocationId | null
  spawnPosition: PlayerPosition
  remotePlayers: RemotePlayer[]
  gameMinutes: number
}

type BuildingSpec = CityBuilding

function cloneTiledTexture(source: Texture, repeatX: number, repeatY: number) {
  const texture = source.clone()
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  return texture
}

const ROAD_LINES = [-66, -42, -18, 18, 42, 66]
const TRAFFIC_INTERSECTIONS = [-42, -18, 18, 42]
const TRAFFIC_CYCLE_SECONDS = 22

type TrafficAxis = 'x' | 'z'
type TrafficSegment = 'street' | 'flyover' | 'bridge'
type TrafficVehicleKind = 'car' | 'danfo' | 'keke' | 'truck' | 'okada'
type TrafficVehicleSpec = {
  id: string
  kind: TrafficVehicleKind
  color: string
  axis: TrafficAxis
  direction: 1 | -1
  routeId: string
  road: number
  laneOffset: number
  segment: TrafficSegment
  y: number
  start: number
  min: number
  max: number
  speed: number
}

const TRAFFIC_PAINT_COLORS = ['#d7d2c8', '#526977', '#a95443', '#65765a', '#33434c', '#bb7647']
const TRAFFIC_KIND_CYCLE: TrafficVehicleKind[] = ['car', 'danfo', 'car', 'keke', 'okada', 'truck']

function getTrafficVehicleSpeed(kind: TrafficVehicleKind) {
  return kind === 'okada' ? 8.5 : kind === 'keke' ? 6.2 : kind === 'truck' ? 5.8 : kind === 'danfo' ? 7.2 : 9.5
}

function createTrafficFleet(): TrafficVehicleSpec[] {
  const vehicles: TrafficVehicleSpec[] = []
  let sequence = 0

  for (const axis of ['x', 'z'] as const) {
    ROAD_LINES.forEach((road, roadIndex) => {
      const roadWidth = Math.abs(road) <= 42 ? 7 : 5
      for (const direction of [1, -1] as const) {
        const busyApproach = axis === 'x' && road === -18 && direction === 1
        const vehicleCount = busyApproach || road === -18 || road === 18 ? 3 : 2
        for (let slot = 0; slot < vehicleCount; slot += 1) {
          const kind = TRAFFIC_KIND_CYCLE[(roadIndex * 3 + slot * 2 + (axis === 'z' ? 1 : 0) + (direction < 0 ? 2 : 0)) % TRAFFIC_KIND_CYCLE.length]
          const min = axis === 'x' ? -82 : Math.abs(road) >= 42 ? -70 : -78
          const max = axis === 'x' ? 82 : 78
          const length = max - min
          const start = busyApproach
            ? [-34, -41, -48][slot]
            : direction === 1
              ? min + 14 + slot * (length / vehicleCount) + roadIndex * 3
              : max - 14 - slot * (length / vehicleCount) - roadIndex * 3
          const color = kind === 'danfo'
            ? '#e1bd38'
            : kind === 'keke'
              ? '#d69e35'
              : kind === 'okada'
                ? '#31464d'
                : kind === 'truck'
                  ? TRAFFIC_PAINT_COLORS[(roadIndex + slot) % TRAFFIC_PAINT_COLORS.length]
                  : TRAFFIC_PAINT_COLORS[(roadIndex * 2 + slot + (axis === 'z' ? 2 : 0)) % TRAFFIC_PAINT_COLORS.length]
          const laneOffset = direction === 1 ? -Math.min(1.45, roadWidth * 0.24) : Math.min(1.45, roadWidth * 0.24)
          vehicles.push({
            id: `street-${sequence++}`,
            kind,
            color,
            axis,
            direction,
            routeId: `street-${axis}-${road}-${direction}`,
            road,
            laneOffset,
            segment: 'street',
            y: 0,
            start: min + ((((start - min) % length) + length) % length),
            min,
            max,
            speed: getTrafficVehicleSpeed(kind),
          })
        }
      }
    })
  }

  for (const segment of ['flyover', 'bridge'] as const) {
    const countPerDirection = segment === 'flyover' ? 3 : 2
    const road = segment === 'flyover' ? -42 : 76
    const laneWidth = segment === 'flyover' ? 2.1 : 1.35
    const y = segment === 'flyover' ? 6.98 : 4.68
    for (const direction of [1, -1] as const) {
      for (let slot = 0; slot < countPerDirection; slot += 1) {
        const kind = TRAFFIC_KIND_CYCLE[(sequence + slot * 2 + (direction < 0 ? 1 : 0)) % TRAFFIC_KIND_CYCLE.length]
        const min = -82
        const max = 82
        const length = max - min
        const start = direction === 1
          ? min + 12 + slot * (length / countPerDirection)
          : max - 12 - slot * (length / countPerDirection)
        vehicles.push({
          id: `${segment}-${sequence++}`,
          kind,
          color: kind === 'danfo' ? '#e1bd38' : kind === 'keke' ? '#d69e35' : kind === 'okada' ? '#31464d' : TRAFFIC_PAINT_COLORS[sequence % TRAFFIC_PAINT_COLORS.length],
          axis: 'x',
          direction,
          routeId: `${segment}-x-${direction}`,
          road,
          laneOffset: direction === 1 ? -laneWidth : laneWidth,
          segment,
          y,
          start: min + ((((start - min) % length) + length) % length),
          min,
          max,
          speed: getTrafficVehicleSpeed(kind) * (segment === 'flyover' ? 1.2 : 0.9),
        })
      }
    }
  }

  return vehicles
}

const CITY_TRAFFIC = createTrafficFleet()

function getTrafficSignalAspect(elapsed: number, x: number, z: number, axis: TrafficAxis) {
  const offset = ((x * 0.13 + z * 0.09) % TRAFFIC_CYCLE_SECONDS + TRAFFIC_CYCLE_SECONDS) % TRAFFIC_CYCLE_SECONDS
  const phase = (elapsed + offset) % TRAFFIC_CYCLE_SECONDS
  if (axis === 'x') return phase < 8.5 ? 'green' : phase < 10.5 ? 'amber' : 'red'
  return phase >= 11.5 && phase < 20 ? 'green' : phase >= 20 ? 'amber' : 'red'
}

function Building({ name, x, z, width, depth, height, color, accent, interiorKind, facadeTexture }: BuildingSpec & { facadeTexture: Texture }) {
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
      {interiorKind === 'house' && (
        <mesh position={[0, height + 1.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[width * 0.58, 1.45, 4]} />
          <meshStandardMaterial color="#755344" roughness={0.92} />
        </mesh>
      )}
      <mesh position={[0, 0.92, depth / 2 + 0.06]}>
        <boxGeometry args={[width * 0.26, 1.35, 0.14]} />
        <meshStandardMaterial color="#31363a" roughness={0.58} />
      </mesh>
      <group position={[0, height + 0.82, depth / 2 + 0.18]}>
        <WorldLabel text={name} width={Math.min(width * 0.84, 6.8)} accentColor={accent} />
      </group>
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

function BuildingLot({ building }: { building: CityBuilding }) {
  const road = ROAD_LINES.find((line) => line > building.z) ?? ROAD_LINES[ROAD_LINES.length - 1]
  const roadWidth = Math.abs(road) <= 42 ? 7 : 5
  const sidewalkZ = road + roadWidth / 2 + 0.8
  const drivewayStart = building.z + building.depth / 2 + 0.75
  const drivewayDepth = Math.max(0, sidewalkZ - drivewayStart)
  const isResidential = building.interiorKind === 'house' || building.interiorKind === 'apartment'
  const groundColor = building.interiorKind === 'house' ? '#55634a' : isResidential ? '#66675b' : '#746d5f'

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[building.x, -0.11, building.z]} receiveShadow>
        <planeGeometry args={[building.width + 2.6, building.depth + 2.6]} />
        <meshStandardMaterial color={groundColor} roughness={0.98} />
      </mesh>
      {drivewayDepth > 0.8 && (
        <mesh position={[building.x, 0.025, drivewayStart + drivewayDepth / 2]} receiveShadow>
          <boxGeometry args={[1.7, 0.06, drivewayDepth]} />
          <meshStandardMaterial color={isResidential ? '#898274' : '#77746c'} roughness={0.9} />
        </mesh>
      )}
      {isResidential && [-1, 1].map((side) => (
        <mesh key={side} position={[building.x + side * (building.width / 2 + 0.72), 0.42, building.z + building.depth / 2 - 0.35]} castShadow>
          <sphereGeometry args={[0.42, 9, 7]} />
          <meshStandardMaterial color={side < 0 ? '#53674b' : '#67734f'} roughness={0.98} />
        </mesh>
      ))}
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
        const width = Math.abs(offset) <= 42 ? 7 : 5
        const isMainRoad = width >= 7
        const sidewalkOffset = width / 2 + 0.8
        return (
          <group key={`road-${offset}`}>
            <mesh position={[0, -0.08, offset]} receiveShadow>
              <boxGeometry args={[180, 0.16, width]} />
              <meshStandardMaterial map={horizontalRoadTexture} color="#ded8cd" roughness={0.96} />
            </mesh>
            {[-1, 1].map((side) => (
              <group key={`sidewalk-h-${side}`}>
                <mesh position={[0, 0.015, offset + side * sidewalkOffset]} receiveShadow>
                  <boxGeometry args={[180, 0.2, 1.5]} />
                  <meshStandardMaterial map={pavementTexture} color="#ded5c7" roughness={0.92} />
                </mesh>
                <mesh position={[0, 0.11, offset + side * (width / 2 + 0.12)]}>
                  <boxGeometry args={[180, 0.28, 0.22]} />
                  <meshStandardMaterial color="#c0b7a5" roughness={0.87} />
                </mesh>
              </group>
            ))}
            {[-1, 1].map((side) => (
              <mesh key={`edge-h-${side}`} position={[0, 0.014, offset + side * (width / 2 - 0.28)]}>
                <boxGeometry args={[180, 0.024, 0.08]} />
                <meshBasicMaterial color="#d7d1c1" />
              </mesh>
            ))}
            {dashPositions.map((position) => (
              <group key={`dash-h-${position}`}>
                {(isMainRoad ? [-0.16, 0.16] : [0]).map((lineOffset) => (
                  <mesh key={lineOffset} position={[position, 0.016, offset + lineOffset]}>
                    <boxGeometry args={[3.2, 0.024, isMainRoad ? 0.09 : 0.12]} />
                    <meshBasicMaterial color={isMainRoad ? '#d4b877' : '#d4d0c4'} />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        )
      })}
      {ROAD_LINES.map((offset) => {
        const width = Math.abs(offset) <= 42 ? 7 : 5
        const isMainRoad = width >= 7
        const airportNorthRoute = Math.abs(offset) >= 42
        const roadLength = airportNorthRoute ? 160 : 180
        const roadCenterZ = airportNorthRoute ? 10 : 0
        const sidewalkOffset = width / 2 + 0.8
        const verticalDashPositions = airportNorthRoute
          ? dashPositions.filter((position) => position >= -78 && position <= 80)
          : dashPositions
        return (
          <group key={`road-v-${offset}`} position={[0, 0, roadCenterZ]}>
            <mesh position={[offset, -0.075, 0]} receiveShadow>
              <boxGeometry args={[width, 0.16, roadLength]} />
              <meshStandardMaterial map={verticalRoadTexture} color="#ded8cd" roughness={0.96} />
            </mesh>
            {[-1, 1].map((side) => (
              <group key={`sidewalk-v-${side}`}>
                <mesh position={[offset + side * sidewalkOffset, 0.016, 0]} receiveShadow>
                  <boxGeometry args={[1.5, 0.2, roadLength]} />
                  <meshStandardMaterial map={pavementTexture} color="#ded5c7" roughness={0.92} />
                </mesh>
                <mesh position={[offset + side * (width / 2 + 0.12), 0.11, 0]}>
                  <boxGeometry args={[0.22, 0.28, roadLength]} />
                  <meshStandardMaterial color="#c0b7a5" roughness={0.87} />
                </mesh>
              </group>
            ))}
            {[-1, 1].map((side) => (
              <mesh key={`edge-v-${side}`} position={[offset + side * (width / 2 - 0.28), 0.014, 0]}>
                <boxGeometry args={[0.08, 0.024, roadLength]} />
                <meshBasicMaterial color="#d7d1c1" />
              </mesh>
            ))}
            {verticalDashPositions.map((position) => (
              <group key={`dash-v-${position}`}>
                {(isMainRoad ? [-0.16, 0.16] : [0]).map((lineOffset) => (
                  <mesh key={lineOffset} position={[offset + lineOffset, 0.016, position]}>
                    <boxGeometry args={[isMainRoad ? 0.09 : 0.12, 0.024, 3.2]} />
                    <meshBasicMaterial color={isMainRoad ? '#d4b877' : '#d4d0c4'} />
                  </mesh>
                ))}
              </group>
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
      {[-1, 1].map((side) => (
        <mesh key={`flyover-edge-${side}`} position={[0, 6.92, side * 4.5]}>
          <boxGeometry args={[180, 0.026, 0.1]} />
          <meshBasicMaterial color="#d7d1c1" />
        </mesh>
      ))}
      {laneMarks.map((x) => (
        <group key={`flyover-mark-${x}`}>
          {[-0.16, 0.16].map((lineOffset) => (
            <mesh key={lineOffset} position={[x, 6.92, lineOffset]}>
              <boxGeometry args={[3.5, 0.026, 0.09]} />
              <meshBasicMaterial color="#e0c16d" />
            </mesh>
          ))}
        </group>
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
      {[-1, 1].map((side) => (
        <mesh key={`bridge-edge-${side}`} position={[0, 4.62, side * 3.05]}>
          <boxGeometry args={[180, 0.026, 0.08]} />
          <meshBasicMaterial color="#d7d1c1" />
        </mesh>
      ))}
      {laneMarks.map((x) => (
        <group key={`bridge-mark-${x}`}>
          {[-0.15, 0.15].map((lineOffset) => (
            <mesh key={lineOffset} position={[x, 4.62, lineOffset]}>
              <boxGeometry args={[3.1, 0.026, 0.08]} />
              <meshBasicMaterial color="#e0c16d" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function PassengerAircraft({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.8, 14, 16]} />
        <meshStandardMaterial color="#d9d8cf" roughness={0.48} metalness={0.1} />
      </mesh>
      <mesh position={[7.2, 1.05, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.72, 1.8, 16]} />
        <meshStandardMaterial color="#d9d8cf" roughness={0.48} metalness={0.1} />
      </mesh>
      <mesh position={[-6.2, 1.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.18, 5.2]} />
        <meshStandardMaterial color="#4e7580" roughness={0.45} metalness={0.18} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[3.4, 0.16, 13.6]} />
        <meshStandardMaterial color="#c8c8be" roughness={0.42} metalness={0.14} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={`aircraft-engine-${side}`}>
          <mesh position={[0.1, 0.63, side * 3.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.46, 0.52, 2.1, 14]} />
            <meshStandardMaterial color="#717a7c" metalness={0.44} roughness={0.38} />
          </mesh>
          <mesh position={[0.1, 0.63, side * 3.8]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.24, 0.24, 0.07, 14]} />
            <meshStandardMaterial color="#30383b" metalness={0.24} roughness={0.46} />
          </mesh>
        </group>
      ))}
      {[-4.8, -3.4, -2, -0.6, 0.8, 2.2, 3.6, 5].flatMap((x) => [-1, 1].map((side) => (
        <mesh key={`aircraft-window-${x}-${side}`} position={[x, 1.25, side * 0.72]}>
          <boxGeometry args={[0.45, 0.22, 0.06]} />
          <meshStandardMaterial color="#47636c" metalness={0.48} roughness={0.26} />
        </mesh>
      )))}
      {[-4.5, 4.5].map((x) => (
        <mesh key={`aircraft-wheel-${x}`} position={[x, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.18, 12]} />
          <meshStandardMaterial color="#252a2c" roughness={0.96} />
        </mesh>
      ))}
      <mesh position={[-5.2, 2.15, 0]} castShadow>
        <boxGeometry args={[0.28, 1.7, 0.9]} />
        <meshStandardMaterial color="#496e79" metalness={0.15} roughness={0.58} />
      </mesh>
    </group>
  )
}

function CivicBuilding({ location, facadeTexture }: { location: (typeof WORLD_LOCATIONS)[number]; facadeTexture: Texture }) {
  const { x, z, kind } = location
  if (kind === 'bridge') return null

  if (kind === 'square') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[21, 0.16, 16]} />
          <meshStandardMaterial color="#a9a18f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.24, 0]} receiveShadow>
          <cylinderGeometry args={[4.45, 4.7, 0.34, 32]} />
          <meshStandardMaterial color="#81796a" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.43, 0]}>
          <cylinderGeometry args={[4.1, 4.25, 0.12, 32]} />
          <meshStandardMaterial color="#3e6870" roughness={0.28} metalness={0.12} />
        </mesh>
        <mesh position={[0, 0.66, 0]}>
          <cylinderGeometry args={[1.8, 2.3, 0.48, 20]} />
          <meshStandardMaterial color="#9b907d" roughness={0.68} />
        </mesh>
        <mesh position={[0, 1.16, 0]}>
          <cylinderGeometry args={[0.86, 1.12, 0.58, 16]} />
          <meshStandardMaterial color="#6b7168" roughness={0.58} metalness={0.18} />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.2, 0.38, 0.75, 10]} />
          <meshStandardMaterial color="#b98b50" metalness={0.48} roughness={0.42} />
        </mesh>
        {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
          <mesh key={`${xSide}-${zSide}`} position={[xSide * 1.55, 1.05, zSide * 1.55]}>
            <cylinderGeometry args={[0.045, 0.07, 0.92, 7]} />
            <meshBasicMaterial color="#a6d5d3" transparent opacity={0.62} />
          </mesh>
        )))}
        {[-1, 1].map((side) => (
          <mesh key={`plaza-seat-${side}`} position={[side * 6, 0.5, 4]}>
            <boxGeometry args={[3.2, 0.4, 0.7]} />
            <meshStandardMaterial color="#6c5747" roughness={0.86} />
          </mesh>
        ))}
        <pointLight position={[0, 2.5, 0]} color="#8fc4c5" intensity={0.45} distance={12} />
      </group>
    )
  }

  if (kind === 'stadium') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 2.2, 0]} castShadow>
          <cylinderGeometry args={[6.1, 6.5, 4.4, 32, 1, true]} />
          <meshStandardMaterial color="#77766f" roughness={0.8} side={2} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[10.6, 0.18, 6.6]} />
          <meshStandardMaterial color="#536950" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.08, 0.035, 6.8]} />
          <meshBasicMaterial color="#ded8c6" />
        </mesh>
        <mesh position={[0, 2.25, 0]}>
          <torusGeometry args={[6.25, 0.16, 8, 32]} />
          <meshStandardMaterial color="#c6bba4" roughness={0.65} />
        </mesh>
        {[-1, 1].map((side) => <mesh key={side} position={[side * 4.6, 0.42, 0]}><boxGeometry args={[0.11, 0.04, 6.6]} /><meshBasicMaterial color="#ded8c6" /></mesh>)}
        <mesh position={[0, 4.6, 0]} castShadow><boxGeometry args={[5.2, 0.46, 4.5]} /><meshStandardMaterial color="#a99c89" roughness={0.8} /></mesh>
        {[-1, 1].map((side) => <StreetLamp key={`stadium-lamp-${side}`} position={[side * 10, 0, -6]} lit={side < 0} />)}
      </group>
    )
  }

  if (kind === 'university') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, -0.035, 0]} receiveShadow>
          <boxGeometry args={[17, 0.12, 15]} />
          <meshStandardMaterial color="#52614a" roughness={0.98} />
        </mesh>
        <mesh position={[0, 0.025, 5.1]} receiveShadow>
          <boxGeometry args={[3.2, 0.06, 4.6]} />
          <meshStandardMaterial color="#b3a995" roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.65, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[13, 7.2, 8]} />
          <meshStandardMaterial map={facadeTexture} color="#b19d7f" roughness={0.84} />
        </mesh>
        <mesh position={[0, 7.42, -0.6]} castShadow>
          <boxGeometry args={[13.45, 0.34, 8.45]} />
          <meshStandardMaterial color="#716354" roughness={0.84} />
        </mesh>
        <mesh position={[0, 1.1, 3.46]}>
          <boxGeometry args={[2.45, 2.2, 0.12]} />
          <meshStandardMaterial color="#333b3b" roughness={0.46} />
        </mesh>
        <mesh position={[0, 2.05, 3.55]}>
          <boxGeometry args={[9.8, 1.2, 0.12]} />
          <meshStandardMaterial color="#456b72" metalness={0.28} roughness={0.32} />
        </mesh>
        {[-4.7, -2.35, 2.35, 4.7].map((windowX) => (
          <mesh key={windowX} position={[windowX, 2.02, 3.64]}>
            <boxGeometry args={[0.08, 1.5, 0.08]} />
            <meshStandardMaterial color="#d0b782" metalness={0.28} roughness={0.48} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`campus-pillar-${side}`} position={[side * 2.2, 1.65, 4.02]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 3.3, 10]} />
            <meshStandardMaterial color="#d0c6b4" roughness={0.72} />
          </mesh>
        ))}
        <mesh position={[-7, 2.5, -5.7]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 5, 3.2]} />
          <meshStandardMaterial map={facadeTexture} color="#8a8c7d" roughness={0.9} />
        </mesh>
        <mesh position={[7, 2.8, -5.7]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 5.6, 3.2]} />
          <meshStandardMaterial map={facadeTexture} color="#9c765c" roughness={0.9} />
        </mesh>
        {[-7, 7].map((wingX) => (
          <mesh key={`campus-wing-window-${wingX}`} position={[wingX, 2.8, -4.04]}>
            <boxGeometry args={[2.25, 1.2, 0.08]} />
            <meshStandardMaterial color="#4e7078" metalness={0.2} roughness={0.35} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={`campus-gate-${side}`} position={[side * 4.2, 0, 7.1]}>
            <mesh position={[0, 1.05, 0]} castShadow><boxGeometry args={[0.42, 2.1, 0.42]} /><meshStandardMaterial color="#8f826e" roughness={0.82} /></mesh>
            <mesh position={[0, 2.15, 0]}><boxGeometry args={[0.56, 0.18, 0.56]} /><meshStandardMaterial color="#d0ad6d" metalness={0.28} roughness={0.46} /></mesh>
          </group>
        ))}
        <mesh position={[0, 2.4, 7.12]}><boxGeometry args={[8.6, 0.3, 0.28]} /><meshStandardMaterial color="#4d5551" roughness={0.7} /></mesh>
        <group position={[0, 2.4, 7.28]}><WorldLabel text="AKOKA CAMPUS" width={6.2} accentColor="#d5b36f" /></group>
        <group position={[0, 8.4, 3.58]}><WorldLabel text="UNIVERSITY OF LAGOS" width={10.2} accentColor="#d5b36f" /></group>
        {[-1, 1].flatMap((side) => [-1, 1].map((forward) => (
          <StreetTree key={`campus-tree-${side}-${forward}`} position={[side * 7.45, 0, forward * 5.9]} scale={0.62} />
        )))}
      </group>
    )
  }

  if (kind === 'airport') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 2.7, 0]} castShadow receiveShadow><boxGeometry args={[14, 5.4, 8]} /><meshStandardMaterial color="#9c988e" roughness={0.7} /></mesh>
        <mesh position={[0, 4.35, 4.08]}><boxGeometry args={[11.5, 1.55, 0.18]} /><meshStandardMaterial color="#5c7580" metalness={0.22} roughness={0.3} /></mesh>
        <mesh position={[0, 1.95, 4.1]}><boxGeometry args={[7.2, 1.65, 0.2]} /><meshStandardMaterial color="#373e40" roughness={0.58} /></mesh>
        <mesh position={[5.3, 5.4, -2]} castShadow><boxGeometry args={[2.5, 10.8, 2.5]} /><meshStandardMaterial color="#777a78" roughness={0.78} /></mesh>
        <mesh position={[5.3, 11.1, -2]}><boxGeometry args={[2.9, 1, 2.9]} /><meshStandardMaterial color="#526775" metalness={0.26} roughness={0.32} /></mesh>
        <mesh position={[0, 0.02, -22]} receiveShadow><boxGeometry args={[28, 0.08, 8]} /><meshStandardMaterial color="#464b50" roughness={0.88} /></mesh>
        <mesh position={[0, 0.07, -22]}><boxGeometry args={[22, 0.025, 0.14]} /><meshBasicMaterial color="#d5d0c3" /></mesh>
        {Array.from({ length: 8 }, (_, index) => (
          <group key={`runway-light-${index}`}>
            {[-3.5, 3.5].map((side) => <mesh key={side} position={[-12 + index * 3.4, 0.14, -22 + side]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color="#f4d29a" emissive="#d5a35f" emissiveIntensity={1.2} /></mesh>)}
          </group>
        ))}
        <PassengerAircraft position={[0, 0, -22]} />
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
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[18, 0.11, 13]} /><meshStandardMaterial color="#756c5b" roughness={1} /></mesh>
        {Array.from({ length: 8 }, (_, index) => <mesh key={`crop-row-${index}`} position={[-8 + index * 2.3, 0.16, 0]}><boxGeometry args={[0.36, 0.18, 10]} /><meshStandardMaterial color={index % 2 ? '#5d684f' : '#777457'} roughness={1} /></mesh>)}
        <mesh position={[0, 1.6, -5.5]} castShadow><boxGeometry args={[6, 3.2, 4]} /><meshStandardMaterial color="#947656" roughness={0.94} /></mesh>
        <mesh position={[0, 3.35, -5.5]} rotation={[0, 0, Math.PI / 4]}><coneGeometry args={[4.2, 2, 4]} /><meshStandardMaterial color="#6f5741" roughness={0.92} /></mesh>
        <mesh position={[0, 0.9, -3.43]}><boxGeometry args={[1.5, 1.8, 0.1]} /><meshStandardMaterial color="#3e3d37" roughness={0.8} /></mesh>
      </group>
    )
  }

  if (kind === 'village') {
    const huts = [[-4, -3], [1, -5], [4, 1], [-2, 4], [4, 4]] as const
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[12, 0.12, 12]} /><meshStandardMaterial color="#887d69" roughness={1} /></mesh>
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


  if (kind === 'event-center') {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow><boxGeometry args={[20, 0.6, 14]} /><meshStandardMaterial color="#626564" roughness={0.92} /></mesh>
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
    bank: { wall: '#858e8b', trim: '#d4b06b', width: 10, depth: 8, height: 7 },
    police: { wall: '#76838b', trim: '#ba6050', width: 12, depth: 9, height: 7 },
    court: { wall: '#b0a795', trim: '#85755e', width: 13, depth: 10, height: 8 },
    hospital: { wall: '#b6b3aa', trim: '#4d7d85', width: 13, depth: 10, height: 10 },
    university: { wall: '#a58d72', trim: '#47626c', width: 14, depth: 10, height: 8 },
    school: { wall: '#b09c80', trim: '#a85d48', width: 13, depth: 9, height: 5.5 },
    government: { wall: '#b3aa98', trim: '#9d754c', width: 13, depth: 10, height: 9 },
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
      {kind === 'bank' && (
        <group position={[style.width / 2 + 0.8, 0, style.depth / 2 + 0.5]}>
          <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[1.25, 2.2, 0.52]} /><meshStandardMaterial color="#4e5b5d" roughness={0.62} /></mesh>
          <mesh position={[0, 1.23, 0.28]}><boxGeometry args={[0.78, 1.05, 0.06]} /><meshStandardMaterial color="#263c43" emissive="#1c3439" emissiveIntensity={0.2} /></mesh>
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

function EntryBeacon({ position, label }: { position: { x: number; z: number }; label: string }) {
  return (
    <group position={[position.x, 0, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[0.55, 0.72, 28]} />
        <meshBasicMaterial color="#dbb46f" transparent opacity={0.78} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 1.7, 8]} />
        <meshStandardMaterial color="#b79660" metalness={0.36} roughness={0.46} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#f4d59a" emissive="#c28d49" emissiveIntensity={0.75} />
      </mesh>
      <group position={[0, 2.8, 0]}><WorldLabel text={label} width={3} accentColor="#d9ad62" /></group>
    </group>
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
  gender = 'male',
}: {
  skinTone: string
  hairColor: string
  clothing: string
  accentColor: string
  keysRef?: MutableRefObject<Set<string>>
  paused?: boolean
  walking?: boolean
  gender?: Gender
}) {
  const leftArm = useRef<Group>(null!)
  const rightArm = useRef<Group>(null!)
  const leftLeg = useRef<Group>(null!)
  const rightLeg = useRef<Group>(null!)

  useFrame((state) => {
    const isMoving = (walking || Boolean(keysRef?.current.size)) && !paused
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
        <capsuleGeometry args={gender === 'female' ? [0.24, 0.48, 5, 10] : [0.27, 0.48, 5, 10]} />
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
      {gender === 'female' && (
        <mesh position={[0, 1.67, -0.19]} rotation={[0.2, 0, 0]}>
          <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
          <meshStandardMaterial color={hairColor} roughness={0.96} />
        </mesh>
      )}
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

function ImportedPlayerModel() {
  const { scene } = useGLTF('/assets/player.glb')
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((object) => {
      object.castShadow = true
      object.receiveShadow = true
    })
    return clone
  }, [scene])

  return <primitive object={model} scale={1.35} position={[0, 0, 0]} />
}

useGLTF.preload('/assets/player.glb')

function AvatarModel({ keysRef, paused, gender }: { keysRef: MutableRefObject<Set<string>>; paused: boolean; gender: Gender }) {
  return <HumanoidModel skinTone="#80543e" hairColor="#201a17" clothing="#52606a" accentColor="#cf9e62" keysRef={keysRef} paused={paused} walking gender={gender} />
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

function TrafficVehicleModel({ kind, color, night = false }: { kind: TrafficVehicleKind; color: string; night?: boolean }) {
  const isDanfo = kind === 'danfo'
  const isKeke = kind === 'keke'
  const isTruck = kind === 'truck'
  const isOkada = kind === 'okada'
  const wheelBase = isTruck ? [-1.75, -0.75, 1.35] : isDanfo ? [-1.28, 1.22] : [-0.9, 0.9]
  const wheelWidth = isKeke ? 1.08 : isOkada ? 0.42 : isTruck ? 2.45 : isDanfo ? 1.95 : 1.72
  const wheelPositions: [number, number][] = isKeke
    ? [[-0.54, -0.55], [0.54, -0.55], [0, 0.84]]
    : wheelBase.flatMap((wheelZ) => [-1, 1].map((side) => [side * wheelWidth / 2, wheelZ] as [number, number]))

  return (
    <group>
      {isTruck ? (
        <>
          <mesh position={[0, 1.18, -1.18]} castShadow><boxGeometry args={[2.3, 1.8, 3.45]} /><meshStandardMaterial color={color} roughness={0.82} /></mesh>
          <mesh position={[0, 1.15, 1.2]} castShadow><boxGeometry args={[1.96, 1.5, 1.72]} /><meshStandardMaterial color={color} roughness={0.62} /></mesh>
          <mesh position={[0, 1.93, -1.18]}><boxGeometry args={[2.34, 0.12, 3.5]} /><meshStandardMaterial color="#626b6b" roughness={0.78} /></mesh>
          <mesh position={[0, 1.42, 2.08]}><boxGeometry args={[1.52, 0.67, 0.08]} /><meshStandardMaterial color="#45616b" metalness={0.2} roughness={0.3} /></mesh>
        </>
      ) : isDanfo ? (
        <>
          <mesh position={[0, 0.82, 0]} castShadow><boxGeometry args={[1.96, 1.16, 3.85]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>
          <mesh position={[0, 1.43, -0.08]}><boxGeometry args={[1.72, 0.52, 2.7]} /><meshStandardMaterial color="#3d5056" metalness={0.16} roughness={0.34} /></mesh>
          <mesh position={[0, 0.43, 0]}><boxGeometry args={[1.98, 0.18, 3.8]} /><meshStandardMaterial color="#873e35" roughness={0.8} /></mesh>
          <mesh position={[0, 1.01, 1.95]}><boxGeometry args={[1.45, 0.52, 0.08]} /><meshStandardMaterial color="#435c63" metalness={0.18} roughness={0.3} /></mesh>
          <mesh position={[0, 1.83, -0.06]}><boxGeometry args={[1.78, 0.1, 2.8]} /><meshStandardMaterial color="#d9c16d" roughness={0.74} /></mesh>
        </>
      ) : isKeke ? (
        <>
          <mesh position={[0, 0.58, 0]} castShadow><boxGeometry args={[1.3, 0.52, 1.9]} /><meshStandardMaterial color={color} roughness={0.76} /></mesh>
          <mesh position={[0, 1.27, -0.05]}><boxGeometry args={[1.34, 0.15, 1.48]} /><meshStandardMaterial color="#d1b167" roughness={0.76} /></mesh>
          {[-1, 1].map((side) => [-0.56, 0.5].map((z) => (
            <mesh key={`${side}-${z}`} position={[side * 0.58, 1.0, z]}><boxGeometry args={[0.06, 0.58, 0.06]} /><meshStandardMaterial color="#39484b" metalness={0.18} roughness={0.58} /></mesh>
          )))}
          <mesh position={[0, 1.02, 0.77]}><boxGeometry args={[1.04, 0.56, 0.08]} /><meshStandardMaterial color="#46636b" metalness={0.2} roughness={0.32} /></mesh>
        </>
      ) : isOkada ? (
        <>
          {[-0.7, 0.72].map((z) => (
            <mesh key={`okada-wheel-${z}`} position={[0, 0.34, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.27, 0.085, 7, 12]} />
              <meshStandardMaterial color="#171b1c" roughness={0.98} />
            </mesh>
          ))}
          <mesh position={[0, 0.72, 0]}><boxGeometry args={[0.18, 0.22, 1.12]} /><meshStandardMaterial color="#bd8247" metalness={0.18} roughness={0.58} /></mesh>
          <mesh position={[0, 1.27, -0.12]}><capsuleGeometry args={[0.18, 0.42, 4, 7]} /><meshStandardMaterial color="#425967" roughness={0.82} /></mesh>
          <mesh position={[0, 1.77, -0.08]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#80543e" roughness={0.86} /></mesh>
          <mesh position={[0, 1.25, 0.68]}><boxGeometry args={[0.66, 0.08, 0.08]} /><meshStandardMaterial color="#30383b" metalness={0.48} roughness={0.42} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.58, 0]} castShadow><boxGeometry args={[1.72, 0.52, 3.25]} /><meshStandardMaterial color={color} metalness={0.12} roughness={0.62} /></mesh>
          <mesh position={[0, 1.02, -0.1]}><boxGeometry args={[1.42, 0.54, 1.72]} /><meshStandardMaterial color="#435860" metalness={0.26} roughness={0.3} /></mesh>
          <mesh position={[0, 1.04, 0.79]}><boxGeometry args={[1.2, 0.4, 0.08]} /><meshStandardMaterial color="#47626a" metalness={0.18} roughness={0.3} /></mesh>
        </>
      )}
      {!isOkada && wheelPositions.map(([wheelX, wheelZ]) => (
        <mesh key={`${wheelX}-${wheelZ}`} position={[wheelX, 0.31, wheelZ]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[isTruck ? 0.34 : 0.27, isTruck ? 0.34 : 0.27, 0.16, 12]} />
          <meshStandardMaterial color="#1c2021" roughness={0.98} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={`lamps-${side}`}>
          <mesh position={[side * 0.58, 0.72, isTruck ? 2.08 : isDanfo ? 1.96 : isKeke ? 1.02 : 1.68]}>
            <boxGeometry args={[0.17, 0.18, 0.1]} />
            <meshBasicMaterial color={night ? '#ffe7b5' : '#d6d0bd'} />
          </mesh>
          <mesh position={[side * 0.58, 0.63, isTruck ? -2.94 : isDanfo ? -1.96 : isKeke ? -0.99 : -1.68]}>
            <boxGeometry args={[0.16, 0.14, 0.08]} />
            <meshBasicMaterial color="#d75c4b" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function getTrafficPosition(vehicle: TrafficVehicleSpec, coordinate: number): [number, number, number] {
  return vehicle.axis === 'x'
    ? [coordinate, vehicle.y, vehicle.road + vehicle.laneOffset]
    : [vehicle.road + vehicle.laneOffset, vehicle.y, coordinate]
}

function getTrafficHeading(vehicle: TrafficVehicleSpec) {
  if (vehicle.axis === 'x') return vehicle.direction === 1 ? Math.PI / 2 : -Math.PI / 2
  return vehicle.direction === 1 ? 0 : Math.PI
}

function getNextSignal(vehicle: TrafficVehicleSpec, coordinate: number) {
  if (vehicle.segment !== 'street') return null
  const ahead = TRAFFIC_INTERSECTIONS
    .map((intersection) => ({
      intersection,
      distance: vehicle.direction * (intersection - coordinate),
    }))
    .filter(({ distance }) => distance > 0)
    .sort((a, b) => a.distance - b.distance)[0]
  if (!ahead) return null
  return vehicle.axis === 'x'
    ? { ...ahead, x: ahead.intersection, z: vehicle.road }
    : { ...ahead, x: vehicle.road, z: ahead.intersection }
}

function TrafficFleet({ night }: { night: boolean }) {
  const vehicleRefs = useRef<(Group | null)[]>([])
  const positionsRef = useRef(CITY_TRAFFIC.map((vehicle) => vehicle.start))

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 0.05)
    const currentPositions = positionsRef.current
    const nextPositions = currentPositions.slice()

    CITY_TRAFFIC.forEach((vehicle, index) => {
      const coordinate = currentPositions[index]
      const routeLength = vehicle.max - vehicle.min
      let desiredSpeed = vehicle.speed
      let leadDistance = Number.POSITIVE_INFINITY

      CITY_TRAFFIC.forEach((other, otherIndex) => {
        if (otherIndex === index || other.routeId !== vehicle.routeId) return
        let distance = vehicle.direction * (currentPositions[otherIndex] - coordinate)
        if (distance <= 0) distance += routeLength
        if (distance > 0.05) leadDistance = Math.min(leadDistance, distance)
      })

      if (leadDistance < 15) {
        const safeGap = vehicle.kind === 'truck' ? 8.2 : vehicle.kind === 'danfo' ? 7.2 : 5.4
        desiredSpeed = Math.min(desiredSpeed, Math.max(0, (leadDistance - safeGap) * 1.35))
      }

      const nextSignal = getNextSignal(vehicle, coordinate)
      if (nextSignal) {
        const aspect = getTrafficSignalAspect(clock.elapsedTime, nextSignal.x, nextSignal.z, vehicle.axis)
        const distanceToStopLine = nextSignal.distance - 4.8
        if (aspect !== 'green' && distanceToStopLine > 0 && distanceToStopLine < 14) {
          desiredSpeed = Math.min(desiredSpeed, Math.sqrt(5.2 * distanceToStopLine))
        }
      }

      const length = vehicle.max - vehicle.min
      nextPositions[index] = vehicle.min + ((((coordinate + vehicle.direction * desiredSpeed * step - vehicle.min) % length) + length) % length)
    })

    positionsRef.current = nextPositions
    CITY_TRAFFIC.forEach((vehicle, index) => {
      const group = vehicleRefs.current[index]
      if (!group) return
      group.position.set(...getTrafficPosition(vehicle, nextPositions[index]))
      group.rotation.y = getTrafficHeading(vehicle)
    })
  })

  return (
    <group>
      {CITY_TRAFFIC.map((vehicle, index) => (
        <group
          key={vehicle.id}
          ref={(node) => { vehicleRefs.current[index] = node }}
          position={getTrafficPosition(vehicle, vehicle.start)}
          rotation={[0, getTrafficHeading(vehicle), 0]}
        >
          <TrafficVehicleModel kind={vehicle.kind} color={vehicle.color} night={night} />
        </group>
      ))}
    </group>
  )
}

function TrafficSignal({ position, intersectionX, intersectionZ, axis }: { position: [number, number, number]; intersectionX: number; intersectionZ: number; axis: TrafficAxis }) {
  const red = useRef<MeshStandardMaterial>(null!)
  const amber = useRef<MeshStandardMaterial>(null!)
  const green = useRef<MeshStandardMaterial>(null!)

  useFrame(({ clock }) => {
    const aspect = getTrafficSignalAspect(clock.elapsedTime, intersectionX, intersectionZ, axis)
    const materials = [red.current, amber.current, green.current]
    const active = [aspect === 'red', aspect === 'amber', aspect === 'green']
    materials.forEach((material, index) => {
      if (!material) return
      material.emissive.set(active[index] ? ['#f34a3f', '#f1b94d', '#58c786'][index] : '#000000')
      material.emissiveIntensity = active[index] ? 1.5 : 0.02
    })
  })

  return (
    <group position={position}>
      <mesh position={[0, 2.05, 0]}><cylinderGeometry args={[0.07, 0.11, 4.1, 7]} /><meshStandardMaterial color="#555b5c" metalness={0.46} roughness={0.52} /></mesh>
      <group position={[0, 4.02, 0]} rotation={[0, axis === 'x' ? Math.PI / 2 : 0, 0]}>
        <mesh><boxGeometry args={[0.54, 1.38, 0.5]} /><meshStandardMaterial color="#252d2f" metalness={0.22} roughness={0.62} /></mesh>
        <mesh position={[0, 0.42, 0.27]}><sphereGeometry args={[0.145, 10, 8]} /><meshStandardMaterial ref={red} color="#8b403a" emissive="#000000" /></mesh>
        <mesh position={[0, 0, 0.27]}><sphereGeometry args={[0.145, 10, 8]} /><meshStandardMaterial ref={amber} color="#997538" emissive="#000000" /></mesh>
        <mesh position={[0, -0.42, 0.27]}><sphereGeometry args={[0.145, 10, 8]} /><meshStandardMaterial ref={green} color="#42684f" emissive="#000000" /></mesh>
      </group>
    </group>
  )
}

function TrafficSignals() {
  return (
    <group>
      {TRAFFIC_INTERSECTIONS.flatMap((x) => TRAFFIC_INTERSECTIONS.map((z) => (
        <group key={`signals-${x}-${z}`}>
          <TrafficSignal position={[x - 4.8, 0, z + 4.8]} intersectionX={x} intersectionZ={z} axis="x" />
          <TrafficSignal position={[x + 4.8, 0, z - 4.8]} intersectionX={x} intersectionZ={z} axis="z" />
        </group>
      )))}
    </group>
  )
}

function collidesWithBuilding(x: number, z: number, radius: number) {
  return CITY_COLLISION_BLOCKS.some((block) =>
    Math.abs(x - block.x) < block.width / 2 + radius &&
    Math.abs(z - block.z) < block.depth / 2 + radius,
  )
}

function PlayerController({
  keysRef,
  onPlayerPosition,
  inVehicle,
  rideVehicle,
  gender,
  paused,
  spawnPosition,
  activeInterior,
  cameraLookRef,
  autoWalkTarget,

}: Pick<CityWorldProps, 'keysRef' | 'onPlayerPosition' | 'inVehicle' | 'rideVehicle' | 'gender' | 'paused' | 'spawnPosition' | 'activeInterior'> & { cameraLookRef: MutableRefObject<CameraLook>; autoWalkTarget: LocationId | null }) {
  const playerRef = useRef<Group>(null!)
  const { camera, size } = useThree()
  const cameraTarget = useRef(new Vector3())
  const cameraLookAt = useRef(new Vector3())
  const movement = useRef(new Vector3())
  const publishTimer = useRef(0)
  const onPositionRef = useRef(onPlayerPosition)
  onPositionRef.current = onPlayerPosition
  const inside = activeInterior !== null

  useEffect(() => {
    playerRef.current?.position.set(spawnPosition.x, 0, spawnPosition.z)
    if (playerRef.current) playerRef.current.rotation.y = Math.PI
    publishTimer.current = 0
    onPositionRef.current(spawnPosition)
  }, [activeInterior?.id, spawnPosition.x, spawnPosition.z])

  useFrame((_, delta) => {
    if (!playerRef.current) return
    const step = Math.min(delta, 0.05)
    const keys = keysRef.current
    const position = playerRef.current.position
    const direction = movement.current.set(0, 0, 0)

    if (!paused && !rideVehicle) {
      if (keys.has('w') || keys.has('arrowup')) direction.z -= 1
      if (keys.has('s') || keys.has('arrowdown')) direction.z += 1
      if (keys.has('a') || keys.has('arrowleft')) direction.x -= 1
      if (keys.has('d') || keys.has('arrowright')) direction.x += 1
      if (direction.lengthSq() === 0 && autoWalkTarget) {
        const location = WORLD_LOCATIONS.find((entry) => entry.id === autoWalkTarget)
        const entrance = location && getLocationEntrancePosition(location.id)
        const destination = entrance ?? location
        if (destination) {
          const dx = destination.x - position.x
          const dz = destination.z - position.z
          // Follow a street-grid route in orthogonal legs instead of cutting diagonally across blocks.
          if (Math.abs(dx) > 2.1) direction.set(dx, 0, 0)
          else if (Math.abs(dz) > 2.1) direction.set(0, 0, dz)
        }
      }

      if (direction.lengthSq() > 0) {
        direction.normalize()
        const running = !inVehicle && (keys.has('shift') || keys.has('shiftleft') || keys.has('shiftright'))
        const speed = inVehicle ? 17 : running ? 11.5 : 6.2
        const radius = inVehicle ? 0.75 : 0.42
        const nextX = position.x + direction.x * speed * step
        const nextZ = position.z + direction.z * speed * step

        if (inside) {
          position.x = MathUtils.clamp(nextX, -6.7, 6.7)
          position.z = MathUtils.clamp(nextZ, -6.7, 6.7)
        } else {
          if (!collidesWithBuilding(nextX, position.z, radius)) position.x = nextX
          if (!collidesWithBuilding(position.x, nextZ, radius)) position.z = nextZ
        }
        playerRef.current.rotation.y = MathUtils.damp(playerRef.current.rotation.y, Math.atan2(direction.x, direction.z), 10, step)
      }
    }

    if (inside) {
      position.x = MathUtils.clamp(position.x, -6.7, 6.7)
      position.z = MathUtils.clamp(position.z, -6.7, 6.7)
      position.y = 0
    } else {
      position.x = MathUtils.clamp(position.x, -82, 82)
      position.z = MathUtils.clamp(position.z, -82, 78)
      const onBridge = position.z >= 72 && position.z <= 78
      position.y = onBridge ? 4.62 : 0
    }

    const { x, z } = position
    const tallViewport = size.height > size.width * 1.15
    const perspectiveCamera = camera as PerspectiveCamera
    const nextFov = tallViewport ? 50 : 46
    if (perspectiveCamera.fov !== nextFov) {
      perspectiveCamera.fov = nextFov
      perspectiveCamera.updateProjectionMatrix()
    }

    const zoom = MathUtils.clamp(cameraLookRef.current.zoom, 0.5, 2.8)
    const cameraHeight = (inside
      ? tallViewport ? 4.8 : 4.2
      : tallViewport ? (inVehicle || rideVehicle ? 9.2 : 10.2) : (inVehicle || rideVehicle ? 7.6 : 8.5)) * zoom
    const cameraDistance = (inside
      ? tallViewport ? 4.4 : 3.8
      : tallViewport ? (inVehicle || rideVehicle ? 12.6 : 13.4) : (inVehicle || rideVehicle ? 7.6 : 8.5)) * zoom
    const look = cameraLookRef.current
    const yaw = look.yaw
    const pitch = look.pitch
    cameraTarget.current.set(
      x + Math.sin(yaw) * cameraDistance,
      position.y + cameraHeight + Math.sin(pitch) * cameraDistance * 0.38,
      z + Math.cos(yaw) * cameraDistance,
    )
    cameraLookAt.current.set(
      x - Math.sin(yaw) * 7,
      position.y + (inside ? 1.6 : inVehicle || rideVehicle ? 1.8 : 2) + Math.sin(pitch) * 5,
      z - Math.cos(yaw) * (inside ? 1.2 : 4.5),
    )
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
      {rideVehicle ? (
        <TrafficVehicleModel
          kind={rideVehicle === 'bike' ? 'okada' : rideVehicle === 'danfo' ? 'danfo' : 'car'}
          color={rideVehicle === 'danfo' ? '#e1bd38' : rideVehicle === 'bike' ? '#31464d' : '#ddd7c9'}
          night
        />
        ) : inVehicle ? <ScooterModel /> : <ImportedPlayerModel />}
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

function PassbyPedestrian({ index }: { index: number }) {
  const ref = useRef<Group>(null!)
  const axis: TrafficAxis = index % 2 === 0 ? 'x' : 'z'
  const direction: 1 | -1 = Math.floor(index / 2) % 2 === 0 ? 1 : -1
  const sidewalkRoad = ROAD_LINES[Math.floor(index / 4) % ROAD_LINES.length]
  const sidewalkWidth = Math.abs(sidewalkRoad) <= 42 ? 7 : 5
  const sidewalkOffset = direction * (sidewalkWidth / 2 + 1.35)
  const track = sidewalkRoad + sidewalkOffset
  const min = axis === 'x' ? -80 : -70
  const max = axis === 'x' ? 80 : 76
  const start = direction === 1 ? min + ((index * 17) % 132) : max - ((index * 17) % 132)
  const speed = 1.15 + (index % 4) * 0.28

  useFrame((_, delta) => {
    if (!ref.current) return
    const step = direction * speed * Math.min(delta, 0.05)
    if (axis === 'x') {
      ref.current.position.x += step
      if (ref.current.position.x > max) ref.current.position.x = min
      if (ref.current.position.x < min) ref.current.position.x = max
      ref.current.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2
    } else {
      ref.current.position.z += step
      if (ref.current.position.z > max) ref.current.position.z = min
      if (ref.current.position.z < min) ref.current.position.z = max
      ref.current.rotation.y = direction > 0 ? 0 : Math.PI
    }
  })

  const female = index % 2 === 1
  const shirts = ['#8c4d3f', '#d1a05b', '#456b72', '#65764d', '#6c587e', '#c5c0b4']
  const position: [number, number, number] = axis === 'x' ? [start, 0, track] : [track, 0, start]
  return <group ref={ref} position={position} scale={0.88}>
    <HumanoidModel skinTone={index % 3 === 0 ? '#69432f' : '#87583f'} hairColor={female ? '#211817' : '#30221b'} clothing={shirts[index % shirts.length]} accentColor="#d2b17a" gender={female ? 'female' : 'male'} walking />
  </group>
}

function CitySignBoards({ night }: { night: boolean }) {
  const signs = [
    { x: -28, z: -20, text: 'EKO CIVIC SQUARE', color: '#132b3b' },
    { x: 34, z: 20, text: 'VICTORIA ISLAND', color: '#174c48' },
    { x: -58, z: 44, text: 'LAGOS BUSINESS DISTRICT', color: '#6a3b25' },
  ]
  return <>
    {signs.map((sign, index) => <group key={sign.text} position={[sign.x, 0, sign.z]} rotation={[0, index === 1 ? -Math.PI / 2 : 0, 0]}>
      <mesh position={[0, 3.4, 0]}><boxGeometry args={[0.22, 6.8, 0.22]} /><meshStandardMaterial color="#555b5c" metalness={0.5} /></mesh>
      <mesh position={[0, 6.1, 0]}><boxGeometry args={[8.5, 1.8, 0.25]} /><meshStandardMaterial color={sign.color} emissive={sign.color} emissiveIntensity={night ? 0.35 : 0.05} /></mesh>
      <group position={[0, 6.1, 0.2]}><WorldLabel text={sign.text} width={7.8} accentColor="#d8b56c" /></group>
      <pointLight position={[0, 6.2, 1]} color="#ffda91" intensity={night ? 0.75 : 0.08} distance={12} />
    </group>)}
    <group position={[52, 0, -18]} rotation={[0, -0.22, 0]}>
      <mesh position={[0, 7, 0]}><boxGeometry args={[0.45, 14, 0.45]} /><meshStandardMaterial color="#4a5054" metalness={0.7} /></mesh>
      <mesh position={[0, 12, 0.3]}><boxGeometry args={[12, 7, 0.7]} /><meshStandardMaterial color="#101d28" emissive="#1b6b78" emissiveIntensity={night ? 1.1 : 0.4} metalness={0.3} /></mesh>
      <mesh position={[0, 12, 0.68]}><planeGeometry args={[11.4, 6.4]} /><meshBasicMaterial color={night ? '#17454d' : '#25657a'} /></mesh>
      <group position={[0, 12, 0.72]}><WorldLabel text="EKÓ CITY · MOVE WITH THE CITY" width={10.5} accentColor={night ? '#5ce1df' : '#d9b56e'} /></group>
      {night && <pointLight position={[0, 12, 2]} color="#57dce8" intensity={2.2} distance={24} />}
    </group>
  </>
}

function CityScene({ waypoint, remotePlayers, gameMinutes }: Pick<CityWorldProps, 'waypoint' | 'remotePlayers' | 'gameMinutes'>) {
  const hour = (gameMinutes / 60) % 24
  const night = hour < 5.5 || hour >= 19
  const dawn = hour >= 5.5 && hour < 7.5
  const dusk = hour >= 17.5 && hour < 19
  const concreteSource = useTexture('/textures/lagos-concrete.png')
  const asphaltSource = useTexture('/textures/eko-asphalt.png')
  const facadeTexture = useMemo(() => cloneTiledTexture(concreteSource, 3, 3), [concreteSource])
  const pavementTexture = useMemo(() => cloneTiledTexture(concreteSource, 18, 18), [concreteSource])
  const horizontalRoadTexture = useMemo(() => cloneTiledTexture(asphaltSource, 18, 1), [asphaltSource])
  const verticalRoadTexture = useMemo(() => cloneTiledTexture(asphaltSource, 1, 18), [asphaltSource])
  const treePositions: [number, number, number][] = [
    [-13.7, 0, -14], [13.7, 0, -14], [-13.7, 0, 14], [13.7, 0, 14],
    [-13.7, 0, -30], [13.7, 0, -30], [-13.7, 0, 30], [13.7, 0, 30],
  ]
  const lampPositions: [number, number, number][] = [
    [-22.3, 0, -30], [22.3, 0, -30], [-46.3, 0, -6], [46.3, 0, -6],
    [-46.3, 0, 30], [46.3, 0, 30], [-70.3, 0, -30], [70.3, 0, -30],
    [-70.3, 0, 54], [70.3, 0, 54], [-22.3, 0, 54], [22.3, 0, 54],
  ]

  return (
    <>
      <color attach="background" args={[night ? '#172640' : dawn || dusk ? '#c58e79' : '#8ec9f0']} />
      <fog attach="fog" args={[night ? '#263650' : dawn || dusk ? '#d7a18a' : '#a8d2df', 90, 245]} />
      <ambientLight intensity={night ? 0.82 : dawn || dusk ? 0.8 : 1.05} color={night ? '#b6c3dd' : dawn || dusk ? '#ffd0a3' : '#fff5df'} />
      <hemisphereLight args={[night ? '#647aa0' : '#c4e8ff', night ? '#4b514d' : '#514b3d', night ? 0.78 : 1.0]} />
      <directionalLight position={[28, 40, 12]} intensity={night ? 0.5 : dawn || dusk ? 0.88 : 1.8} color={night ? '#b1c6f2' : dawn || dusk ? '#ffd0a3' : '#fff4d6'} />
      {!night && <group position={[45, 42, -75]}><mesh><sphereGeometry args={[5, 20, 16]} /><meshBasicMaterial color={dawn || dusk ? '#ffb56e' : '#fff0a3'} /></mesh><pointLight intensity={0.8} color="#ffe2a0" distance={100} /></group>}
      {night && <Stars radius={180} depth={100} count={1600} factor={3.4} saturation={0.15} fade speed={0.22} />}
      {night && <mesh position={[0, 78, -110]}><sphereGeometry args={[2.6, 16, 12]} /><meshBasicMaterial color="#fff3cc" /></mesh>}
      <RoadGrid pavementTexture={pavementTexture} horizontalRoadTexture={horizontalRoadTexture} verticalRoadTexture={verticalRoadTexture} />
      <Flyover />
      <LagoonBridge />
      {CITY_BUILDINGS.map((building) => <BuildingLot key={`lot-${building.id}`} building={building} />)}
      {CITY_BUILDINGS.map((building) => <Building key={building.id} {...building} facadeTexture={facadeTexture} />)}
      {WORLD_LOCATIONS.map((location) => <CivicBuilding key={location.id} location={location} facadeTexture={facadeTexture} />)}
      {CITY_BUILDINGS.map((building) => (
        <EntryBeacon key={`entry-${building.id}`} position={getBuildingEntrancePosition(building)} label="ENTER" />
      ))}
      {WORLD_LOCATIONS.map((location) => {
        const position = getLocationEntrancePosition(location.id)
        return position ? <EntryBeacon key={`entry-${location.id}`} position={position} label="ENTER" /> : null
      })}
      {treePositions.map((position, index) => <StreetTree key={`tree-${index}`} position={position} scale={index % 3 === 0 ? 0.92 : 0.84} />)}
      {lampPositions.map((position, index) => <StreetLamp key={`lamp-${index}`} position={position} lit={night} />)}
      {Array.from({ length: 30 }, (_, index) => {
        const road = ROAD_LINES[index % ROAD_LINES.length]
        const side = index % 2 === 0 ? -1 : 1
        const roadWidth = Math.abs(road) <= 42 ? 7 : 5
        const x = -78 + Math.floor(index / ROAD_LINES.length) * 29
        const z = road + side * (roadWidth / 2 + 2.9)
        return <StreetTree key={`avenue-tree-${index}`} position={[x, 0, z]} scale={0.7 + (index % 4) * 0.08} />
      })}
      {Array.from({ length: 20 }, (_, index) => {
        const road = ROAD_LINES[index % ROAD_LINES.length]
        const side = index % 2 === 0 ? -1 : 1
        const roadWidth = Math.abs(road) <= 42 ? 7 : 5
        const x = -80 + Math.floor(index / ROAD_LINES.length) * 39
        const z = road + side * (roadWidth / 2 + 1.0)
        return <StreetLamp key={`avenue-lamp-${index}`} position={[x, 0, z]} lit={night} />
      })}
      <CitySignBoards night={night} />
      <TrafficSignals />
      <TrafficFleet night={night} />
      {CITY_CHARACTERS.map((character) => <CharacterActor key={character.id} character={character} />)}
      {Array.from({ length: 24 }, (_, index) => <PassbyPedestrian key={`passby-${index}`} index={index} />)}
      {remotePlayers.map((player) => <RemotePlayerAvatar key={player.userId} player={player} />)}
      <LandmarkMarkers waypoint={waypoint} />
    </>
  )
}

export function CityWorld(props: CityWorldProps) {
  const cameraLookRef = useRef<CameraLook>({ yaw: 0, pitch: 0, zoom: 1 })
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistanceRef = useRef(0)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Reserve the left side for the movement joystick; right-side touch can look or pinch-zoom.
    if (event.pointerType === 'mouse' && event.button !== 0) return
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (activePointersRef.current.size === 1) {
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    } else if (activePointersRef.current.size === 2) {
      const points = [...activePointersRef.current.values()]
      pinchDistanceRef.current = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
      dragRef.current = null
    }
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* pointer may already be captured by browser */ }
  }
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = activePointersRef.current.get(event.pointerId)
    if (!previous) return
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (activePointersRef.current.size >= 2) {
      const points = [...activePointersRef.current.values()].slice(0, 2)
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
      if (pinchDistanceRef.current > 0 && distance > 0) {
        cameraLookRef.current.zoom = MathUtils.clamp(cameraLookRef.current.zoom * (distance / pinchDistanceRef.current), 0.5, 2.8)
      }
      pinchDistanceRef.current = distance
      dragRef.current = null
      return
    }
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    drag.x = event.clientX
    drag.y = event.clientY
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    cameraLookRef.current.yaw = MathUtils.euclideanModulo(cameraLookRef.current.yaw - dx * 0.003 + Math.PI, Math.PI * 2) - Math.PI
    cameraLookRef.current.pitch = MathUtils.clamp(cameraLookRef.current.pitch - dy * 0.002, -0.48, 0.48)
  }
  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId)
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
    pinchDistanceRef.current = 0
    if (activePointersRef.current.size === 1) {
      const [pointerId, point] = [...activePointersRef.current.entries()][0]
      dragRef.current = { pointerId, x: point.x, y: point.y }
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    cameraLookRef.current.zoom = MathUtils.clamp(
      cameraLookRef.current.zoom * (event.deltaY > 0 ? 1.12 : 0.89), 0.5, 2.8,
    )
  }

  return (
    <div
      className="world-canvas"
      aria-label="Game world. Drag the right side to look around."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      <Canvas
        // Cap pixel ratio to reduce fill-rate and GPU memory on mid-range phones.
        dpr={[1, 1.1]}
        shadows={false}
        camera={{ position: [-2, 16, 24], fov: 55, near: 0.1, far: 220 }}
        gl={{ antialias: false, powerPreference: 'low-power' }}
      >
        {props.activeInterior ? (
          <>
            <InteriorScene interior={props.activeInterior} />
            {props.remotePlayers.map((player) => <RemotePlayerAvatar key={player.userId} player={player} />)}
          </>
        ) : (
          <CityScene waypoint={props.waypoint} remotePlayers={props.remotePlayers} gameMinutes={props.gameMinutes} />
        )}
        <PlayerController
          key={props.activeInterior?.id ?? 'city'}
          keysRef={props.keysRef}
          onPlayerPosition={props.onPlayerPosition}
          inVehicle={props.inVehicle}
          rideVehicle={props.rideVehicle ?? null}
          gender={props.gender}
          paused={props.paused}
          spawnPosition={props.spawnPosition}
          activeInterior={props.activeInterior}
          cameraLookRef={cameraLookRef}
          autoWalkTarget={props.autoWalkTarget}
        />
      </Canvas>
    </div>
  )
}
