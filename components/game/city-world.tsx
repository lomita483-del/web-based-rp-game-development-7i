'use client'

import { useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, type MutableRefObject, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
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
import { RideVehicle, type RideEvent, type RidePose, type RideState } from './ride-vehicle'
import { Atmosphere } from './atmosphere'
import { BuildingWindows } from './building-windows'
import { Campus } from './campus'
import { Billboards, RoadMarkings, StreetLamps, StreetTrees, TrafficSignals } from './street-layer'
import { TrafficLayer } from './traffic-layer'
import { lightsOn } from './atmosphere'
import { HumanoidModel } from './humanoid'
import { InteriorScene } from './interior-scene'

type PlayerPosition = { x: number; z: number }
type CameraLook = { yaw: number; pitch: number; zoom: number }

export type GraphicsQuality = 'low' | 'medium' | 'high'
export type AdminPowers = { speed: number; noclip: boolean; fly: boolean }

type CityWorldProps = {
  quality: GraphicsQuality
  ride: RideState | null
  onRideEvent: (event: RideEvent) => void
  isAdmin: boolean
  /** Admin movement powers, read every frame. */
  adminPowersRef: MutableRefObject<AdminPowers>
  /** Look sensitivity multiplier from settings. */
  lookSensitivity: number
  keysRef: MutableRefObject<Set<string>>
  /** Analog joystick vector: x right, y down, each -1..1. */
  joystickRef: MutableRefObject<{ x: number; y: number }>
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

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow>
        <planeGeometry args={[180, 180]} />
        <meshStandardMaterial map={pavementTexture} color="#c1b8a9" roughness={1} />
      </mesh>
      {ROAD_LINES.map((offset) => {
        const isMainRoad = Math.abs(offset) <= 42
        const width = isMainRoad ? 7 : 5
        const dashPositions = Array.from({ length: 18 }, (_, index) => -84 + index * 9.5)
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
        const isMainRoad = Math.abs(offset) <= 42
        const width = isMainRoad ? 7 : 5
        const verticalDashPositions = Array.from({ length: 18 }, (_, index) => -84 + index * 9.5)
        const airportNorthRoute = Math.abs(offset) >= 42
        const roadLength = airportNorthRoute ? 160 : 180
        const roadCenterZ = airportNorthRoute ? 10 : 0
        const sidewalkOffset = width / 2 + 0.8
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
        {/* Eiffel-inspired landmark tower: tapered iron legs, open lattice silhouette, central mast. */}
        <mesh position={[0, 0.3, 0]} receiveShadow><cylinderGeometry args={[6.8, 7.4, 0.6, 32]} /><meshStandardMaterial color="#6b7073" roughness={0.75} /></mesh>
        {Array.from({ length: 4 }, (_, leg) => {
          const angle = (leg / 4) * Math.PI * 2 + Math.PI / 4
          return <group key={`iron-leg-${leg}`} rotation={[0, angle, 0]}>
            <mesh position={[0, 6.4, 4.2]} rotation={[0.52, 0, 0]}><boxGeometry args={[0.42, 13.2, 0.42]} /><meshStandardMaterial color="#6e806f" metalness={0.62} roughness={0.4} /></mesh>
            <mesh position={[0, 12, 2.5]} rotation={[0.34, 0, 0]}><boxGeometry args={[0.22, 8.4, 0.22]} /><meshStandardMaterial color="#6e806f" metalness={0.62} roughness={0.4} /></mesh>
          </group>
        })}
        {[4.8, 9.2, 14.2, 19.5].map((height, i) => <mesh key={`tower-platform-${i}`} position={[0, height, 0]}><cylinderGeometry args={[Math.max(1.2, 5.6 - i * 1.05), Math.max(1.2, 5.6 - i * 1.05), 0.24, 24]} /><meshStandardMaterial color="#596d60" metalness={0.55} roughness={0.45} /></mesh>)}
        {[4.8, 9.2, 14.2, 19.5].map((height, i) => <mesh key={`tower-ring-${i}`} position={[0, height, 0]}><torusGeometry args={[Math.max(1.2, 5.6 - i * 1.05), 0.12, 6, 24]} /><meshStandardMaterial color="#d9b16b" emissive="#ffb64d" emissiveIntensity={0.8} metalness={0.7} roughness={0.35} /></mesh>)}
        <mesh position={[0, 23.4, 0]}><cylinderGeometry args={[0.08, 0.55, 7.8, 8]} /><meshStandardMaterial color="#6e806f" metalness={0.65} roughness={0.4} /></mesh>
        <mesh position={[0, 3.4, 3.62]}><boxGeometry args={[3.8, 1.25, 0.12]} /><meshStandardMaterial color="#17252c" /></mesh>
        <mesh position={[0, 3.4, 3.71]}><boxGeometry args={[3.2, 0.12, 0.04]} /><meshBasicMaterial color="#e4c58b" /></mesh>
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

function AvatarModel({ keysRef, paused, gender, isAdmin }: { keysRef: MutableRefObject<Set<string>>; paused: boolean; gender: Gender; isAdmin: boolean }) {
  return <HumanoidModel skinTone="#80543e" hairColor="#201a17" clothing={isAdmin ? '#15171b' : '#52606a'} accentColor={isAdmin ? '#d9b24f' : '#cf9e62'} keysRef={keysRef} paused={paused} walking gender={gender} admin={isAdmin} />
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
  const nextPositionsRef = useRef(CITY_TRAFFIC.map((vehicle) => vehicle.start))
  const routeGroups = useMemo(() => {
    const groups = new Map<string, number[]>()
    CITY_TRAFFIC.forEach((vehicle, index) => {
      const indices = groups.get(vehicle.routeId)
      if (indices) indices.push(index)
      else groups.set(vehicle.routeId, [index])
    })
    return groups
  }, [])

  useFrame(({ clock }, delta) => {
    const step = Math.min(delta, 0.05)
    const currentPositions = positionsRef.current
    const nextPositions = nextPositionsRef.current

    CITY_TRAFFIC.forEach((vehicle, index) => {
      const coordinate = currentPositions[index]
      const routeLength = vehicle.max - vehicle.min
      let desiredSpeed = vehicle.speed
      let leadDistance = Number.POSITIVE_INFINITY

      const sameRoute = routeGroups.get(vehicle.routeId) ?? []
      for (const otherIndex of sameRoute) {
        if (otherIndex === index) continue
        let distance = vehicle.direction * (currentPositions[otherIndex] - coordinate)
        if (distance <= 0) distance += routeLength
        if (distance > 0.05) leadDistance = Math.min(leadDistance, distance)
      }

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

    // Swap reusable position buffers instead of allocating a new array every frame.
    positionsRef.current = nextPositions
    nextPositionsRef.current = currentPositions
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

function collidesWithBuilding(x: number, z: number, radius: number) {
  return CITY_COLLISION_BLOCKS.some((block) =>
    Math.abs(x - block.x) < block.width / 2 + radius &&
    Math.abs(z - block.z) < block.depth / 2 + radius,
  )
}

function PlayerController({
  keysRef, joystickRef, riding, playerPosRef, ridePoseRef, isAdmin, adminPowersRef,
  lookSensitivity, onPlayerPosition, inVehicle, rideVehicle, gender, paused,
  spawnPosition, activeInterior, cameraLookRef, autoWalkTarget,
}: {
  riding: boolean
  playerPosRef: MutableRefObject<Point>
  ridePoseRef: MutableRefObject<RidePose | null>
} & Pick<CityWorldProps, 'keysRef' | 'joystickRef' | 'isAdmin' | 'adminPowersRef' | 'lookSensitivity' | 'onPlayerPosition' | 'inVehicle' | 'rideVehicle' | 'gender' | 'paused' | 'spawnPosition' | 'activeInterior'> & {
  cameraLookRef: MutableRefObject<CameraLook>
  autoWalkTarget: LocationId | null
}) {
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

    if (riding) {
      const pose = ridePoseRef.current
      if (pose) {
        position.x = pose.x
        position.z = pose.z
        playerRef.current.rotation.y = pose.heading
      }
    } else if (!paused && !rideVehicle) {
      const keys = keysRef.current
      const forwardInput = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'))
      const rightInput = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))
      const stick = joystickRef.current
      const stickMagnitude = Math.min(1, Math.hypot(stick.x, stick.y))
      const useStick = stickMagnitude > 0.12
      const inputForward = useStick ? -stick.y : forwardInput
      const inputRight = useStick ? stick.x : rightInput
      const yaw = cameraLookRef.current.yaw
      const forwardX = -Math.sin(yaw)
      const forwardZ = -Math.cos(yaw)
      const rightX = Math.cos(yaw)
      const rightZ = -Math.sin(yaw)

      direction.set(
        forwardX * inputForward + rightX * inputRight,
        0,
        forwardZ * inputForward + rightZ * inputRight,
      )

      if (direction.lengthSq() < 0.0001 && autoWalkTarget && !inside) {
        const target = getLocationEntrancePosition(autoWalkTarget)
          ?? WORLD_LOCATIONS.find((location) => location.id === autoWalkTarget)
        if (target) direction.set(target.x - position.x, 0, target.z - position.z)
      }

      if (direction.lengthSq() > 0.0001) {
        direction.normalize()
        const running = !inVehicle && (keys.has('shift') || keys.has('shiftleft') || keys.has('shiftright'))
        const powers = isAdmin ? adminPowersRef.current : null
        const analog = useStick ? Math.max(0.35, stickMagnitude) : 1
        const speed = (inVehicle ? 17 : running ? 11.5 : 6.2) * analog * (powers?.speed ?? 1)
        const radius = inVehicle ? 0.75 : 0.42
        const previousX = position.x
        const previousZ = position.z
        const nextX = previousX + direction.x * speed * step
        const nextZ = previousZ + direction.z * speed * step
        const ghost = Boolean(powers?.noclip || powers?.fly)

        if (inside) {
          position.x = MathUtils.clamp(nextX, -6.7, 6.7)
          position.z = MathUtils.clamp(nextZ, -6.7, 6.7)
        } else {
          if (ghost || !collidesWithBuilding(nextX, previousZ, radius)) position.x = nextX
          if (ghost || !collidesWithBuilding(position.x, nextZ, radius)) position.z = nextZ
        }

        const movedX = position.x - previousX
        const movedZ = position.z - previousZ
        if (Math.abs(movedX) + Math.abs(movedZ) > 0.0001) {
          playerRef.current.rotation.y = MathUtils.damp(
            playerRef.current.rotation.y,
            Math.atan2(movedX, movedZ),
            10,
            step,
          )
        }
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
      const flying = isAdmin && adminPowersRef.current.fly
      const groundY = onBridge ? 4.62 : 0
      position.y = MathUtils.damp(position.y, flying ? groundY + 7 : groundY, 5, step)
      if (!flying && Math.abs(position.y - groundY) < 0.02) position.y = groundY
    }

    const { x, z } = position
    playerPosRef.current.x = x
    playerPosRef.current.z = z
    playerRef.current.visible = !riding
    const tallViewport = size.height > size.width * 1.15
    const perspectiveCamera = camera as PerspectiveCamera
    const nextFov = tallViewport ? 50 : 46
    if (perspectiveCamera.fov !== nextFov) {
      perspectiveCamera.fov = nextFov
      perspectiveCamera.updateProjectionMatrix()
    }

    const zoom = MathUtils.clamp(cameraLookRef.current.zoom, 0.5, 2.8)
    const cameraHeight = (inside
      ? (size.height > size.width * 1.15 ? 4.8 : 4.2)
      : (size.height > size.width * 1.15 ? (inVehicle || riding ? 16 : 17) : (inVehicle || riding ? 8.5 : 9.5))) * zoom
    const cameraDistance = (inside
      ? (size.height > size.width * 1.15 ? 4.4 : 3.8)
      : (size.height > size.width * 1.15 ? 19 : 14.5)) * zoom
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
      ) : inVehicle ? <ScooterModel /> : <AvatarModel keysRef={keysRef} paused={paused} gender={gender} isAdmin={isAdmin} />}
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
      <HumanoidModel skinTone="#87583f" hairColor="#211a17" clothing={player.isAdmin ? '#15171b' : color} accentColor={player.isAdmin ? '#d9b24f' : '#d0a76b'} admin={Boolean(player.isAdmin)} />
      <group position={[0, 2.4, 0]}>
        <WorldLabel text={player.isAdmin ? `ADMIN · ${player.displayName}` : player.displayName} width={3.6} accentColor={player.isAdmin ? '#f0c860' : '#c9a66b'} />
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


export const QUALITY_SETTINGS: Record<GraphicsQuality, { dpr: [number, number]; antialias: boolean; traffic: number; pedestrians: number; fogFar: number }> = {
  low: { dpr: [0.7, 1], antialias: false, traffic: 0.5, pedestrians: 4, fogFar: 170 },
  medium: { dpr: [1, 1.25], antialias: false, traffic: 0.8, pedestrians: 8, fogFar: 230 },
  high: { dpr: [1, 1.75], antialias: true, traffic: 1, pedestrians: 14, fogFar: 300 },
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

function CityScene({ waypoint, remotePlayers, gameMinutes, quality }: Pick<CityWorldProps, 'waypoint' | 'remotePlayers' | 'gameMinutes' | 'quality'>) {
  const hour = (((gameMinutes / 60) % 24) + 24) % 24
  // Only flips twice a day; everything that depends on it is cheap (material colours, a few instances).
  const night = lightsOn(hour)
  const settings = QUALITY_SETTINGS[quality]
  const concreteSource = useTexture('/textures/lagos-concrete.png')
  const asphaltSource = useTexture('/textures/eko-asphalt.png')
  const facadeTexture = useMemo(() => cloneTiledTexture(concreteSource, 3, 3), [concreteSource])
  const pavementTexture = useMemo(() => cloneTiledTexture(concreteSource, 18, 18), [concreteSource])
  const horizontalRoadTexture = useMemo(() => cloneTiledTexture(asphaltSource, 18, 1), [asphaltSource])
  const verticalRoadTexture = useMemo(() => cloneTiledTexture(asphaltSource, 1, 18), [asphaltSource])

  return (
    <>
      <Atmosphere gameMinutes={gameMinutes} />
      <StaticWorld night={night} facadeTexture={facadeTexture} pavementTexture={pavementTexture} horizontalRoadTexture={horizontalRoadTexture} verticalRoadTexture={verticalRoadTexture} />
      <TrafficLayer night={night} density={settings.traffic} />
      {CITY_CHARACTERS.map((character) => <CharacterActor key={character.id} character={character} />)}
      {Array.from({ length: settings.pedestrians }, (_, index) => <PassbyPedestrian key={`passby-${index}`} index={index} />)}
      {remotePlayers.map((player) => <RemotePlayerAvatar key={player.userId} player={player} />)}
      <LandmarkMarkers waypoint={waypoint} />
    </>
  )
}

/** Everything that never moves. Memoised so clock ticks and player movement do not re-render it. */
const StaticWorld = memo(function StaticWorld({
  night,
  facadeTexture,
  pavementTexture,
  horizontalRoadTexture,
  verticalRoadTexture,
}: {
  night: boolean
  facadeTexture: Texture
  pavementTexture: Texture
  horizontalRoadTexture: Texture
  verticalRoadTexture: Texture
}) {
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
      <RoadMarkings night={night} />
      <Flyover />
      <LagoonBridge />
      {CITY_BUILDINGS.map((building) => <BuildingLot key={`lot-${building.id}`} building={building} />)}
      {CITY_BUILDINGS.map((building) => <Building key={building.id} {...building} facadeTexture={facadeTexture} />)}
      <BuildingWindows buildings={CITY_BUILDINGS} night={night} />
      {WORLD_LOCATIONS.map((location) => <CivicBuilding key={location.id} location={location} facadeTexture={facadeTexture} />)}
      {CITY_BUILDINGS.map((building) => (
        <EntryBeacon key={`entry-${building.id}`} position={getBuildingEntrancePosition(building)} label="ENTER" />
      ))}
      {WORLD_LOCATIONS.map((location) => {
        const position = getLocationEntrancePosition(location.id)
        return position ? <EntryBeacon key={`entry-${location.id}`} position={position} label="ENTER" /> : null
      })}
      <StreetTrees />
      <StreetLamps night={night} />
      <Billboards night={night} />
      <TrafficSignals />
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
})

export function CityWorld(props: CityWorldProps) {
  const cameraLookRef = useRef<CameraLook>({ yaw: 0, pitch: 0, zoom: 1 })
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null)
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistanceRef = useRef(0)
  const playerPosRef = useRef<Point>({ x: 0, z: 0 })
  const ridePoseRef = useRef<RidePose | null>(null)
  useEffect(() => { if (!props.ride || props.ride.phase !== 'riding') ridePoseRef.current = null }, [props.ride])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Reserve the left 42% for the HUD joystick. Never capture its touch as a camera drag.
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left + bounds.width * 0.42) return
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
    cameraLookRef.current.yaw = MathUtils.euclideanModulo(
      cameraLookRef.current.yaw - dx * 0.003 * props.lookSensitivity + Math.PI,
      Math.PI * 2,
    ) - Math.PI
    cameraLookRef.current.pitch = MathUtils.clamp(
      cameraLookRef.current.pitch - dy * 0.002 * props.lookSensitivity,
      -0.48,
      0.48,
    )
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
        dpr={QUALITY_SETTINGS[props.quality].dpr}
        shadows={false}
        camera={{ position: [-2, 16, 24], fov: 55, near: 0.1, far: 320 }}
        gl={{ antialias: QUALITY_SETTINGS[props.quality].antialias, powerPreference: 'high-performance' }}
      >
        {props.activeInterior ? (
          <>
            <InteriorScene interior={props.activeInterior} />
            {props.remotePlayers.map((player) => <RemotePlayerAvatar key={player.userId} player={player} />)}
          </>
        ) : (
          <CityScene waypoint={props.waypoint} remotePlayers={props.remotePlayers} gameMinutes={props.gameMinutes} quality={props.quality} />
        )}
        {props.ride && !props.activeInterior && <RideVehicle key={props.ride.id} ride={props.ride} playerRef={playerPosRef} poseRef={ridePoseRef} onEvent={props.onRideEvent} />}
        <PlayerController
          riding={props.ride?.phase === 'riding'}
          playerPosRef={playerPosRef}
          ridePoseRef={ridePoseRef}
          key={props.activeInterior?.id ?? 'city'}
          keysRef={props.keysRef}
          joystickRef={props.joystickRef}
          isAdmin={props.isAdmin}
          adminPowersRef={props.adminPowersRef}
          lookSensitivity={props.lookSensitivity}
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
